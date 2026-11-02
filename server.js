/**
 * server.js — CV Pro API: Firebase accounts + Firestore storage + Gemini 3.5 Flash
 *
 * ROMAN URDU:
 *  - Sign-up/sign-in Firebase karta hai (password Google ke paas rehta hai,
 *    tumhare server par nahi). Browser Firebase se "idToken" leta hai, aur
 *    yeh server usay verify kar ke ek httpOnly "session cookie" deta hai.
 *  - Us cookie ke baad purane fetch() calls bina badlaw ke chalte hain.
 *  - User ka CV + history Firestore mein "users/<uid>" document mein save hota hai.
 *  - /api/claude (AI) sirf logged-in users ke liye hai, aur roz ki limit hai.
 *
 * ZAROORI files / .env:
 *   firebase-service-account.json   (Firebase Console > Service accounts se; SECRET)
 *   GEMINI_API_KEY=...
 * Optional: DAILY_AI_LIMIT=100, CLIENT_ORIGIN=http://localhost:3000,
 *           FIREBASE_SERVICE_ACCOUNT=./path/to/file.json
 */
require('dotenv').config();
const fs           = require('fs');
const path         = require('path');
const express      = require('express');
const cors         = require('cors');
const helmet       = require('helmet');
const https        = require('https');
const { initializeApp, cert } = require('firebase-admin/app');
const { getAuth }             = require('firebase-admin/auth');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
const cookieParser = require('cookie-parser');
const { rateLimit } = require('express-rate-limit');

const PORT           = 3001;
const IS_PROD        = process.env.NODE_ENV === 'production';
const GEMINI_API_KEY = (process.env.GEMINI_API_KEY || '').trim();
const GEMINI_MODEL   = 'gemini-3.5-flash';
const DAILY_AI_LIMIT = parseInt(process.env.DAILY_AI_LIMIT, 10) || 100;
const CLIENT_ORIGIN  = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
const COOKIE_NAME    = 'cvpro_session';
const SESSION_MS     = 5 * 24 * 60 * 60 * 1000; // 5 din

// ------------------------------------------------------------ Firebase Admin
const keyPath = path.resolve(process.env.FIREBASE_SERVICE_ACCOUNT || './firebase-service-account.json');
if (!fs.existsSync(keyPath)) {
  console.error(`\n❌ Firebase key file nahi mili: ${keyPath}`);
  console.error('   Firebase Console > Project settings > Service accounts > "Generate new private key"');
  console.error('   Download hui file ko "firebase-service-account.json" naam se is folder mein rakho.\n');
  process.exit(1);
}
initializeApp({ credential: cert(JSON.parse(fs.readFileSync(keyPath, 'utf8'))) });
const db = getFirestore();
const fbAuth = getAuth();
const userDoc = (uid) => db.collection('users').doc(uid);

// -------------------------------------------------------------- middleware
const app = express();
app.use(helmet());
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json({ limit: '5mb' }));
app.use(cookieParser());

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'Too many attempts. Please wait 15 minutes and try again.' },
});
const aiLimiter = rateLimit({
  windowMs: 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false,
  message: { error: 'You are sending requests too fast. Please slow down.' },
});

async function requireAuth(req, res, next) {
  try {
    const decoded = await fbAuth.verifySessionCookie(req.cookies[COOKIE_NAME] || '', true);
    req.userId = decoded.uid;
    req.userEmail = decoded.email || '';
    req.emailVerified = !!decoded.email_verified;
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in to continue.' });
  }
}
const publicUser = (req, data) => ({
  id: req.userId, email: req.userEmail, phone: (data && data.phone) || '', emailVerified: req.emailVerified,
});

// ------------------------------------------------------------ auth routes
// Browser Firebase se sign-in kar ke idToken bhejta hai -> hum session cookie dete hain
app.post('/api/auth/session', authLimiter, async (req, res) => {
  const idToken = String(req.body.idToken || '');
  const phone = String(req.body.phone || '').trim();
  if (phone && !/^\+?[0-9 ()-]{7,20}$/.test(phone))
    return res.status(400).json({ error: 'Phone number looks invalid. Example: +92 300 1234567' });
  try {
    const decoded = await fbAuth.verifyIdToken(idToken);
    if (Date.now() / 1000 - decoded.auth_time > 5 * 60)
      return res.status(401).json({ error: 'Please sign in again.' });

    const cookie = await fbAuth.createSessionCookie(idToken, { expiresIn: SESSION_MS });
    res.cookie(COOKIE_NAME, cookie, { httpOnly: true, sameSite: 'lax', secure: IS_PROD, maxAge: SESSION_MS, path: '/' });

    const update = { email: decoded.email || '' };
    if (phone) update.phone = phone;
    const ref = userDoc(decoded.uid);
    const snap = await ref.get();
    if (!snap.exists) update.createdAt = FieldValue.serverTimestamp();
    await ref.set(update, { merge: true });

    const data = { ...(snap.exists ? snap.data() : {}), ...update };
    res.json({ user: { id: decoded.uid, email: decoded.email || '', phone: data.phone || '', emailVerified: !!decoded.email_verified } });
  } catch (e) {
    console.error('[session]', e.message);
    res.status(401).json({ error: 'Sign-in could not be verified. Please try again.' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie(COOKIE_NAME, { path: '/' });
  res.json({ ok: true });
});

app.get('/api/auth/me', requireAuth, async (req, res) => {
  try {
    const snap = await userDoc(req.userId).get();
    res.json({ user: publicUser(req, snap.exists ? snap.data() : {}) });
  } catch {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ----------------------------------------------------- saved CV (per user)
// ROMAN URDU: draft/history ko JSON "string" bana kar rakhte hain — Firestore
// nested arrays/undefined values pe error deta hai, string mein yeh masla nahi.
app.get('/api/cv', requireAuth, async (req, res) => {
  try {
    const snap = await userDoc(req.userId).get();
    const d = snap.exists ? snap.data() : {};
    res.json({
      draft: d.draftJson ? JSON.parse(d.draftJson) : null,
      history: d.historyJson ? JSON.parse(d.historyJson) : [],
    });
  } catch {
    res.status(500).json({ error: 'Could not load your CV.' });
  }
});

app.put('/api/cv', requireAuth, async (req, res) => {
  const { draft, history } = req.body || {};
  if (draft && typeof draft !== 'object') return res.status(400).json({ error: 'Invalid CV data.' });
  if (history && !Array.isArray(history)) return res.status(400).json({ error: 'Invalid history data.' });
  const draftJson = JSON.stringify(draft || null);
  const historyJson = JSON.stringify((history || []).slice(0, 20));
  if (draftJson.length + historyJson.length > 700000) return res.status(413).json({ error: 'CV data is too large.' });
  try {
    await userDoc(req.userId).set({ draftJson, historyJson, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
    res.json({ ok: true });
  } catch (e) {
    console.error('[cv save]', e.message);
    res.status(500).json({ error: 'Could not save your CV.' });
  }
});

// --------------------------------------------------------------- AI (Gemini)
app.get('/api/health', (_req, res) => {
  res.json({ server: '✅ running', model: GEMINI_MODEL, keySet: GEMINI_API_KEY.length > 10, auth: 'firebase' });
});

function looksBroken(text) { return !text.includes('{'); }

function callGemini(openaiMessages, maxTokens) {
  return new Promise((resolve, reject) => {
    if (!GEMINI_API_KEY) return reject(new Error('Gemini API key not set'));
    const body = JSON.stringify({
      model: GEMINI_MODEL, messages: openaiMessages, max_tokens: maxTokens, reasoning_effort: 'low',
    });
    const req = https.request({
      hostname: 'generativelanguage.googleapis.com', port: 443,
      path: '/v1beta/openai/chat/completions', method: 'POST',
      headers: {
        'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body),
        'Authorization': `Bearer ${GEMINI_API_KEY}`,
      },
    }, (apiRes) => {
      let raw = '';
      apiRes.on('data', (c) => (raw += c));
      apiRes.on('end', () => {
        try {
          const json = JSON.parse(raw);
          if (apiRes.statusCode !== 200) {
            const errObj = Array.isArray(json) ? json[0]?.error : json?.error;
            let msg = errObj?.message || raw.slice(0, 300);
            if (apiRes.statusCode === 402) msg = 'Gemini credits finished (402). Add credits in AI Studio > Billing.';
            console.log(`[gemini] failed (${apiRes.statusCode}):`, msg);
            return reject(new Error(msg));
          }
          const text = json?.choices?.[0]?.message?.content || '';
          if (json.usage) console.log('[gemini] tokens:', JSON.stringify(json.usage));
          if (!text.trim()) return reject(new Error('Gemini returned empty response'));
          if (looksBroken(text)) return reject(new Error('Gemini returned broken output'));
          console.log('[gemini] ✅ success');
          resolve(text);
        } catch (e) {
          console.log('[gemini] parse error:', raw.slice(0, 300));
          reject(e);
        }
      });
    });
    req.on('error', (e) => reject(e));
    req.setTimeout(45000, () => { req.destroy(); reject(new Error('timeout')); });
    req.write(body);
    req.end();
  });
}

// Roz ki limit — transaction se, taake do calls ek sath count na bigaren
async function checkAndCountUsage(uid) {
  const ref = userDoc(uid);
  return db.runTransaction(async (t) => {
    const snap = await t.get(ref);
    const data = snap.exists ? snap.data() : {};
    const today = new Date().toISOString().slice(0, 10);
    const usage = data.aiUsage && data.aiUsage.day === today ? data.aiUsage : { day: today, count: 0 };
    if (usage.count >= DAILY_AI_LIMIT) {
      return { ok: false, status: 429, error: `Daily AI limit reached (${DAILY_AI_LIMIT} requests). Please try again tomorrow.` };
    }
    t.set(ref, { aiUsage: { day: today, count: usage.count + 1 } }, { merge: true });
    return { ok: true };
  });
}

app.post('/api/claude', requireAuth, aiLimiter, async (req, res) => {
  const { messages = [], system = '', max_tokens = 4096 } = req.body;
  if (GEMINI_API_KEY.length < 10) return res.status(500).json({ error: 'GEMINI_API_KEY not set in .env file.' });
  if (!Array.isArray(messages)) return res.status(400).json({ error: 'Invalid request.' });

  const openaiMessages = [];
  if (String(system).trim()) openaiMessages.push({ role: 'system', content: String(system).trim() });
  for (const msg of messages) {
    const role = msg.role === 'assistant' ? 'assistant' : 'user';
    const content = Array.isArray(msg.content)
      ? msg.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n')
      : String(msg.content || '');
    if (content.trim()) openaiMessages.push({ role, content });
  }
  if (!openaiMessages.some((m) => m.role === 'user')) return res.status(400).json({ error: 'No user message found in request.' });

  try {
    const usage = await checkAndCountUsage(req.userId);
    if (!usage.ok) return res.status(usage.status).json({ error: usage.error });
    const text = await callGemini(openaiMessages, Math.min(Number(max_tokens) || 2000, 4096));
    res.json({ content: [{ type: 'text', text }] });
  } catch (err) {
    console.log('[AI] gemini failed:', err.message);
    res.status(502).json({ error: `The AI is currently unavailable: ${err.message}. Please wait a minute and try again.` });
  }
});

app.listen(PORT, () => {
  console.log(`\nServer chal raha hai: http://localhost:${PORT}`);
  console.log('✅ Firebase key file mil gayi');
  console.log(GEMINI_API_KEY.length > 10 ? '✅ Gemini key mil gayi' : '❌ WARNING: GEMINI_API_KEY .env mein nahi mili!');
  console.log(`ℹ️  Model: ${GEMINI_MODEL} | Daily AI limit per user: ${DAILY_AI_LIMIT}`);
});
