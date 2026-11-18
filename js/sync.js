/* Detective Duel — Firebase synchronization (Realtime Database + Authentication).
   Every read and write the duel makes goes through this file. Permissions are enforced by the Security Rules
   in firebase/database.rules.json, not by this code. */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, onValue, onDisconnect, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/13.4.0/firebase-database.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { DUEL, makeCode } from './duel-core.js';

export const configured = isFirebaseConfigured();
let app, auth, db, offset = 0;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  // Difference between this device's clock and Firebase's clock, kept up to date.
  onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });
}

const duelRef = (code, path = '') => ref(db, `duels/${code}${path ? '/' + path : ''}`);
export const serverNow = () => Date.now() + offset;
const denied = e => e && /permission/i.test(String(e.code || e.message));

/* ---------- connection ---------- */
export function watchConnection(cb) { return onValue(ref(db, '.info/connected'), s => cb(!!s.val())); }

/* ---------- authentication ---------- */
export function onUser(cb) { return onAuthStateChanged(auth, cb); }
export async function playerSignIn() {
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}
export async function hostSignIn(email, password) { return (await signInWithEmailAndPassword(auth, email, password)).user; }
export function hostSignOut() { return signOut(auth); }
export async function isAdmin(uid) {
  try { return (await get(ref(db, `admins/${uid}`))).val() === true; } catch (e) { return false; }
}

/* ---------- player ---------- */
// Joins a free slot. Throws Error with .reason: not-found | started | full | closed | denied.
export async function joinDuel(code, nickname) {
  const user = await playerSignIn();
  const metaSnap = await get(duelRef(code, 'meta'));
  if (!metaSnap.exists()) throw Object.assign(new Error('not-found'), { reason: 'not-found' });
  const meta = metaSnap.val();
  const players = (await get(duelRef(code, 'players'))).val() || {};
  for (const slot of DUEL.SLOTS) if (players[slot] && players[slot].uid === user.uid) return { slot, uid: user.uid, rejoined: true };
  if (meta.state === 'closed') throw Object.assign(new Error('closed'), { reason: 'closed' });
  if (meta.state !== 'waiting') throw Object.assign(new Error('started'), { reason: meta.state === 'ready' ? 'full' : 'started' });
  for (const slot of DUEL.SLOTS) {
    if (players[slot]) continue;
    try {
      await set(duelRef(code, `players/${slot}`), { uid: user.uid, nickname, joinedAt: serverTimestamp() });
      return { slot, uid: user.uid, rejoined: false };
    } catch (e) { if (!denied(e)) throw e; } // someone took the slot first: try the next one
  }
  throw Object.assign(new Error('full'), { reason: 'full' });
}

export function startPresence(code, slot) {
  const pres = duelRef(code, `presence/${slot}`);
  return onValue(ref(db, '.info/connected'), s => {
    if (!s.val()) return;
    onDisconnect(pres).remove().then(() => set(pres, true)).catch(() => {});
  });
}
export function stopPresence(code, slot) { return remove(duelRef(code, `presence/${slot}`)).catch(() => {}); }
export async function leaveDuel(code, slot) {
  await stopPresence(code, slot);
  return remove(duelRef(code, `players/${slot}`)).catch(() => {});
}

export function watchMeta(code, cb) { return onValue(duelRef(code, 'meta'), s => cb(s.val()), () => cb(null)); }
export function watchPlayers(code, cb) { return onValue(duelRef(code, 'players'), s => cb(s.val() || {}), () => cb({})); }

// One submission per player per round. The database rejects duplicates, late writes and closed duels.
export async function submitAnswers(code, slot, uid, round, answers) {
  const user = auth.currentUser;
  await set(duelRef(code, `submissions/${slot}`), {
    uid: user ? user.uid : uid, round,
    answers: { 0: answers[0], 1: answers[1], 2: answers[2] },
    submittedAt: serverTimestamp()
  });
}

/* ---------- host ---------- */
export async function getCurrentCode() { return (await get(ref(db, 'hostState/currentCode'))).val(); }
export function setCurrentCode(code) { return set(ref(db, 'hostState/currentCode'), code || null); }

export async function createDuel(caseId) {
  for (let i = 0; i < 20; i++) {
    const code = makeCode();
    const exists = (await get(duelRef(code, 'meta'))).exists();
    if (exists) continue;
    await set(duelRef(code), {
      meta: { state: 'waiting', round: 1, createdAt: serverTimestamp(), hostUid: auth.currentUser.uid },
      private: { caseId }
    });
    await setCurrentCode(code);
    return code;
  }
  throw new Error('Could not create a unique code. Try again.');
}
export function watchDuel(code, cb) { return onValue(duelRef(code), s => cb(s.val()), e => cb(null, e)); }
export function setState(code, state, extra = {}) { return update(duelRef(code, 'meta'), { state, ...extra }); }
export function startDuel(code, caseId) {
  return update(duelRef(code, 'meta'), { state: 'playing', caseId, startAt: serverTimestamp() });
}
export async function retryRound(code, round) {
  await remove(duelRef(code, 'submissions'));
  await update(duelRef(code, 'meta'), { state: 'ready', round: round + 1, startAt: null, caseId: null, resolved: null });
}
export async function freeSlot(code, slot) {
  await remove(duelRef(code, `presence/${slot}`));
  await remove(duelRef(code, `players/${slot}`));
}
export async function getAnswerKey(caseId) { return (await get(ref(db, `answerKey/${caseId}`))).val(); }
export function saveResult(code, result) { return set(duelRef(code, 'private/result'), result); }

// Closing: mark as closed (late writes are rejected), then delete everything. No history is kept.
export async function closeDuel(code) {
  try { await update(duelRef(code, 'meta'), { state: 'closed' }); } catch (e) {}
  await remove(duelRef(code));
  await setCurrentCode(null);
}
