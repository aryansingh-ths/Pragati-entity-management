require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.ethereal.email',
  port: process.env.SMTP_PORT || 587,
  auth: {
    user: process.env.SMTP_USER || 'test@ethereal.email',
    pass: process.env.SMTP_PASS || 'testpass'
  }
});

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'pragati_jwt_secret_2024';
const WEBHOOK_SECRET = process.env.PRAGATI_WEBHOOK_SECRET || 'pragati_webhook_secret';



// Fires a webhook to every portal the tenant is subscribed to.
// Non-blocking — failures are logged but don't affect the response.
async function firePortalWebhooks(tenant, event) {
  const products = tenant.subscribed_products || [];
  const payload = JSON.stringify({ event, slug: tenant.slug, status: tenant.status });

  // Fetch products from database to get their webhook URLs
  const productDocs = await GlobalProduct.find({ slug: { $in: products } });
  
  await Promise.allSettled(
    productDocs.map(async (productDoc) => {
      const url = productDoc.webhook_url;
      const product = productDoc.slug;
      if (!url) return; // portal has no webhook configured
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-pragati-secret': WEBHOOK_SECRET,
            'x-tenant-slug': tenant.slug,
          },
          body: payload,
          signal: AbortSignal.timeout(5000), // 5s timeout
        });
        const data = await res.json();
        if (res.ok) {
          console.log(`[Webhook] ${event} → ${product} (${url}) ✅`, data);
        } else {
          console.warn(`[Webhook] ${event} → ${product} failed:`, data);
        }
      } catch (err) {
        console.error(`[Webhook] ${event} → ${product} error:`, err.message);
      }
    })
  );
}

app.use(cors());
app.use(express.json({ limit: '2mb' }));

// ─── MongoDB Connection ───────────────────────────────────────────────────────
// The control plane owns ONLY its own database. Other platforms (e.g. RMS, SMS) must
// use their own database names on the same cluster so data stays isolated.
const CONTROL_PLANE_DB = process.env.MONGODB_DB_NAME || 'pragati';
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017', { dbName: CONTROL_PLANE_DB })
  .then(() => console.log(`✅ MongoDB connected (db: ${CONTROL_PLANE_DB})`))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ─── Mongoose Models ──────────────────────────────────────────────────────────

// Tenant
const tenantSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    entity_id: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    owner_name: { type: String, default: '' },
    subscribed_products: { type: [String], default: [] },
    contact_email: { type: String, default: '' },
    contact_phone: { type: String, default: '' },
    address: { type: String, default: '' },
    gst_no: { type: String, default: '' },
    pan_number: { type: String, default: '' },
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'active' },
    billing_cycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    registered_via: { type: String, enum: ['admin', 'self_signup'], default: 'admin' },
  },
  { timestamps: true }
);
const Tenant = mongoose.model('Tenant', tenantSchema);

// GlobalProduct
const globalProductSchema = new mongoose.Schema(
  {
    slug: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    webhook_url: { type: String, default: '' },
    description: { type: String, default: '' },
    price: { type: Number, default: 0 },
    // Marketing fields shown on the public landing page
    tagline: { type: String, default: '' },
    features: { type: [String], default: [] },
    icon: { type: String, default: 'apps' }, // Material Symbols icon name
    image: { type: String, default: '' }, // Optional product image URL shown on landing cards
  },
  { timestamps: true }
);
const GlobalProduct = mongoose.model('GlobalProduct', globalProductSchema);

// User — Control Plane managed credentials (one Admin per tenant, portals may add more via /api/admin/staff)
const userSchema = new mongoose.Schema(
  {
    entity_id: { type: String, required: true },
    username: { type: String, required: true },
    password_hash: { type: String, required: true },
    // 'Admin' is the default provisioned role; individual portals define their own roles internally
    role: { type: String, default: 'Admin' },
  },
  { timestamps: true }
);
const User = mongoose.model('User', userSchema);

// ControlPlaneAudit
const controlPlaneAuditSchema = new mongoose.Schema(
  {
    username: { type: String, required: true }, // The superadmin who performed the action
    action: { type: String, required: true }, // e.g., 'CREATE', 'SUSPEND', 'UPDATE'
    entityType: { type: String, required: true }, // e.g., 'Tenant', 'Product'
    entityId: { type: String, required: true }, // ID or name of the affected entity
    details: { type: Object, default: {} }, // Additional context (old/new values)
  },
  { timestamps: true }
);
const ControlPlaneAudit = mongoose.model('ControlPlaneAudit', controlPlaneAuditSchema);

async function logAudit(username, action, entityType, entityId, details = {}) {
  try {
    await ControlPlaneAudit.create({ username, action, entityType, entityId, details });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}

// RegistrationOrder — one per self-service signup checkout.
// Holds the details captured before payment; the Tenant + Admin user are only
// created once the order is paid. Card/UPI details are NEVER persisted.
const registrationOrderSchema = new mongoose.Schema(
  {
    order_id: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ['created', 'processing', 'paid', 'needs_review', 'expired'],
      default: 'created',
    },
    company: {
      name: String,
      owner_name: String,
      slug: String,
      contact_email: String,
      contact_phone: String,
      address: String,
      gst_no: String,
      pan_number: String,
    },
    products: { type: [String], default: [] },
    billing_cycle: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
    amount: {
      subtotal: Number,
      taxes: { type: [{ name: String, amount: Number, rate: Number }], default: [] },
      total: Number,
      currency: { type: String, default: 'INR' },
    },
    attempts: { type: Number, default: 0 },
    payment: {
      method: String,
      reference: String,
      paid_at: Date,
    },
    expires_at: { type: Date, required: true },
  },
  { timestamps: true }
);
const RegistrationOrder = mongoose.model('RegistrationOrder', registrationOrderSchema);

// Contact (for contact form submissions)
const contactSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true },
    category: { type: String, required: true },
    message: { type: String, required: true },
    status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new' },
  },
  { timestamps: true }
);
const Contact = mongoose.model('Contact', contactSchema);

function cleanFeatures(features) {
  const list = Array.isArray(features)
    ? features
    : typeof features === 'string'
      ? features.split('\n')
      : [];
  return list.map((f) => String(f).trim()).filter(Boolean).slice(0, 8);
}

// SystemConfig (for global settings like taxes and discounts)
const systemConfigSchema = new mongoose.Schema({
  taxes: {
    type: [{ name: String, rate: Number }],
    default: [{ name: 'GST', rate: 18 }]
  },
  yearly_months_charged: { type: Number, default: 10 }
}, { timestamps: true });
const SystemConfig = mongoose.model('SystemConfig', systemConfigSchema);

async function getConfig() {
  let config = await SystemConfig.findOne();
  if (!config) config = await SystemConfig.create({});
  return config;
}

// ─── SuperAdmin Middleware ────────────────────────────────────────────────────
const superAdminAuth = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.role !== 'SuperAdmin') return res.status(403).json({ error: 'Forbidden' });
    req.superAdmin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ─── Tenant Resolver (shared helper) ─────────────────────────────────────────
async function resolveTenant(slug, res) {
  if (!slug) {
    res.status(400).json({ error: 'Missing X-Tenant-Slug header' });
    return null;
  }
  const tenant = await Tenant.findOne({ slug });
  if (!tenant) {
    res.status(404).json({ error: 'Tenant not found' });
    return null;
  }
  return tenant;
}

// ─── Super Admin Routes ───────────────────────────────────────────────────────

// POST /api/super/login
app.post('/api/super/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });

    if (
      username !== process.env.SUPER_ADMIN_USERNAME ||
      password !== process.env.SUPER_ADMIN_PASSWORD
    ) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ role: 'SuperAdmin', username }, JWT_SECRET, { expiresIn: '8h' });
    
    await logAudit(username, 'LOGIN', 'System', 'SuperAdmin');
    
    return res.json({ token, username });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// POST /api/super/logout
app.post('/api/super/logout', superAdminAuth, async (req, res) => {
  try {
    await logAudit(req.superAdmin.username, 'LOGOUT', 'System', 'SuperAdmin');
    return res.json({ success: true });
  } catch (err) {
    return res.status(500).json({ error: 'Logout failed' });
  }
});

// GET /api/super/entities
app.get('/api/super/entities', superAdminAuth, async (req, res) => {
  try {
    const tenants = await Tenant.find().sort({ createdAt: -1 }).lean();

    const enriched = await Promise.all(
      tenants.map(async (t) => {
        const user_count = await User.countDocuments({ entity_id: t.entity_id });
        return { ...t, user_count };
      })
    );

    return res.json(enriched);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch entities' });
  }
});

// POST /api/super/entities
app.post('/api/super/entities', superAdminAuth, async (req, res) => {
  try {
    const { name, owner_name, slug, subscribed_products, contact_email, contact_phone, address, gst_no, pan_number, status } =
      req.body;

    if (!name || !slug || !subscribed_products || subscribed_products.length === 0) {
      return res.status(400).json({ error: 'name, slug, and subscribed_products are required' });
    }
    if (!/^[a-z0-9-]+$/.test(slug)) {
      return res
        .status(400)
        .json({ error: 'Slug must contain only lowercase letters, numbers, and hyphens' });
    }

    const existing = await Tenant.findOne({ slug });
    if (existing) return res.status(409).json({ error: 'Slug already taken' });

    const entity_id = 'ent_' + slug.replace(/-/g, '_') + '_' + Date.now();

    const tenant = new Tenant({
      slug,
      entity_id,
      name,
      owner_name: owner_name || '',
      subscribed_products,
      contact_email: contact_email || '',
      contact_phone: contact_phone || '',
      address: address || '',
      gst_no: gst_no || '',
      pan_number: pan_number || '',
      status: status || 'active',
    });
    await tenant.save();

    // Auto-provision default Admin user
    const defaultUsername = slug + '_admin';
    const defaultPassword = 'Admin@1234';
    const password_hash = await bcrypt.hash(defaultPassword, 10);

    const adminUser = new User({ entity_id, username: defaultUsername, password_hash, role: 'Admin' });
    await adminUser.save();

    await logAudit(req.superAdmin.username, 'CREATE', 'Tenant', tenant.slug, { name, subscribed_products });

    return res.status(201).json({
      tenant,
      provisioned_credentials: {
        username: defaultUsername,
        password: defaultPassword,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to create entity' });
  }
});

// GET /api/super/entities/:id
app.get('/api/super/entities/:id', superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id).lean();
    if (!tenant) return res.status(404).json({ error: 'Entity not found' });

    const user_count = await User.countDocuments({ entity_id: tenant.entity_id });

    return res.json({ ...tenant, user_count });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch entity' });
  }
});

// PUT /api/super/entities/:id
app.put('/api/super/entities/:id', superAdminAuth, async (req, res) => {
  try {
    const { name, owner_name, subscribed_products, contact_email, contact_phone, address, gst_no, pan_number, status } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (owner_name !== undefined) update.owner_name = owner_name;
    if (subscribed_products !== undefined) update.subscribed_products = subscribed_products;
    if (contact_email !== undefined) update.contact_email = contact_email;
    if (contact_phone !== undefined) update.contact_phone = contact_phone;
    if (address !== undefined) update.address = address;
    if (gst_no !== undefined) update.gst_no = gst_no;
    if (pan_number !== undefined) update.pan_number = pan_number;
    if (status !== undefined) update.status = status;

    const tenant = await Tenant.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!tenant) return res.status(404).json({ error: 'Entity not found' });

    await logAudit(req.superAdmin.username, 'UPDATE', 'Tenant', tenant.slug, update);

    return res.json(tenant);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update entity' });
  }
});

// DELETE /api/super/entities/:id
// Deletes the tenant and all Pragati-managed credentials.
// Each portal backend is responsible for cleaning up its own data on its end.
app.delete('/api/super/entities/:id', superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findById(req.params.id);
    if (!tenant) return res.status(404).json({ error: 'Entity not found' });

    const eid = tenant.entity_id;

    const { deletedCount: users_deleted } = await User.deleteMany({ entity_id: eid });
    await Tenant.findByIdAndDelete(req.params.id);

    await logAudit(req.superAdmin.username, 'DELETE', 'Tenant', tenant.slug);

    return res.json({
      success: true,
      deleted_entity_id: eid,
      deleted_counts: { users: users_deleted },
      note: 'Portal-specific data (orders, inventory, staff, etc.) must be cleaned up by each portal backend.',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Failed to delete entity' });
  }
});

// PUT /api/super/entities/:id/suspend
// Suspending a tenant:
//  1. Sets status = 'suspended' in Pragati DB
//  2. Fires a webhook to each subscribed portal backend so they sync their own Tenant record
//  After this, any new login attempt on the portal will be blocked.
app.put('/api/super/entities/:id/suspend', superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status: 'suspended' },
      { new: true }
    );
    if (!tenant) return res.status(404).json({ error: 'Entity not found' });

    // Notify portal backends — fire and don't wait (non-blocking)
    firePortalWebhooks(tenant, 'tenant.suspended').catch(() => { });

    await logAudit(req.superAdmin.username, 'SUSPEND', 'Tenant', tenant.slug);

    return res.json(tenant);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to suspend entity' });
  }
});

// PUT /api/super/entities/:id/activate
app.put('/api/super/entities/:id/activate', superAdminAuth, async (req, res) => {
  try {
    const tenant = await Tenant.findByIdAndUpdate(
      req.params.id,
      { status: 'active' },
      { new: true }
    );
    if (!tenant) return res.status(404).json({ error: 'Entity not found' });

    // Notify portal backends
    firePortalWebhooks(tenant, 'tenant.activated').catch(() => { });

    await logAudit(req.superAdmin.username, 'ACTIVATE', 'Tenant', tenant.slug);

    return res.json(tenant);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to activate entity' });
  }
});

// ─── Super Admin Product Routes ───────────────────────────────────────────────

// GET /api/super/products
app.get('/api/super/products', superAdminAuth, async (req, res) => {
  try {
    const products = await GlobalProduct.find().sort({ createdAt: -1 }).lean();
    return res.json(products);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// POST /api/super/products
app.post('/api/super/products', superAdminAuth, async (req, res) => {
  try {
    const { name, slug, webhook_url, description, price, tagline, features, icon, image } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });

    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug must contain only letters, numbers, and hyphens' });
    }

    const existing = await GlobalProduct.findOne({ slug });
    if (existing) return res.status(409).json({ error: 'Slug already taken' });

    const product = new GlobalProduct({
      name, slug, webhook_url: webhook_url || '', description, price: price || 0,
      tagline: tagline || '', features: cleanFeatures(features), icon: icon || 'apps', image: (image || '').trim(),
    });
    await product.save();

    await logAudit(req.superAdmin.username, 'CREATE', 'Product', product.slug, { name, price: product.price });

    return res.status(201).json(product);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create product' });
  }
});

// PUT /api/super/products/:id
app.put('/api/super/products/:id', superAdminAuth, async (req, res) => {
  try {
    const { name, description, price, webhook_url, tagline, features, icon, image } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = price;
    if (webhook_url !== undefined) update.webhook_url = webhook_url;
    if (tagline !== undefined) update.tagline = tagline;
    if (features !== undefined) update.features = cleanFeatures(features);
    if (icon !== undefined) update.icon = icon || 'apps';
    if (image !== undefined) update.image = (image || '').trim();

    const product = await GlobalProduct.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await logAudit(req.superAdmin.username, 'UPDATE', 'Product', product.slug, update);

    return res.json(product);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update product' });
  }
});

// DELETE /api/super/products/:id
app.delete('/api/super/products/:id', superAdminAuth, async (req, res) => {
  try {
    const product = await GlobalProduct.findByIdAndDelete(req.params.id);
    if (!product) return res.status(404).json({ error: 'Product not found' });

    await logAudit(req.superAdmin.username, 'DELETE', 'Product', product.slug);

    return res.json({ success: true, deleted_product_id: product._id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete product' });
  }
});

// ─── Super Admin Audit Logs Routes ─────────────────────────────────────────────

// GET /api/super/audits
app.get('/api/super/audits', superAdminAuth, async (req, res) => {
  try {
    const audits = await ControlPlaneAudit.find().sort({ createdAt: -1 }).limit(100).lean();
    return res.json(audits);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});

// ─── Super Admin Config Routes ──────────────────────────────────────────────────

// GET /api/super/config
app.get('/api/super/config', superAdminAuth, async (req, res) => {
  try {
    const config = await getConfig();
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// PUT /api/super/config
app.put('/api/super/config', superAdminAuth, async (req, res) => {
  try {
    const { taxes, yearly_months_charged } = req.body;
    let config = await getConfig();
    
    if (taxes !== undefined && Array.isArray(taxes)) {
      config.taxes = taxes.map(t => ({ name: t.name, rate: parseFloat(t.rate) || 0 }));
    }
    if (yearly_months_charged !== undefined) config.yearly_months_charged = parseInt(yearly_months_charged, 10);
    
    await config.save();
    await logAudit(req.superAdmin.username, 'UPDATE', 'Config', 'SystemConfig', { taxes, yearly_months_charged });
    
    return res.json(config);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to update config' });
  }
});

// ─── Super Admin Billing Routes ───────────────────────────────────────────────

// GET /api/super/billing
app.get('/api/super/billing', superAdminAuth, async (req, res) => {
  try {
    const [tenants, products] = await Promise.all([
      Tenant.find().sort({ createdAt: -1 }).lean(),
      GlobalProduct.find().lean(),
    ]);

    // Build price map from DB only (no hardcoded fallbacks)
    const productPrices = {};
    products.forEach((p) => { productPrices[p.slug] = p.price; });

    const billingData = tenants.map((t) => {
      let mrr = 0;
      if (t.status === 'active') {
        (t.subscribed_products || []).forEach((slug) => {
          if (productPrices[slug] !== undefined) mrr += productPrices[slug];
        });
      }

      return {
        _id: t._id,
        entity_id: t.entity_id,
        name: t.name,
        slug: t.slug,
        status: t.status,
        subscribed_products: t.subscribed_products || [],
        mrr,
        created_at: t.createdAt,
      };
    });

    return res.json(billingData);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch billing data' });
  }
});

// GET /api/super/stats
app.get('/api/super/stats', superAdminAuth, async (req, res) => {
  try {
    const [tenants, products] = await Promise.all([
      Tenant.find().lean(),
      GlobalProduct.find().lean(),
    ]);

    const total_entities = tenants.length;
    const by_status = { active: 0, suspended: 0, trial: 0 };
    // Build by_product dynamically from DB product slugs
    const by_product = {};
    products.forEach((p) => { by_product[p.slug] = 0; });

    let newest_entity = null;
    let newest_time = 0;
    let total_mrr = 0;

    // Build price map for MRR calculation
    const productPrices = {};
    products.forEach((p) => { productPrices[p.slug] = p.price; });

    for (const t of tenants) {
      by_status[t.status] = (by_status[t.status] || 0) + 1;

      for (const p of t.subscribed_products || []) {
        if (by_product[p] !== undefined) by_product[p]++;
        if (t.status === 'active' && productPrices[p] !== undefined) {
          total_mrr += productPrices[p];
        }
      }

      const created = new Date(t.createdAt).getTime();
      if (created > newest_time) {
        newest_time = created;
        newest_entity = t;
      }
    }

    const total_users = await User.countDocuments({});

    return res.json({
      total_entities,
      total_users,
      total_mrr,
      by_product,
      by_status,
      newest_entity,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// ─── Portal Auth Routes ───────────────────────────────────────────────────────
// All portal logins go through Pragati. The JWT returned contains subscribed_products
// so each portal backend can verify access to its own product on every request.

// POST /api/auth/login
// Called by: RMS, HRMS, HMS portal backends (or their frontends directly)
// Header required: X-Tenant-Slug: <tenant-slug>
app.post('/api/auth/login', async (req, res) => {
  try {
    const slug = req.headers['x-tenant-slug'];
    const tenant = await resolveTenant(slug, res);
    if (!tenant) return;

    if (tenant.status === 'suspended') {
      return res.status(403).json({
        error: 'Account suspended. Please contact Techhansa support.',
        code: 'TENANT_SUSPENDED',
      });
    }

    const { username, password } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'Username and password are required' });

    const user = await User.findOne({ username, entity_id: tenant.entity_id });
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        entity_id: tenant.entity_id,
        slug: tenant.slug,
        subscribed_products: tenant.subscribed_products,
      },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    return res.json({
      token,
      role: user.role,
      slug: tenant.slug,
      entity_id: tenant.entity_id,
      subscribed_products: tenant.subscribed_products,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/portal/check-access
// Called by portal backends to verify a tenant's access mid-session
// (e.g., after a suspend or product removal without re-login).
// Header required: X-Tenant-Slug: <tenant-slug>
// Query param: product=<product-slug> (optional — if omitted, returns full tenant status)
app.get('/api/portal/check-access', async (req, res) => {
  try {
    const slug = req.headers['x-tenant-slug'];
    const tenant = await resolveTenant(slug, res);
    if (!tenant) return;

    if (tenant.status === 'suspended') {
      return res.status(403).json({
        access: false,
        reason: 'suspended',
        message: 'Account suspended. Please contact Techhansa support.',
      });
    }

    const productSlug = req.query.product;
    if (productSlug) {
      const hasProduct = (tenant.subscribed_products || []).includes(productSlug);
      if (!hasProduct) {
        return res.status(403).json({
          access: false,
          reason: 'not_subscribed',
          message: `This account is not subscribed to ${productSlug.toUpperCase()}.`,
        });
      }
    }

    return res.json({
      access: true,
      slug: tenant.slug,
      entity_id: tenant.entity_id,
      status: tenant.status,
      subscribed_products: tenant.subscribed_products,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Access check failed' });
  }
});

// ─── Credential Management Routes ────────────────────────────────────────────
// Pragati manages the credential store for all portals.
// Portal backends use these to list and create users.
// Header required: X-Tenant-Slug: <tenant-slug>

// GET /api/admin/staff
app.get('/api/admin/staff', async (req, res) => {
  try {
    const slug = req.headers['x-tenant-slug'];
    const tenant = await resolveTenant(slug, res);
    if (!tenant) return;

    const users = await User.find({ entity_id: tenant.entity_id })
      .select('-password_hash')
      .lean();
    return res.json(users);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch staff' });
  }
});

// POST /api/admin/staff
app.post('/api/admin/staff', async (req, res) => {
  try {
    const slug = req.headers['x-tenant-slug'];
    const tenant = await resolveTenant(slug, res);
    if (!tenant) return;

    const { username, password, role } = req.body;
    if (!username || !password)
      return res.status(400).json({ error: 'username and password are required' });

    const existing = await User.findOne({ username, entity_id: tenant.entity_id });
    if (existing) return res.status(409).json({ error: 'Username already exists' });

    const password_hash = await bcrypt.hash(password, 10);
    const user = new User({ entity_id: tenant.entity_id, username, password_hash, role: role || 'Admin' });
    await user.save();

    return res.status(201).json({
      _id: user._id,
      username: user.username,
      role: user.role,
      entity_id: user.entity_id,
      createdAt: user.createdAt,
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to create user' });
  }
});

// DELETE /api/admin/staff/:userId
app.delete('/api/admin/staff/:userId', async (req, res) => {
  try {
    const slug = req.headers['x-tenant-slug'];
    const tenant = await resolveTenant(slug, res);
    if (!tenant) return;

    const user = await User.findOneAndDelete({
      _id: req.params.userId,
      entity_id: tenant.entity_id,
    });
    if (!user) return res.status(404).json({ error: 'User not found' });

    return res.json({ success: true, deleted_user_id: user._id });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ─── Public (Customer) Routes ─────────────────────────────────────────────────
// Used by the landing page + self-registration flow. No authentication.

// Tiny in-memory rate limiter (per IP + bucket) to blunt abuse of public endpoints.
const rateBuckets = new Map();
function rateLimit(bucket, max, windowMs) {
  return (req, res, next) => {
    const key = `${bucket}:${req.ip}`;
    const now = Date.now();
    const hits = (rateBuckets.get(key) || []).filter((t) => now - t < windowMs);
    if (hits.length >= max) {
      return res.status(429).json({ error: 'Too many requests. Please slow down and try again shortly.' });
    }
    hits.push(now);
    rateBuckets.set(key, hits);
    next();
  };
}
setInterval(() => {
  const now = Date.now();
  for (const [k, hits] of rateBuckets) {
    if (!hits.some((t) => now - t < 10 * 60 * 1000)) rateBuckets.delete(k);
  }
}, 5 * 60 * 1000).unref();

const RESERVED_SLUGS = ['admin', 'api', 'login', 'register', 'super', 'pragati', 'techhansa', 'www', 'app', 'support'];
const round2 = (n) => Math.round(n * 100) / 100;

function computeAmount(products, billing_cycle, config) {
  const monthly = products.reduce((sum, p) => sum + (Number(p.price) || 0), 0);
  const subtotal = round2(billing_cycle === 'yearly' ? monthly * config.yearly_months_charged : monthly);
  
  let totalTaxes = 0;
  const taxesList = config.taxes || [{ name: 'GST', rate: 18 }];
  const computedTaxes = taxesList.map(t => {
    const amt = round2(subtotal * (t.rate / 100));
    totalTaxes += amt;
    return { name: t.name, amount: amt, rate: t.rate };
  });

  return { subtotal, taxes: computedTaxes, total: round2(subtotal + totalTaxes), currency: 'INR' };
}

function generatePassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const symbols = '@#$%&*!';
  const pick = (set) => set[crypto.randomInt(set.length)];
  const all = upper + lower + digits + symbols;
  const chars = [pick(upper), pick(lower), pick(digits), pick(symbols)];
  while (chars.length < 12) chars.push(pick(all));
  for (let i = chars.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [chars[i], chars[j]] = [chars[j], chars[i]];
  }
  return chars.join('');
}

function luhnValid(num) {
  let sum = 0;
  let alt = false;
  for (let i = num.length - 1; i >= 0; i--) {
    let d = Number(num[i]);
    if (alt) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
    alt = !alt;
  }
  return sum % 10 === 0;
}

const BANKS = ['hdfc', 'sbi', 'icici', 'axis', 'kotak', 'pnb'];

// Simulated payment gateway. Swap this function for a Razorpay/Stripe verification
// (create order → verify signature) when real keys are available.
// Test values: card 4000 0000 0000 0002 → declined; UPI id "fail@upi" → declined.
function simulateGateway(method, details = {}) {
  if (method === 'card') {
    const number = String(details.number || '').replace(/\s+/g, '');
    if (!/^\d{13,19}$/.test(number) || !luhnValid(number)) return { ok: false, error: 'Invalid card number.' };
    const m = /^(\d{2})\s*\/\s*(\d{2})$/.exec(String(details.expiry || ''));
    if (!m || Number(m[1]) < 1 || Number(m[1]) > 12) return { ok: false, error: 'Invalid card expiry.' };
    const expiresAt = new Date(2000 + Number(m[2]), Number(m[1]), 1); // first day after expiry month
    if (expiresAt <= new Date()) return { ok: false, error: 'This card has expired.' };
    if (!/^\d{3,4}$/.test(String(details.cvv || ''))) return { ok: false, error: 'Invalid CVV.' };
    if (!String(details.holder || '').trim()) return { ok: false, error: 'Cardholder name is required.' };
    if (number === '4000000000000002') return { ok: false, error: 'Your card was declined by the bank. Please try another payment method.' };
    return { ok: true };
  }
  if (method === 'upi') {
    const vpa = String(details.vpa || '').trim();
    if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(vpa)) return { ok: false, error: 'Enter a valid UPI ID (e.g. name@bank).' };
    if (vpa.toLowerCase() === 'fail@upi') return { ok: false, error: 'UPI payment was declined. Please try again.' };
    return { ok: true };
  }
  if (method === 'netbanking') {
    if (!BANKS.includes(String(details.bank || '').toLowerCase())) return { ok: false, error: 'Please select a bank.' };
    return { ok: true };
  }
  return { ok: false, error: 'Unsupported payment method.' };
}

// POST /api/public/contact — receive contact form submissions
app.post('/api/public/contact', rateLimit('contact', 10, 60 * 1000), async (req, res) => {
  try {
    const { name, email, category, message } = req.body || {};
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    const contact = new Contact({ name, email, category: category || 'General', message });
    await contact.save();
    return res.status(201).json({ success: true });
  } catch (err) {
    console.error('[contact form]', err);
    return res.status(500).json({ error: 'Failed to submit contact form. Please try again.' });
  }
});

// GET /api/public/products — catalog shown on the landing page (admin-managed)
app.get('/api/public/products', async (req, res) => {
  try {
    const products = await GlobalProduct.find()
      .sort({ createdAt: 1 })
      .select('name slug description price tagline features icon image')
      .lean();
    res.set('Cache-Control', 'no-store');
    return res.json(products);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch products' });
  }
});

// GET /api/public/config — public access to global settings like tax rate
app.get('/api/public/config', async (req, res) => {
  try {
    const config = await getConfig();
    res.set('Cache-Control', 'no-store');
    return res.json({ taxes: config.taxes, yearly_months_charged: config.yearly_months_charged });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch config' });
  }
});

// GET /api/public/slug-available?slug=acme-corp
app.get('/api/public/slug-available', rateLimit('slug', 60, 60 * 1000), async (req, res) => {
  try {
    const slug = String(req.query.slug || '').toLowerCase();
    if (!/^[a-z0-9-]{3,40}$/.test(slug) || RESERVED_SLUGS.includes(slug)) {
      return res.json({ available: false, reason: 'invalid' });
    }
    const taken = await Tenant.exists({ slug });
    return res.json({ available: !taken, reason: taken ? 'taken' : null });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to check availability' });
  }
});

// POST /api/public/register/order — validate details and create a checkout order
app.post('/api/public/register/order', rateLimit('order', 15, 10 * 60 * 1000), async (req, res) => {
  try {
    const b = req.body || {};
    const str = (v) => String(v ?? '').trim();
    const company = {
      name: str(b.name),
      owner_name: str(b.owner_name),
      slug: str(b.slug).toLowerCase(),
      contact_email: str(b.contact_email).toLowerCase(),
      contact_phone: str(b.contact_phone).replace(/[\s-]/g, ''),
      address: str(b.address),
      gst_no: str(b.gst_no).toUpperCase(),
      pan_number: str(b.pan_number).toUpperCase(),
    };
    const billing_cycle = b.billing_cycle === 'yearly' ? 'yearly' : 'monthly';
    const requested = Array.isArray(b.products) ? [...new Set(b.products.map(String))] : [];

    if (company.name.length < 2) return res.status(400).json({ error: 'Business name is required.' });
    if (company.owner_name.length < 2) return res.status(400).json({ error: 'Owner name is required.' });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(company.contact_email)) return res.status(400).json({ error: 'Enter a valid email address.' });
    if (!/^\+?\d{10,13}$/.test(company.contact_phone)) return res.status(400).json({ error: 'Enter a valid phone number.' });
    if (company.gst_no && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/.test(company.gst_no)) return res.status(400).json({ error: 'Enter a valid 15-character GSTIN or leave it blank.' });
    if (company.pan_number && !/^[A-Z]{5}\d{4}[A-Z]$/.test(company.pan_number)) return res.status(400).json({ error: 'Enter a valid 10-character PAN or leave it blank.' });
    if (!/^[a-z0-9-]{3,40}$/.test(company.slug) || RESERVED_SLUGS.includes(company.slug)) {
      return res.status(400).json({ error: 'Workspace ID must be 3–40 characters: lowercase letters, numbers and hyphens.' });
    }
    if (requested.length === 0) return res.status(400).json({ error: 'Select at least one product.' });

    if (await Tenant.exists({ slug: company.slug })) {
      return res.status(409).json({ error: 'That workspace ID is already taken. Please choose another.' });
    }

    const productDocs = await GlobalProduct.find({ slug: { $in: requested } }).lean();
    if (productDocs.length !== requested.length) {
      return res.status(400).json({ error: 'One or more selected products are no longer available.' });
    }

    const config = await getConfig();
    const amount = computeAmount(productDocs, billing_cycle, config);
    const order = await RegistrationOrder.create({
      order_id: 'ord_' + crypto.randomBytes(9).toString('hex'),
      company,
      products: productDocs.map((p) => p.slug),
      billing_cycle,
      amount,
      expires_at: new Date(Date.now() + 30 * 60 * 1000),
    });

    return res.status(201).json({
      order_id: order.order_id,
      amount,
      billing_cycle,
      products: productDocs.map((p) => ({ slug: p.slug, name: p.name, price: p.price })),
      expires_at: order.expires_at,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
});

// POST /api/public/register/pay — process payment, then provision tenant + credentials
app.post('/api/public/register/pay', rateLimit('pay', 20, 10 * 60 * 1000), async (req, res) => {
  const { order_id, method, details } = req.body || {};
  if (!order_id) return res.status(400).json({ error: 'order_id is required' });

  // Atomically claim the order so double-clicks / replays can never fulfil it twice.
  const order = await RegistrationOrder.findOneAndUpdate(
    { order_id: String(order_id), status: 'created', expires_at: { $gt: new Date() } },
    { status: 'processing', $inc: { attempts: 1 } },
    { new: true }
  );
  if (!order) {
    const existing = await RegistrationOrder.findOne({ order_id: String(order_id) }).lean();
    if (!existing) return res.status(404).json({ error: 'Order not found.' });
    if (existing.status === 'paid') return res.status(409).json({ error: 'This order has already been completed.' });
    if (existing.status === 'processing') return res.status(409).json({ error: 'Payment is already being processed.' });
    return res.status(410).json({ error: 'This checkout session has expired. Please start again.' });
  }

  const release = (status = 'created') => RegistrationOrder.updateOne({ _id: order._id }, { status });
  let charged = false;

  try {
    if (order.attempts > 5) {
      await release('expired');
      return res.status(429).json({ error: 'Too many failed payment attempts. Please start a new checkout.' });
    }

    // Slug may have been taken since the order was created
    if (await Tenant.exists({ slug: order.company.slug })) {
      await release('expired');
      return res.status(409).json({ error: 'That workspace ID was just taken. Please restart and pick another.', code: 'SLUG_TAKEN' });
    }

    let reference;
    if (order.amount.total > 0) {
      const gateway = simulateGateway(method, details);
      await new Promise((r) => setTimeout(r, 1500)); // simulate bank round-trip
      if (!gateway.ok) {
        await release('created');
        return res.status(402).json({ error: gateway.error, code: 'PAYMENT_FAILED' });
      }
      reference = 'PAY-' + crypto.randomBytes(5).toString('hex').toUpperCase();
      charged = true;
    } else {
      reference = 'FREE-' + crypto.randomBytes(4).toString('hex').toUpperCase();
    }

    // ── Payment succeeded → provision the tenant and its Admin user ──
    const entity_id = 'ent_' + order.company.slug.replace(/-/g, '_') + '_' + Date.now();
    const username = order.company.slug + '_admin';
    const password = generatePassword();

    const tenant = await Tenant.create({
      slug: order.company.slug,
      entity_id,
      name: order.company.name,
      owner_name: order.company.owner_name,
      subscribed_products: order.products,
      contact_email: order.company.contact_email,
      contact_phone: order.company.contact_phone,
      address: order.company.address,
      gst_no: order.company.gst_no,
      pan_number: order.company.pan_number,
      status: 'active',
      billing_cycle: order.billing_cycle,
      registered_via: 'self_signup',
    });
    await User.create({ entity_id, username, password_hash: await bcrypt.hash(password, 10), role: 'Admin' });

    await RegistrationOrder.updateOne(
      { _id: order._id },
      { status: 'paid', payment: { method: method || 'free', reference, paid_at: new Date() } }
    );
    await logAudit('customer:self-signup', 'CREATE', 'Tenant', tenant.slug, {
      name: tenant.name, subscribed_products: order.products, billing_cycle: order.billing_cycle,
      order_id: order.order_id, amount: order.amount.total, payment_reference: reference,
    });

    try {
      await transporter.sendMail({
        from: '"Pragati Support" <onboarding@resend.dev>',
        to: tenant.contact_email,
        subject: 'Welcome to Pragati - Payment Receipt & Credentials',
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
            <h2>Welcome to Pragati, ${tenant.name}!</h2>
            <p>Your payment of <strong>${order.amount.total} ${order.amount.currency}</strong> has been successfully processed.</p>
            <ul>
              <li><strong>Order ID:</strong> ${order.order_id}</li>
              <li><strong>Payment Reference:</strong> ${reference}</li>
              <li><strong>Billing Cycle:</strong> ${order.billing_cycle}</li>
            </ul>
            <hr style="border: 1px solid #eee; margin: 24px 0;" />
            <h3>Your Login Credentials</h3>
            <p>Use the following credentials to log in to your admin portal:</p>
            <div style="background: #f5f5f5; padding: 16px; border-radius: 8px;">
              <p style="margin: 0 0 8px 0;"><strong>Username:</strong> ${username}</p>
              <p style="margin: 0;"><strong>Password:</strong> ${password}</p>
            </div>
            <p><em>Please ensure you log in and change your password as soon as possible for security purposes.</em></p>
            <br/>
            <p>Thanks,<br/><strong>Techhansa Team</strong></p>
          </div>
        `
      });
      console.log(`[Email] Receipt and credentials sent to ${tenant.contact_email}`);
    } catch (emailErr) {
      console.error('[Email Error] Failed to send email to', tenant.contact_email, emailErr.message);
    }

    return res.status(201).json({
      tenant: { name: tenant.name, slug: tenant.slug, subscribed_products: tenant.subscribed_products },
      credentials: { username, password },
      payment: { reference, method: method || 'free', amount: order.amount, billing_cycle: order.billing_cycle },
    });
  } catch (err) {
    console.error('[register/pay]', err);
    // Payment may have been captured but provisioning failed — flag for manual review, never lose it silently.
    await release(charged ? 'needs_review' : 'created').catch(() => {});
    return res.status(500).json({ error: 'Something went wrong while setting up your account. If you were charged, contact support with order ' + order.order_id + '.' });
  }
});

// ─── Start Server ─────────────────────────────────────────────────────────────

// Serve static frontend files (if built and running in unified deployment)
const frontendDistPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendDistPath));

app.get('*', (req, res) => {
  res.sendFile(path.join(frontendDistPath, 'index.html'));
});

app.listen(PORT, () => {
  console.log(`🚀 Pragati Control Plane running on http://localhost:${PORT}`);
});
