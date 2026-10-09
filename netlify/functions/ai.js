// DunaSava CRM — AI proxy (Netlify Function)
// Firebase ID token doğrular, isteği Anthropic Messages API'ye iletir. Anahtar: ANTHROPIC_API_KEY (Netlify env).
const crypto = require('crypto');
const PROJECT = 'dunasava-ee5f9';
const MODEL = process.env.AI_MODEL || 'claude-sonnet-5-5';
let certs = null, certsAt = 0;

async function getCerts() {
  if (certs && Date.now() - certsAt < 3600e3) return certs;
  const r = await fetch('https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com');
  certs = await r.json(); certsAt = Date.now(); return certs;
}
const b64u = s => Buffer.from(s.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
async function verifyToken(token) {
  const [h, p, sig] = token.split('.');
  if (!h || !p || !sig) throw new Error('token');
  const header = JSON.parse(b64u(h).toString()); const payload = JSON.parse(b64u(p).toString());
  const cert = (await getCerts())[header.kid]; if (!cert) throw new Error('kid');
  const ok = crypto.verify('RSA-SHA256', Buffer.from(h + '.' + p), cert, b64u(sig));
  if (!ok) throw new Error('signature');
  if (payload.aud !== PROJECT || payload.iss !== 'https://securetoken.google.com/' + PROJECT) throw new Error('aud');
  if (payload.exp * 1000 < Date.now()) throw new Error('expired');
  return payload;
}
const json = (code, body) => ({ statusCode: code, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }, body: JSON.stringify(body) });

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405, { error: 'POST only' });
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return json(503, { error: 'ANTHROPIC_API_KEY tanımlı değil (Netlify → Environment variables)' });
  const auth = (event.headers.authorization || '').replace(/^Bearer\s+/i, '');
  let user;
  try { user = await verifyToken(auth); } catch (e) { return json(401, { error: 'Yetkisiz: ' + e.message }); }
  let body; try { body = JSON.parse(event.body || '{}'); } catch { return json(400, { error: 'JSON' }); }
  const { system, messages, max_tokens } = body;
  if (!Array.isArray(messages) || !messages.length) return json(400, { error: 'messages' });
  const r = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: { 'x-api-key': key, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: MODEL, max_tokens: Math.min(+max_tokens || 1500, 4000), system: String(system || '').slice(0, 200000), messages: messages.slice(-12) })
  });
  const data = await r.json();
  if (!r.ok) return json(r.status, { error: data.error?.message || 'API hatası' });
  const text = (data.content || []).filter(c => c.type === 'text').map(c => c.text).join('\n');
  return json(200, { text, usage: data.usage, user: user.email });
};
