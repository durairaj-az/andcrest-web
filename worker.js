// Andcrest contact form API. Static pages are served by Workers assets; only /api/* runs this code.
//   POST /api/contact                    store a message in KV (binding SUBMISSIONS)
//   GET  /api/submissions?key=SECRET     list stored messages (format=json | xml | html)
// Secret: ADMIN_KEY (set with `wrangler secret put ADMIN_KEY`).

const MAX_BODY = 10 * 1024;
const LIMITS = { name: 120, email: 200, company: 160, segment: 40, message: 4000 };
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SECURITY = {
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'X-Robots-Tag': 'noindex, nofollow',
};

function json(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', ...SECURITY },
  });
}

// Local India time for the table; the stored value stays UTC (ISO 8601) in JSON and XML.
function istTime(iso) {
  return new Date(iso).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Compare secrets without leaking length or position of the first mismatch.
async function safeEqual(a, b) {
  const enc = new TextEncoder();
  const [ha, hb] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(a)),
    crypto.subtle.digest('SHA-256', enc.encode(b)),
  ]);
  const x = new Uint8Array(ha);
  const y = new Uint8Array(hb);
  let diff = 0;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ y[i];
  return diff === 0;
}

async function handleContact(request, env) {
  if (request.method !== 'POST') return json({ ok: false, error: 'Method not allowed' }, 405);

  const origin = request.headers.get('Origin');
  if (origin && new URL(origin).host !== new URL(request.url).host) {
    return json({ ok: false, error: 'Forbidden' }, 403);
  }

  const raw = await request.text();
  if (raw.length > MAX_BODY) return json({ ok: false, error: 'Message too large' }, 413);

  let body;
  try { body = JSON.parse(raw); } catch { return json({ ok: false, error: 'Invalid request' }, 400); }

  // Honeypot: real visitors never see or fill this field. Pretend success so bots move on.
  if (body.website) return json({ ok: true });

  const clean = {};
  for (const [field, max] of Object.entries(LIMITS)) {
    clean[field] = String(body[field] ?? '').trim().slice(0, max);
  }
  if (!clean.name || !clean.message || !EMAIL_RE.test(clean.email)) {
    return json({ ok: false, error: 'Please fill in your name, work email and message.' }, 400);
  }

  // One message per address per minute.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const rlKey = 'rl:' + ip;
  if (await env.SUBMISSIONS.get(rlKey)) {
    return json({ ok: false, error: 'Please wait a minute before sending another message.' }, 429);
  }
  await env.SUBMISSIONS.put(rlKey, '1', { expirationTtl: 60 });

  const now = Date.now();
  // Newest first when listed: keys sort ascending, so use a reversed timestamp.
  const id = 'msg:' + String(9999999999999 - now).padStart(13, '0') + ':' + crypto.randomUUID().slice(0, 8);
  const record = { id, receivedAt: new Date(now).toISOString(), country: request.cf?.country || '', ...clean };
  await env.SUBMISSIONS.put(id, JSON.stringify(record));
  return json({ ok: true });
}

async function handleList(request, env, url) {
  const provided = url.searchParams.get('key') || request.headers.get('Authorization')?.replace(/^Bearer\s+/i, '') || '';
  if (!env.ADMIN_KEY || !(await safeEqual(provided, env.ADMIN_KEY))) {
    return json({ ok: false, error: 'Not found' }, 404);
  }

  const limit = Math.min(Number(url.searchParams.get('limit')) || 200, 500);
  const list = await env.SUBMISSIONS.list({ prefix: 'msg:', limit, cursor: url.searchParams.get('cursor') || undefined });
  const records = (await Promise.all(list.keys.map((k) => env.SUBMISSIONS.get(k.name, 'json')))).filter(Boolean);
  // Newest first. Keys already sort that way; this keeps the order right even if one is written out of sequence.
  records.sort((a, b) => (a.receivedAt < b.receivedAt ? 1 : a.receivedAt > b.receivedAt ? -1 : 0));
  const format = url.searchParams.get('format') || 'json';

  if (format === 'xml') {
    const items = records.map((r) =>
      '  <submission>\n' + Object.entries(r).map(([k, v]) => `    <${k}>${esc(v)}</${k}>`).join('\n') + '\n  </submission>').join('\n');
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>\n<submissions count="${records.length}">\n${items}\n</submissions>\n`,
      { headers: { 'Content-Type': 'application/xml; charset=utf-8', ...SECURITY } });
  }

  if (format === 'html') {
    const rows = records.map((r) =>
      `<tr><td>${esc(istTime(r.receivedAt))}<br><small>${esc(r.receivedAt)}</small></td><td>${esc(r.name)}</td><td><a href="mailto:${esc(r.email)}">${esc(r.email)}</a></td>` +
      `<td>${esc(r.company)}</td><td>${esc(r.segment)}</td><td>${esc(r.country)}</td><td class="m">${esc(r.message)}</td></tr>`).join('');
    const page = `<!doctype html><meta charset="utf-8"><meta name="robots" content="noindex"><title>Contact submissions</title>
<style>body{font:14px/1.5 system-ui,sans-serif;margin:24px;color:#14232a}table{border-collapse:collapse;width:100%}
small{color:#64778a}th,td{border:1px solid #cfd8dc;padding:8px 10px;text-align:left;vertical-align:top}th{background:#eef3f5}.m{white-space:pre-wrap;max-width:480px}</style>
<h1>Contact submissions (${records.length}), newest first</h1>
<table><tr><th>Received (IST, UTC below)</th><th>Name</th><th>Email</th><th>Company</th><th>Industry</th><th>Country</th><th>Message</th></tr>${rows}</table>`;
    return new Response(page, { headers: { 'Content-Type': 'text/html; charset=utf-8', ...SECURITY } });
  }

  return json({ ok: true, count: records.length, nextCursor: list.list_complete ? null : list.cursor, submissions: records });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === '/api/contact') return handleContact(request, env);
    if (url.pathname === '/api/submissions') return handleList(request, env, url);
    if (url.pathname.startsWith('/api/')) return json({ ok: false, error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
};
