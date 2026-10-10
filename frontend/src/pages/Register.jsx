import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AuroraBackground, BrandLogo, accentFor, inr, useProducts, useConfig } from '../customer/shared.jsx';

const STEPS = ['Products', 'Business', 'Payment', 'Done'];
const BANKS = [
  { id: 'hdfc', name: 'HDFC Bank' }, { id: 'sbi', name: 'State Bank of India' },
  { id: 'icici', name: 'ICICI Bank' }, { id: 'axis', name: 'Axis Bank' },
  { id: 'kotak', name: 'Kotak Mahindra' }, { id: 'pnb', name: 'Punjab National Bank' },
];

const EMPTY_FORM = {
  name: '', owner_name: '', slug: '', contact_email: '', contact_phone: '',
  address: '', gst_no: '', pan_number: '',
};

const slugify = (s) =>
  s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

function localAmount(items, cycle, config) {
  const monthly = items.reduce((s, p) => s + (Number(p.price) || 0), 0);
  const subtotal = Math.round((cycle === 'yearly' ? monthly * config.yearly_months_charged : monthly) * 100) / 100;
  
  let totalTaxes = 0;
  const taxes = (config.taxes || [{ name: 'GST', rate: 18 }]).map(t => {
    const amt = Math.round(subtotal * (t.rate / 100) * 100) / 100;
    totalTaxes += amt;
    return { name: t.name, amount: amt, rate: t.rate };
  });

  return { subtotal, taxes, total: Math.round((subtotal + totalTaxes) * 100) / 100, monthly };
}

function validateDetails(f) {
  const e = {};
  if (f.name.trim().length < 2) e.name = 'Enter your business name.';
  if (f.owner_name.trim().length < 2) e.owner_name = 'Enter the owner’s name.';
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(f.contact_email.trim())) e.contact_email = 'Enter a valid email address.';
  if (!/^\+?\d{10,13}$/.test(f.contact_phone.replace(/[\s-]/g, ''))) e.contact_phone = 'Enter a valid 10-digit phone number.';
  if (!/^[a-z0-9-]{3,40}$/.test(f.slug)) e.slug = '3–40 characters: lowercase letters, numbers, hyphens.';
  if (f.gst_no && !/^\d{2}[A-Z]{5}\d{4}[A-Z][A-Z\d]Z[A-Z\d]$/i.test(f.gst_no)) e.gst_no = 'Enter a valid 15-character GSTIN.';
  if (f.pan_number && !/^[A-Z]{5}\d{4}[A-Z]$/i.test(f.pan_number)) e.pan_number = 'Enter a valid 10-character PAN.';
  return e;
}

/* ─────────────────────────────  Small UI pieces  ───────────────────────────── */

function Stepper({ step }) {
  return (
    <div className="lp-stepper" aria-label="Progress">
      {STEPS.map((label, i) => (
        <React.Fragment key={label}>
          <div className={`lp-stepper-item${i < step ? ' done' : ''}${i === step ? ' current' : ''}`}>
            <span className="lp-stepper-dot">
              {i < step ? <span className="material-symbols-outlined">check</span> : i + 1}
            </span>
            <span className="lp-stepper-label">{label}</span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={`lp-stepper-line${i < step ? ' done' : ''}`}><i /></div>
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function Field({ label, error, hint, optional, children, id }) {
  return (
    <div className={`lp-field${error ? ' has-error' : ''}`}>
      <label htmlFor={id}>{label}{optional && <em>optional</em>}</label>
      {children}
      {error ? <small className="lp-field-error">{error}</small> : hint ? <small className="lp-field-hint">{hint}</small> : null}
    </div>
  );
}

function Summary({ items, cycle, amount, locked, config }) {
  const FREE_MONTHS = 12 - config.yearly_months_charged;
  return (
    <aside className="lp-summary">
      <div className="lp-summary-head">
        <span className="material-symbols-outlined">shopping_bag</span>
        <h2>Order summary</h2>
      </div>

      {items.length === 0 ? (
        <p className="lp-summary-empty">Select a product to see your total.</p>
      ) : (
        <ul className="lp-summary-items">
          {items.map((p, i) => (
            <li key={p.slug} style={{ '--c': accentFor(p._idx ?? i) }}>
              <span className="lp-summary-ico"><span className="material-symbols-outlined">{p.icon || 'apps'}</span></span>
              <span className="lp-summary-name">{p.name}</span>
              <b>{inr(cycle === 'yearly' ? p.price * config.yearly_months_charged : p.price)}</b>
            </li>
          ))}
        </ul>
      )}

      <dl className="lp-summary-totals">
        <div><dt>Billing</dt><dd>{cycle === 'yearly' ? 'Yearly' : 'Monthly'}</dd></div>
        <div><dt>Subtotal</dt><dd>{inr(amount.subtotal)}</dd></div>
        {(amount.taxes || []).map(t => (
          <div key={t.name}><dt>{t.name} ({t.rate}%)</dt><dd>{inr(t.amount)}</dd></div>
        ))}
        <div className="lp-summary-total">
          <dt>Total{cycle === 'yearly' ? ' / year' : ' / month'}</dt>
          <dd key={amount.total} className="lp-pop">{inr(amount.total)}</dd>
        </div>
      </dl>

      {cycle === 'yearly' && items.length > 0 && (
        <div className="lp-summary-save">
          <span className="material-symbols-outlined">savings</span>
          You save {inr(Math.round(amount.monthly * FREE_MONTHS * 100) / 100)} ({FREE_MONTHS} {FREE_MONTHS === 1 ? 'month' : 'months'} free)
        </div>
      )}

      <div className="lp-summary-secure">
        <span className="material-symbols-outlined">lock</span>
        {locked ? 'Secure checkout in progress' : '256-bit encrypted · Secure checkout'}
      </div>
    </aside>
  );
}

/* ─────────────────────────────  Step 1 — Products  ─────────────────────────── */

function StepProducts({ products, loading, error, reload, selected, toggle, cycle, setCycle, config }) {
  const FREE_MONTHS = 12 - config.yearly_months_charged;
  return (
    <section className="lp-panel" aria-labelledby="step-products-title">
      <h1 id="step-products-title" className="lp-panel-title">Choose your products</h1>
      <p className="lp-panel-sub">Select one or more products for your business. You can add more later.</p>

      <div className="lp-cycle" role="radiogroup" aria-label="Billing cycle">
        <span className={`lp-cycle-pill ${cycle}`} />
        <button role="radio" aria-checked={cycle === 'monthly'} className={cycle === 'monthly' ? 'on' : ''} onClick={() => setCycle('monthly')}>Monthly</button>
        <button role="radio" aria-checked={cycle === 'yearly'} className={cycle === 'yearly' ? 'on' : ''} onClick={() => setCycle('yearly')}>
          Yearly <em>{FREE_MONTHS} {FREE_MONTHS === 1 ? 'month' : 'months'} free</em>
        </button>
      </div>

      {loading && (
        <div className="lp-choose-grid">
          {[0, 1, 2, 3].map((k) => <div key={k} className="lp-choose lp-skel-block" />)}
        </div>
      )}
      {!loading && error && (
        <div className="lp-state">
          <span className="material-symbols-outlined">cloud_off</span>
          <p>{error}</p>
          <button className="lp-btn lp-btn-soft" onClick={reload}>Try again</button>
        </div>
      )}
      {!loading && !error && products.length === 0 && (
        <div className="lp-state">
          <span className="material-symbols-outlined">inventory_2</span>
          <p>No products are available for subscription yet.</p>
        </div>
      )}
      {!loading && !error && products.length > 0 && (
        <div className="lp-choose-grid">
          {products.map((p, i) => {
            const on = selected.has(p.slug);
            return (
              <button
                key={p.slug}
                id={`choose-${p.slug}`}
                role="checkbox"
                aria-checked={on}
                className={`lp-choose${on ? ' on' : ''}`}
                style={{ '--c': accentFor(i), animationDelay: `${i * 70}ms` }}
                onClick={() => toggle(p.slug)}
              >
                <span className="lp-choose-check"><span className="material-symbols-outlined">check</span></span>
                <span className="lp-choose-icon"><span className="material-symbols-outlined">{p.icon || 'apps'}</span></span>
                <span className="lp-choose-body">
                  <b>{p.name}</b>
                </span>
                <span className="lp-choose-price">
                  <b>{p.price > 0 ? inr(cycle === 'yearly' ? p.price * config.yearly_months_charged : p.price) : 'Free'}</b>
                  {p.price > 0 && <small>/ {cycle === 'yearly' ? 'year' : 'month'}</small>}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────────────  Step 2 — Business  ─────────────────────────── */

function StepDetails({ form, set, errors, onSlugEdit, slugState }) {
  const slugIcon = { checking: 'progress_activity', ok: 'check_circle', taken: 'cancel', invalid: 'error' }[slugState];
  const slugMsg = {
    ok: 'Great — this workspace ID is available.',
    taken: 'This workspace ID is already taken.',
    checking: 'Checking availability…',
  }[slugState];

  return (
    <section className="lp-panel" aria-labelledby="step-details-title">
      <h1 id="step-details-title" className="lp-panel-title">Tell us about your business</h1>
      <p className="lp-panel-sub">We’ll use these details to create your workspace and invoices.</p>

      <div className="lp-form-grid">
        <Field label="Business name" error={errors.name} id="f-name">
          <input id="f-name" value={form.name} onChange={(e) => set('name', e.target.value)} placeholder="Sharma Traders" autoComplete="organization" autoFocus />
        </Field>
        <Field label="Owner name" error={errors.owner_name} id="f-owner">
          <input id="f-owner" value={form.owner_name} onChange={(e) => set('owner_name', e.target.value)} placeholder="Rohit Sharma" autoComplete="name" />
        </Field>
        <Field label="Email" error={errors.contact_email} id="f-email">
          <input id="f-email" type="email" value={form.contact_email} onChange={(e) => set('contact_email', e.target.value)} placeholder="you@company.com" autoComplete="email" />
        </Field>
        <Field label="Phone" error={errors.contact_phone} id="f-phone">
          <input id="f-phone" type="tel" value={form.contact_phone} onChange={(e) => set('contact_phone', e.target.value)} placeholder="98765 43210" autoComplete="tel" />
        </Field>

        <div className="lp-span-2">
          <Field
            label="Workspace ID"
            error={errors.slug || (slugState === 'taken' ? 'This workspace ID is already taken.' : slugState === 'invalid' ? 'Use 3–40 lowercase letters, numbers or hyphens.' : '')}
            hint={slugMsg || 'This becomes your sign-in ID, e.g. your-id_admin'}
            id="f-slug"
          >
            <div className={`lp-slug lp-slug-${slugState}`}>
              <input id="f-slug" value={form.slug} onChange={(e) => onSlugEdit(e.target.value)} placeholder="sharma-traders" spellCheck={false} />
              {slugIcon && <span className={`material-symbols-outlined lp-slug-icon${slugState === 'checking' ? ' spin' : ''}`}>{slugIcon}</span>}
            </div>
          </Field>
        </div>

        <div className="lp-span-2">
          <Field label="Business address" optional id="f-address">
            <textarea id="f-address" rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} placeholder="Street, city, state, PIN" autoComplete="street-address" />
          </Field>
        </div>
        <Field label="GSTIN" optional error={errors.gst_no} id="f-gst">
          <input id="f-gst" value={form.gst_no} onChange={(e) => set('gst_no', e.target.value.toUpperCase())} placeholder="22AAAAA0000A1Z5" maxLength={15} />
        </Field>
        <Field label="PAN" optional error={errors.pan_number} id="f-pan">
          <input id="f-pan" value={form.pan_number} onChange={(e) => set('pan_number', e.target.value.toUpperCase())} placeholder="ABCDE1234F" maxLength={10} />
        </Field>
      </div>
    </section>
  );
}

/* ─────────────────────────────  Step 3 — Payment  ─────────────────────────── */

const formatCard = (v) => v.replace(/\D/g, '').slice(0, 19).replace(/(.{4})/g, '$1 ').trim();
const formatExpiry = (v) => {
  const d = v.replace(/\D/g, '').slice(0, 4);
  return d.length > 2 ? `${d.slice(0, 2)} / ${d.slice(2)}` : d;
};
const cardBrand = (n) => {
  const d = n.replace(/\s/g, '');
  if (/^4/.test(d)) return 'VISA';
  if (/^(5[1-5]|2[2-7])/.test(d)) return 'MASTERCARD';
  if (/^(60|65|81|82|508)/.test(d)) return 'RuPay';
  return 'CARD';
};

function StepPayment({ order, method, setMethod, pay, setPay, payError, paying, onSubmit }) {
  const free = order.amount.total === 0;
  const brand = cardBrand(pay.number);

  return (
    <section className="lp-panel" aria-labelledby="step-pay-title">
      <h1 id="step-pay-title" className="lp-panel-title">{free ? 'Confirm your order' : 'Secure payment'}</h1>
      <p className="lp-panel-sub">
        {free ? 'Your selection has no charge — confirm to create your workspace.' : `You’ll pay ${inr(order.amount.total)} including GST.`}
      </p>

      {payError && (
        <div className="lp-alert lp-shake" role="alert">
          <span className="material-symbols-outlined">error</span>{payError}
        </div>
      )}

      {free ? (
        <div className="lp-free">
          <span className="material-symbols-outlined">redeem</span>
          <p>No payment is required for the products you selected.</p>
        </div>
      ) : (
        <>
          <div className="lp-methods" role="tablist" aria-label="Payment method">
            {[
              { id: 'card', icon: 'credit_card', label: 'Card' },
              { id: 'upi', icon: 'qr_code_2', label: 'UPI' },
              { id: 'netbanking', icon: 'account_balance', label: 'Net banking' },
            ].map((m) => (
              <button key={m.id} role="tab" aria-selected={method === m.id} className={method === m.id ? 'on' : ''} onClick={() => setMethod(m.id)}>
                <span className="material-symbols-outlined">{m.icon}</span>{m.label}
              </button>
            ))}
          </div>

          <div className="lp-method-body" key={method}>
            {method === 'card' && (
              <div className="lp-card-layout">
                <div className="lp-creditcard" aria-hidden="true">
                  <span className="lp-cc-brand">{brand}</span>
                  <span className="lp-cc-chip" />
                  <span className="lp-cc-number">{pay.number || '•••• •••• •••• ••••'}</span>
                  <div className="lp-cc-row">
                    <div><small>Card holder</small><b>{pay.holder || 'YOUR NAME'}</b></div>
                    <div><small>Expires</small><b>{pay.expiry || 'MM / YY'}</b></div>
                  </div>
                </div>
                <div className="lp-form-grid">
                  <div className="lp-span-2">
                    <Field label="Card number" id="p-number">
                      <input id="p-number" inputMode="numeric" autoComplete="cc-number" value={pay.number} onChange={(e) => setPay({ ...pay, number: formatCard(e.target.value) })} placeholder="1234 5678 9012 3456" />
                    </Field>
                  </div>
                  <div className="lp-span-2">
                    <Field label="Name on card" id="p-holder">
                      <input id="p-holder" autoComplete="cc-name" value={pay.holder} onChange={(e) => setPay({ ...pay, holder: e.target.value.toUpperCase() })} placeholder="ROHIT SHARMA" />
                    </Field>
                  </div>
                  <Field label="Expiry" id="p-expiry">
                    <input id="p-expiry" inputMode="numeric" autoComplete="cc-exp" value={pay.expiry} onChange={(e) => setPay({ ...pay, expiry: formatExpiry(e.target.value) })} placeholder="MM / YY" />
                  </Field>
                  <Field label="CVV" id="p-cvv">
                    <input id="p-cvv" type="password" inputMode="numeric" autoComplete="cc-csc" maxLength={4} value={pay.cvv} onChange={(e) => setPay({ ...pay, cvv: e.target.value.replace(/\D/g, '') })} placeholder="•••" />
                  </Field>
                </div>
              </div>
            )}

            {method === 'upi' && (
              <div className="lp-upi">
                <div className="lp-upi-apps" aria-hidden="true">
                  {['GPay', 'PhonePe', 'Paytm', 'BHIM'].map((a) => <span key={a}>{a}</span>)}
                </div>
                <Field label="UPI ID" hint="A payment request will be sent to your UPI app." id="p-vpa">
                  <input id="p-vpa" value={pay.vpa} onChange={(e) => setPay({ ...pay, vpa: e.target.value })} placeholder="yourname@okbank" autoComplete="off" spellCheck={false} />
                </Field>
              </div>
            )}

            {method === 'netbanking' && (
              <div className="lp-banks" role="radiogroup" aria-label="Select your bank">
                {BANKS.map((b) => (
                  <button key={b.id} role="radio" aria-checked={pay.bank === b.id} className={pay.bank === b.id ? 'on' : ''} onClick={() => setPay({ ...pay, bank: b.id })}>
                    <span className="lp-bank-ico material-symbols-outlined">account_balance</span>
                    {b.name}
                    <span className="lp-bank-tick material-symbols-outlined">check_circle</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lp-testmode">
            <span className="material-symbols-outlined">science</span>
            <div>
              <b>Test mode</b> — no real money is charged. Use card <code>4242 4242 4242 4242</code> with any future expiry and CVV,
              or UPI <code>test@upi</code>. Card <code>4000 0000 0000 0002</code> / UPI <code>fail@upi</code> simulate a decline.
            </div>
          </div>
        </>
      )}

      <button id="pay-now-btn" className="lp-btn lp-btn-primary lp-btn-lg lp-pay-btn" onClick={onSubmit} disabled={paying}>
        {paying ? <><span className="lp-spinner" /> Processing…</> : free
          ? <><span className="material-symbols-outlined">check_circle</span> Complete registration</>
          : <><span className="material-symbols-outlined">lock</span> Pay {inr(order.amount.total)}</>}
      </button>
    </section>
  );
}

/* ─────────────────────────────  Step 4 — Success  ─────────────────────────── */

function CopyButton({ text, label }) {
  const [done, setDone] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const t = document.createElement('textarea');
      t.value = text; document.body.appendChild(t); t.select();
      try { document.execCommand('copy'); } catch { /* ignore */ }
      document.body.removeChild(t);
    }
    setDone(true);
    setTimeout(() => setDone(false), 1800);
  };
  return (
    <button type="button" className={`lp-copy${done ? ' done' : ''}`} onClick={copy} aria-label={`Copy ${label}`}>
      <span className="material-symbols-outlined">{done ? 'check' : 'content_copy'}</span>
      {done ? 'Copied' : 'Copy'}
    </button>
  );
}

function StepSuccess({ result, products }) {
  const [show, setShow] = useState(false);
  const confetti = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.6,
      dur: 2.2 + Math.random() * 1.6,
      color: ['#0ea5c6', '#8b7cf6', '#f2a93b', '#34b98a', '#ec6fa3'][i % 5],
      rot: Math.random() * 360,
      key: i,
    })), []
  );
  const names = result.tenant.subscribed_products.map((s) => products.find((p) => p.slug === s)?.name || s);

  const download = () => {
    const body = [
      'PRAGATI — ACCOUNT CREDENTIALS', '',
      `Business : ${result.tenant.name}`,
      `Workspace: ${result.tenant.slug}`,
      `Products : ${names.join(', ')}`, '',
      `Username : ${result.credentials.username}`,
      `Password : ${result.credentials.password}`, '',
      `Payment ref: ${result.payment.reference}`,
      `Amount paid: ${inr(result.payment.amount.total)}`, '',
      'Keep this file safe and change your password after first login.',
    ].join('\n');
    const url = URL.createObjectURL(new Blob([body], { type: 'text/plain' }));
    const a = document.createElement('a');
    a.href = url; a.download = `pragati-${result.tenant.slug}-credentials.txt`; a.click();
    URL.revokeObjectURL(url);
  };

  const downloadReceipt = () => {
    const taxes = result.payment.amount.taxes || [];
    const taxHtml = taxes.map(t => `
      <div class="row">
        <span>${t.name} ${t.rate !== undefined ? `(${t.rate}%)` : ''}</span>
        <span>${inr(t.amount)}</span>
      </div>
    `).join('');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Receipt - ${result.payment.reference}</title>
        <style>
          body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #333; line-height: 1.6; margin: 0; padding: 40px; background-color: #f9fafb; }
          .receipt-box { max-width: 650px; margin: 0 auto; background: #fff; border: 1px solid #eaeaea; padding: 48px; box-shadow: 0 10px 30px rgba(0,0,0,0.05); border-radius: 12px; }
          .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 40px; padding-bottom: 24px; border-bottom: 2px solid #f0f0f0; }
          .header-right { text-align: right; }
          .header h1 { margin: 0; color: #111; font-size: 32px; letter-spacing: -0.5px; font-weight: 800; text-transform: uppercase; }
          .logo-container { display: flex; align-items: center; gap: 16px; }
          .logo-container img { height: 56px; width: auto; object-fit: contain; }
          .logo-text { font-size: 28px; font-weight: 800; color: #f2a93b; letter-spacing: -0.5px; margin: 0; }
          .logo-sub { color: #888; font-size: 13px; margin-top: 2px; font-weight: 500; text-transform: uppercase; letter-spacing: 1px; }
          .info-section { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 40px; }
          .info-block { display: flex; flex-direction: column; }
          .info-block strong { font-size: 11px; text-transform: uppercase; color: #888; letter-spacing: 1.5px; margin-bottom: 8px; font-weight: 700; }
          .info-block .val { font-size: 15px; color: #111; font-weight: 500; }
          .info-block .sub-val { color: #666; font-size: 14px; margin-top: 4px; }
          .summary { border: 1px solid #eaeaea; border-radius: 8px; overflow: hidden; margin-bottom: 40px; }
          .summary-header { background: #f9fafb; padding: 16px 24px; border-bottom: 1px solid #eaeaea; font-weight: 700; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #555; }
          .summary-body { padding: 24px; background: #fff; }
          .row { display: flex; justify-content: space-between; margin-bottom: 16px; font-size: 15px; color: #444; }
          .row:last-child { margin-bottom: 0; }
          .row.bold { font-weight: 600; color: #111; }
          .row.total { border-top: 1px dashed #ccc; padding-top: 20px; margin-top: 20px; font-size: 20px; font-weight: 800; color: #111; }
          .footer { text-align: center; color: #888; font-size: 13px; border-top: 1px solid #eee; padding-top: 32px; }
          @media print {
            body { padding: 0; background: #fff; }
            .receipt-box { border: none; box-shadow: none; padding: 0; max-width: 100%; }
          }
        </style>
      </head>
      <body>
        <div class="receipt-box">
          <div class="header">
            <div class="logo-container">
              <img src="${window.location.origin}/techhansa-logo.png" alt="Techhansa Logo" />
              <div>
                <div class="logo-text">Pragati</div>
                <div class="logo-sub">by Techhansa</div>
              </div>
            </div>
            <div class="header-right">
              <h1>RECEIPT</h1>
              <div style="color: #666; margin-top: 6px; font-family: monospace; font-size: 14px;">#${result.payment.reference}</div>
            </div>
          </div>
          
          <div class="info-section">
            <div class="info-block">
              <strong>Billed To</strong>
              <span class="val">${result.tenant.name}</span>
              <span class="sub-val">${result.tenant.contact_email || ''}</span>
              <span class="sub-val">Workspace ID: ${result.tenant.slug}</span>
            </div>
            <div class="info-block" style="text-align: right;">
              <strong>Date Paid</strong>
              <span class="val">${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              <strong style="margin-top: 24px;">Payment Method</strong>
              <span class="val" style="text-transform: capitalize;">${result.payment.method || 'Online'}</span>
            </div>
          </div>

          <div class="summary">
            <div class="summary-header">Order Summary</div>
            <div class="summary-body">
              <div class="row bold" style="margin-bottom: 24px;">
                <span>Products Subscribed</span>
                <span>${names.join(', ')}</span>
              </div>
              <div class="row">
                <span>Subtotal</span>
                <span>${inr(result.payment.amount.subtotal)}</span>
              </div>
              ${taxHtml}
              <div class="row total">
                <span>Total Paid</span>
                <span>${inr(result.payment.amount.total)}</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <strong>Thank you for choosing Pragati.</strong><br><br>
            If you have any questions concerning this invoice, contact us at <br>support@techhansa.com.
          </div>
        </div>
        <script>
          window.onload = function() { window.print(); }
        </script>
      </body>
      </html>
    `;

    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
    } else {
      alert('Please allow popups to view and print your receipt.');
    }
  };

  return (
    <section className="lp-panel lp-success" aria-labelledby="step-done-title">
      <div className="lp-confetti" aria-hidden="true">
        {confetti.map((c) => (
          <i key={c.key} style={{ left: `${c.left}%`, background: c.color, animationDelay: `${c.delay}s`, animationDuration: `${c.dur}s`, transform: `rotate(${c.rot}deg)` }} />
        ))}
      </div>

      <div className="lp-success-badge">
        <svg viewBox="0 0 52 52"><circle cx="26" cy="26" r="24" /><path d="M14 27l8 8 16-17" /></svg>
      </div>
      <h1 id="step-done-title" className="lp-panel-title" style={{ textAlign: 'center' }}>You’re all set, {result.tenant.name.split(' ')[0]}!</h1>
      <p className="lp-panel-sub" style={{ textAlign: 'center' }}>
        Your payment was successful and your workspace is ready. Here are your login credentials.
      </p>

      <div className="lp-cred">
        <div className="lp-cred-row">
          <div><small>Username</small><code id="cred-username">{result.credentials.username}</code></div>
          <CopyButton text={result.credentials.username} label="username" />
        </div>
        <div className="lp-cred-row">
          <div>
            <small>Password</small>
            <code id="cred-password">{show ? result.credentials.password : '•'.repeat(result.credentials.password.length)}</code>
          </div>
          <div className="lp-cred-actions">
            <button type="button" className="lp-copy" onClick={() => setShow((s) => !s)} aria-label={show ? 'Hide password' : 'Show password'}>
              <span className="material-symbols-outlined">{show ? 'visibility_off' : 'visibility'}</span>
              {show ? 'Hide' : 'Show'}
            </button>
            <CopyButton text={result.credentials.password} label="password" />
          </div>
        </div>
      </div>

      <div className="lp-alert lp-alert-warn" role="note">
        <span className="material-symbols-outlined">warning</span>
        Save these credentials now — for your security the password is shown only once.
      </div>

      <div className="lp-receipt">
        <div><small>Products</small><b>{names.join(' · ')}</b></div>
        <div><small>Paid</small><b>{inr(result.payment.amount.total)}</b></div>
        <div><small>Reference</small><b>{result.payment.reference}</b></div>
      </div>

      <div className="lp-success-actions">
        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={download}>
          <span className="material-symbols-outlined">download</span> Download credentials
        </button>
        <button className="lp-btn lp-btn-primary lp-btn-lg" onClick={downloadReceipt}>
          <span className="material-symbols-outlined">receipt_long</span> Download receipt
        </button>
        <Link to="/" className="lp-btn lp-btn-ghost lp-btn-lg">
          <span className="material-symbols-outlined">home</span> Back to home
        </Link>
      </div>
    </section>
  );
}

/* ─────────────────────────────  Page  ─────────────────────────────────────── */

export default function Register() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { products, loading, error, reload } = useProducts();
  const { config, loadingConfig } = useConfig();

  const [step, setStep] = useState(0);
  const [dir, setDir] = useState('fwd');
  const [selected, setSelected] = useState(() => new Set());
  const [cycle, setCycle] = useState('monthly');
  const [form, setForm] = useState(EMPTY_FORM);
  const [slugTouched, setSlugTouched] = useState(false);
  const [slugState, setSlugState] = useState('idle');
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState('');
  const [busy, setBusy] = useState(false);
  const [order, setOrder] = useState(null);
  const [method, setMethod] = useState('card');
  const [pay, setPay] = useState({ number: '', holder: '', expiry: '', cvv: '', vpa: '', bank: '' });
  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState('');
  const [result, setResult] = useState(null);

  const preselected = useRef(false);
  const slugReq = useRef(0);

  // Pre-select the product a visitor clicked "Subscribe" on
  useEffect(() => {
    if (preselected.current || products.length === 0) return;
    preselected.current = true;
    const wanted = params.get('product');
    if (wanted && products.some((p) => p.slug === wanted)) setSelected(new Set([wanted]));
  }, [products, params]);

  useEffect(() => {
    document.title = 'Get started — Pragati';
    return () => { document.title = 'Pragati Control Plane'; };
  }, []);

  // Warn before leaving the success screen — the password is only displayed once
  useEffect(() => {
    if (!result) return;
    const h = (e) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [result]);

  useEffect(() => { window.scrollTo({ top: 0, behavior: 'smooth' }); }, [step]);

  const items = useMemo(
    () => products.map((p, i) => ({ ...p, _idx: i })).filter((p) => selected.has(p.slug)),
    [products, selected]
  );
  const amount = order && step >= 2 ? { ...order.amount, monthly: localAmount(items, 'monthly', config).monthly } : localAmount(items, cycle, config);

  const go = (n) => { setDir(n > step ? 'fwd' : 'back'); setStep(n); };

  const toggle = (slug) => {
    setOrder(null);
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(slug) ? next.delete(slug) : next.add(slug);
      return next;
    });
  };

  const setField = (k, v) => {
    setOrder(null);
    setForm((f) => {
      const next = { ...f, [k]: v };
      if (k === 'name' && !slugTouched) next.slug = slugify(v);
      return next;
    });
    setErrors((e) => ({ ...e, [k]: undefined, ...(k === 'name' ? { slug: undefined } : {}) }));
  };
  const onSlugEdit = (v) => {
    setSlugTouched(true);
    setOrder(null);
    setForm((f) => ({ ...f, slug: v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40) }));
    setErrors((e) => ({ ...e, slug: undefined }));
  };

  // Debounced workspace-ID availability check
  useEffect(() => {
    const slug = form.slug;
    if (!slug) { setSlugState('idle'); return; }
    if (!/^[a-z0-9-]{3,40}$/.test(slug)) { setSlugState('invalid'); return; }
    setSlugState('checking');
    const id = ++slugReq.current;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/slug-available?slug=${encodeURIComponent(slug)}`);
        const data = await res.json();
        if (id !== slugReq.current) return;
        setSlugState(data.available ? 'ok' : data.reason === 'invalid' ? 'invalid' : 'taken');
      } catch {
        if (id === slugReq.current) setSlugState('idle');
      }
    }, 450);
    return () => clearTimeout(t);
  }, [form.slug]);

  const next = async () => {
    setBanner('');
    if (step === 0) {
      if (selected.size === 0) return;
      return go(1);
    }
    if (step === 1) {
      const e = validateDetails(form);
      setErrors(e);
      if (Object.keys(e).length) return;
      if (slugState === 'taken' || slugState === 'invalid') return;
      if (slugState === 'checking') { setBanner('Hold on — we’re still checking your workspace ID.'); return; }
      setBusy(true);
      try {
        const res = await fetch('/api/public/register/order', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...form, products: [...selected], billing_cycle: cycle }),
        });
        const data = await res.json();
        if (!res.ok) {
          if (res.status === 409) setErrors({ slug: data.error });
          else setBanner(data.error || 'Could not start checkout.');
          return;
        }
        setOrder(data);
        setPayError('');
        go(2);
      } catch {
        setBanner('Network error. Please check your connection and try again.');
      } finally {
        setBusy(false);
      }
    }
  };

  const submitPayment = useCallback(async () => {
    if (!order || paying) return;
    setPayError('');
    setPaying(true);
    const details = method === 'card'
      ? { number: pay.number, holder: pay.holder, expiry: pay.expiry, cvv: pay.cvv }
      : method === 'upi' ? { vpa: pay.vpa } : { bank: pay.bank };
    try {
      const res = await fetch('/api/public/register/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_id: order.order_id, method, details }),
      });
      const data = await res.json();
      if (res.ok) {
        setResult(data);
        setPay({ number: '', holder: '', expiry: '', cvv: '', vpa: '', bank: '' }); // never keep card data around
        go(3);
        return;
      }
      if (data.code === 'SLUG_TAKEN') {
        setOrder(null); setErrors({ slug: data.error }); go(1); return;
      }
      if (res.status === 410) {
        setOrder(null); setBanner(data.error); go(1); return;
      }
      setPayError(data.error || 'Payment failed. Please try again.');
    } catch {
      setPayError('Network error. Your card was not charged — please try again.');
    } finally {
      setPaying(false);
    }
  }, [order, paying, method, pay]); // eslint-disable-line react-hooks/exhaustive-deps

  const canNext = step === 0 ? selected.size > 0 : step === 1 ? true : false;

  return (
    <div className="lp-root lp-reg">
      <AuroraBackground />

      <header className="lp-reg-top">
        <div className="lp-reg-top-inner" style={{ padding: '16px 48px' }}>
          <BrandLogo size={64} textSize="38px" />
          {step < 3 && (
            <button className="lp-btn lp-btn-ghost lp-btn-sm" onClick={() => navigate('/')}>
              <span className="material-symbols-outlined">close</span> Cancel
            </button>
          )}
        </div>
      </header>

      <main className="lp-container lp-reg-main">
        <Stepper step={step} />

        <div className={`lp-reg-grid${step === 3 ? ' single' : ''}`}>
          <div className={`lp-reg-left lp-slide-${dir}`} key={step}>
            {banner && (
              <div className="lp-alert" role="alert">
                <span className="material-symbols-outlined">error</span>{banner}
              </div>
            )}

            {step === 0 && (
              <StepProducts products={products} loading={loading || loadingConfig} error={error} reload={reload}
                selected={selected} toggle={toggle} cycle={cycle} setCycle={(c) => { setOrder(null); setCycle(c); }} config={config} />
            )}
            {step === 1 && (
              <StepDetails form={form} set={setField} errors={errors} onSlugEdit={onSlugEdit} slugState={slugState} />
            )}
            {step === 2 && order && (
              <StepPayment order={order} method={method} setMethod={(m) => { setPayError(''); setMethod(m); }}
                pay={pay} setPay={setPay} payError={payError} paying={paying} onSubmit={submitPayment} />
            )}
            {step === 3 && result && <StepSuccess result={result} products={products} />}

            {step < 3 && (
              <div className="lp-nav-row">
                {step > 0 ? (
                  <button className="lp-btn lp-btn-ghost" onClick={() => { setBanner(''); go(step - 1); }} disabled={paying || busy}>
                    <span className="material-symbols-outlined">arrow_back</span> Back
                  </button>
                ) : <span />}
                {step < 2 && (
                  <button id="continue-btn" className="lp-btn lp-btn-primary lp-btn-lg" onClick={next} disabled={!canNext || busy}>
                    {busy ? <><span className="lp-spinner" /> Please wait…</> : step === 0 ? <>Continue <span className="material-symbols-outlined">arrow_forward</span></> : <>Continue to payment <span className="material-symbols-outlined">arrow_forward</span></>}
                  </button>
                )}
              </div>
            )}
          </div>

          {step < 3 && <Summary items={items} cycle={cycle} amount={amount} locked={paying} config={config} />}
        </div>
      </main>

      {paying && (
        <div className="lp-overlay" role="status" aria-live="polite">
          <div className="lp-overlay-card">
            <div className="lp-rings"><i /><i /><i /><span className="material-symbols-outlined">lock</span></div>
            <b>Processing your payment…</b>
            <small>Please don’t close or refresh this page.</small>
          </div>
        </div>
      )}
    </div>
  );
}
