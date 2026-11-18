/* Detective Duel — Firebase synchronization (Realtime Database + Authentication).
   Every read and write the duel makes goes through this file. Permissions are enforced by the Security Rules
   in firebase/database.rules.json, not by this code.

   Database layout
     admins/{uid}: true                      organizers (set in the console)
     answerKey/{caseId}: [n, n, n]           correct options, host-only
     pairing/requests/{uid}: {slot, at, device}  an iPad asking to become Player 1 or 2
     pairing/slots/{p1|p2}: {uid, approvedAt}    the approved iPad for each slot (host writes)
     pairing/presence/{p1|p2}: true          set by the paired iPad while it is online
     live/code                               the duel the paired iPads should follow (host writes)
     duels/{code}/meta | players | submissions | private */
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, signInAnonymously, signInWithEmailAndPassword, onAuthStateChanged, signOut }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getDatabase, ref, get, set, update, remove, onValue, onDisconnect, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { makeCode } from './duel-core.js';

export const configured = isFirebaseConfigured();
let app, auth, db, offset = 0;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  onValue(ref(db, '.info/serverTimeOffset'), s => { offset = s.val() || 0; });  // device clock vs Firebase clock
}
const r = path => ref(db, path);
export const serverNow = () => Date.now() + offset;
export const myUid = () => (auth && auth.currentUser ? auth.currentUser.uid : null);

/* ---------- connection & auth ---------- */
export function watchConnection(cb) { return onValue(r('.info/connected'), s => cb(!!s.val())); }
export function onUser(cb) { return onAuthStateChanged(auth, cb); }
export async function deviceSignIn() {           // iPads: anonymous account, kept by the browser between visits
  if (auth.currentUser) return auth.currentUser;
  return (await signInAnonymously(auth)).user;
}
export async function hostSignIn(email, password) { return (await signInWithEmailAndPassword(auth, email, password)).user; }
export function hostSignOut() { return signOut(auth); }
export async function isAdmin(uid) { try { return (await get(r(`admins/${uid}`))).val() === true; } catch (e) { return false; } }

/* ---------- iPad side ---------- */
export function watchSlots(cb) { return onValue(r('pairing/slots'), s => cb(s.val() || {}), () => cb({})); }
export function watchMyRequest(cb) { return onValue(r(`pairing/requests/${myUid()}`), s => cb(s.val()), () => cb(null)); }
export function requestSlot(slot) {
  const device = (navigator.userAgent.match(/iPad|iPhone|Android|Macintosh|Windows|Linux/) || ['Device'])[0];
  return set(r(`pairing/requests/${myUid()}`), { slot, at: serverTimestamp(), device });
}
export function cancelRequest() { return remove(r(`pairing/requests/${myUid()}`)).catch(() => {}); }

// Marks this iPad online while the page is open; Firebase removes the mark if the connection drops.
export function devicePresence(slot) {
  const pres = r(`pairing/presence/${slot}`);
  return onValue(r('.info/connected'), s => {
    if (!s.val()) return;
    onDisconnect(pres).remove().then(() => set(pres, true)).catch(() => {});
  });
}
export function watchLive(cb) { return onValue(r('live/code'), s => cb(s.val()), () => cb(null)); }
export function watchMeta(code, cb) { return onValue(r(`duels/${code}/meta`), s => cb(s.val()), () => cb(null)); }
export function watchPlayers(code, cb) { return onValue(r(`duels/${code}/players`), s => cb(s.val() || {}), () => cb({})); }
export function setReady(code, slot, nickname) {
  return set(r(`duels/${code}/players/${slot}`), { uid: myUid(), nickname, joinedAt: serverTimestamp() });
}
// One submission per player per round. The database rejects duplicates, late writes and closed duels.
export function submitAnswers(code, slot, round, answers) {
  return set(r(`duels/${code}/submissions/${slot}`), {
    uid: myUid(), round, answers: { 0: answers[0], 1: answers[1], 2: answers[2] }, submittedAt: serverTimestamp()
  });
}

/* ---------- host side ---------- */
export function watchPairing(cb) { return onValue(r('pairing'), s => cb(s.val() || {}), () => cb({})); }
export async function approveDevice(uid, slot, currentCode) {
  const pairing = (await get(r('pairing'))).val() || {};
  const changes = { [`slots/${slot}`]: { uid, approvedAt: serverTimestamp() }, [`requests/${uid}`]: null, [`presence/${slot}`]: null };
  for (const s of ['p1', 'p2']) if (s !== slot && pairing.slots && pairing.slots[s] && pairing.slots[s].uid === uid) {
    changes[`slots/${s}`] = null; changes[`presence/${s}`] = null;   // one iPad cannot hold both slots
  }
  await update(r('pairing'), changes);
  if (currentCode) await remove(r(`duels/${currentCode}/players/${slot}`)).catch(() => {}); // replaced device starts clean
}
export function rejectRequest(uid) { return remove(r(`pairing/requests/${uid}`)); }
export function unpairSlot(slot) { return update(r('pairing'), { [`slots/${slot}`]: null, [`presence/${slot}`]: null }); }

export async function getLiveCode() { return (await get(r('live/code'))).val(); }
export async function createDuel(caseId) {
  for (let i = 0; i < 20; i++) {
    const code = makeCode();
    if ((await get(r(`duels/${code}/meta`))).exists()) continue;
    await set(r(`duels/${code}`), {
      meta: { state: 'waiting', round: 1, createdAt: serverTimestamp(), hostUid: auth.currentUser.uid },
      private: { caseId }
    });
    await set(r('live/code'), code);               // paired iPads follow this automatically
    return code;
  }
  throw new Error('Could not create a new duel. Try again.');
}
export function watchDuel(code, cb) { return onValue(r(`duels/${code}`), s => cb(s.val()), e => cb(null, e)); }
export function setState(code, state, extra = {}) { return update(r(`duels/${code}/meta`), { state, ...extra }); }
export function startDuel(code, caseId) { return update(r(`duels/${code}/meta`), { state: 'playing', caseId, startAt: serverTimestamp() }); }
export async function retryRound(code, round) {
  await remove(r(`duels/${code}/submissions`));
  await update(r(`duels/${code}/meta`), { state: 'ready', round: round + 1, startAt: null, caseId: null, resolved: null });
}
export async function getAnswerKey(caseId) { return (await get(r(`answerKey/${caseId}`))).val(); }
export function saveResult(code, result) { return set(r(`duels/${code}/private/result`), result); }

// Closing marks the duel closed (late writes are rejected), then deletes it. No history is kept.
export async function closeDuel(code) {
  if (!code) return;
  try { await update(r(`duels/${code}/meta`), { state: 'closed' }); } catch (e) {}
  await remove(r(`duels/${code}`));
  const live = (await get(r('live/code'))).val();
  if (live === code) await remove(r('live/code'));
}
