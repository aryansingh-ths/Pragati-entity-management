require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const path = require('path');

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
app.use(express.json());

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/pragati')
  .then(() => console.log('✅ MongoDB connected'))
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
    status: { type: String, enum: ['active', 'suspended', 'trial'], default: 'active' },
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
    const { name, owner_name, slug, subscribed_products, contact_email, contact_phone, address, status } =
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
    const { name, owner_name, subscribed_products, contact_email, contact_phone, address, status } = req.body;

    const update = {};
    if (name !== undefined) update.name = name;
    if (owner_name !== undefined) update.owner_name = owner_name;
    if (subscribed_products !== undefined) update.subscribed_products = subscribed_products;
    if (contact_email !== undefined) update.contact_email = contact_email;
    if (contact_phone !== undefined) update.contact_phone = contact_phone;
    if (address !== undefined) update.address = address;
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
    const { name, slug, webhook_url, description, price } = req.body;
    if (!name || !slug) return res.status(400).json({ error: 'Name and slug are required' });

    if (!/^[a-zA-Z0-9-]+$/.test(slug)) {
      return res.status(400).json({ error: 'Slug must contain only letters, numbers, and hyphens' });
    }

    const existing = await GlobalProduct.findOne({ slug });
    if (existing) return res.status(409).json({ error: 'Slug already taken' });

    const product = new GlobalProduct({ name, slug, webhook_url: webhook_url || '', description, price: price || 0 });
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
    const { name, description, price, webhook_url } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (price !== undefined) update.price = price;
    if (webhook_url !== undefined) update.webhook_url = webhook_url;

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
