const { onRequest } = require('firebase-functions/v2/https');
const { defineSecret, defineString } = require('firebase-functions/params');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

// Configure with:
//   firebase functions:secrets:set RESEND_API_KEY
//   (set RESEND_FROM + ALLOWED_ORIGIN as env vars in functions/.env)
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const RESEND_FROM = defineString('RESEND_FROM', {
  default: 'WLS Invoicing <onboarding@resend.dev>',
});
const ALLOWED_ORIGIN = defineString('ALLOWED_ORIGIN', { default: '*' });

function applyCors(req, res) {
  res.set('Access-Control-Allow-Origin', ALLOWED_ORIGIN.value());
  res.set('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') {
    res.status(204).send('');
    return true;
  }
  return false;
}

async function requireUser(req) {
  const header = req.get('Authorization') || '';
  const match = header.match(/^Bearer (.+)$/);
  if (!match) return null;
  try {
    return await admin.auth().verifyIdToken(match[1]);
  } catch {
    return null;
  }
}

// ---- sendReport: email the statement PDF via Resend ---------------------

exports.sendReport = onRequest({ secrets: [RESEND_API_KEY], cors: false }, async (req, res) => {
  if (applyCors(req, res)) return;
  if (req.method !== 'POST') {
    res.status(405).send('Method not allowed');
    return;
  }

  const user = await requireUser(req);
  if (!user) {
    res.status(401).send('Unauthorized');
    return;
  }

  const apiKey = RESEND_API_KEY.value();
  if (!apiKey) {
    res.status(500).send('Email is not configured (missing RESEND_API_KEY).');
    return;
  }

  const { to, message, reportNo, fromName, fileName, pdfBase64 } = req.body || {};
  if (!to || !pdfBase64) {
    res.status(400).send('Missing recipient or attachment.');
    return;
  }

  const subject = `Expense Statement #${reportNo}${fromName ? ` — ${fromName}` : ''}`;
  const html = `<p>${(message || '').replace(/\n/g, '<br/>')}</p>
    <p style="color:#6B7280;font-size:12px;margin-top:24px">
      Sent via Workplace Learning System Invoicing.
    </p>`;

  try {
    const resp = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: RESEND_FROM.value(),
        to: [to],
        subject,
        html,
        attachments: [{ filename: fileName || `statement-${reportNo}.pdf`, content: pdfBase64 }],
      }),
    });
    if (!resp.ok) {
      const text = await resp.text();
      logger.error('Resend error', text);
      res.status(502).send(`Email provider error: ${text}`);
      return;
    }
    res.status(200).json({ ok: true });
  } catch (err) {
    logger.error('sendReport failed', err);
    res.status(500).send('Failed to send email.');
  }
});

// ---- shareReport: public read-only statement by token -------------------

exports.shareReport = onRequest({ cors: false }, async (req, res) => {
  if (applyCors(req, res)) return;

  const token = String(req.query.token || '');
  if (!token) {
    res.status(400).send('Missing token.');
    return;
  }

  try {
    const shareSnap = await db.collection('shares').doc(token).get();
    if (!shareSnap.exists) {
      res.status(404).send('Not found.');
      return;
    }
    const { uid, reportId } = shareSnap.data();
    const base = db.collection('users').doc(uid);

    const [reportSnap, profileSnap, receiptsSnap, mileageSnap] = await Promise.all([
      base.collection('reports').doc(reportId).get(),
      base.collection('meta').doc('profile').get(),
      base.collection('reports').doc(reportId).collection('receipts').orderBy('createdAt').get(),
      base.collection('reports').doc(reportId).collection('mileage').orderBy('createdAt').get(),
    ]);

    if (!reportSnap.exists) {
      res.status(404).send('Not found.');
      return;
    }

    const report = reportSnap.data();
    const profile = profileSnap.exists ? profileSnap.data() : {};
    const receipts = receiptsSnap.docs.map((d) => d.data());
    const trips = mileageSnap.docs.map((d) => d.data());

    const miles = trips.reduce((s, t) => s + (Number(t.miles) || 0), 0);
    const mileageRate = (trips.find((t) => t.ratePerMile) || {}).ratePerMile || 0;
    const periodLabel =
      report.periodStart && report.periodEnd
        ? `${fmtDate(report.periodStart)} – ${fmtDate(report.periodEnd)}`
        : fmtDate(report.periodStart || report.periodEnd);

    // Return only the fields the public statement needs (no payment methods,
    // image paths, GPS paths, or internal notes beyond the statement note).
    const data = {
      profile: {
        fullName: profile.fullName || '',
        addressLine: profile.addressLine || '',
        stationId: profile.stationId || '',
        phone: profile.phone || '',
        email: profile.email || '',
        tagline: profile.tagline || '',
        remitTo: profile.remitTo || '',
      },
      reportNo: report.reportNo,
      reportDate: report.reportDate || null,
      periodLabel,
      clientName: report.clientName || '',
      clientSite: report.clientSite || '',
      laborDescription: report.laborDescription || '',
      laborDays: report.laborDays || 0,
      dayRate: report.dayRate || 0,
      laborTotal: report.laborTotal || 0,
      receiptsTotal: report.receiptsTotal || 0,
      mileageTotal: report.mileageTotal || 0,
      mileageMiles: Math.round(miles * 10) / 10,
      mileageRate,
      totalDue: report.totalDue || 0,
      notes: report.notes || '',
      receipts: receipts.map((r) => ({
        date: r.date || null,
        vendor: r.vendor || '',
        category: r.category || '',
        amount: r.amount || 0,
        notes: r.notes || '',
      })),
      trips: trips.map((t) => ({
        date: t.date || null,
        from: t.fromLabel || '',
        to: t.toLabel || '',
        miles: t.miles || 0,
        total: t.total || 0,
      })),
    };

    res.set('Cache-Control', 'public, max-age=60');
    res.status(200).json(data);
  } catch (err) {
    logger.error('shareReport failed', err);
    res.status(500).send('Failed to load statement.');
  }
});

function fmtDate(iso) {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('-');
  return `${Number(m)}/${Number(d)}/${y}`;
}
