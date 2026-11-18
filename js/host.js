/* Detective Duel — host screen (laptop). Open the site with ?mode=host.
   Only a signed-in account listed under /admins in the database can read results or control a duel;
   the Security Rules enforce this, the screen below only reflects it. */
import { DUEL, timing, computeResult } from './duel-core.js';
import * as sync from './sync.js';

const $h = s => document.querySelector(s);
const CASE_IDS = Object.keys(DUEL_QUESTIONS);
let code = null, duel = null, unsub = null, clock = 0, user = null, revealing = false, busy = false, shownFor = null;

/* ---------- shell ---------- */
const root = document.createElement('div');
root.id = 'host'; root.className = 'host';
root.innerHTML = `<header class="h-top"><div class="h-brand"><img src="assets/icon.png" alt="" width="34" height="34"><div>DETECTIVE DUEL<small>Host console</small></div></div>
  <div class="h-user" id="hUser"></div></header><main class="h-main" id="hMain"></main>
  <div class="reveal-wrap" id="revealWrap" hidden></div><div class="h-modal" id="hModal" hidden></div>`;
document.body.appendChild(root);
const main = html => { $h('#hMain').innerHTML = html; };

function confirmBox(title, text, okLabel) {
  return new Promise(res => {
    const m = $h('#hModal'); m.hidden = false;
    m.innerHTML = `<div class="h-dialog" role="dialog" aria-modal="true"><h3>${title}</h3><p>${text}</p>
      <div class="row-btns"><button class="btn sm" id="mNo">Cancel</button><button class="btn green sm" id="mYes">${okLabel}</button></div></div>`;
    const done = v => { m.hidden = true; m.innerHTML = ''; res(v); };
    $h('#mNo').onclick = () => done(false); $h('#mYes').onclick = () => done(true); $h('#mYes').focus();
  });
}
async function act(fn) {
  if (busy) return; busy = true;
  try { await fn(); } catch (e) { flash(e && e.message ? e.message : 'Something went wrong.'); console.error(e); }
  finally { busy = false; render(); }
}
function flash(msg) { const f = document.createElement('div'); f.className = 'h-flash'; f.textContent = msg; root.appendChild(f); setTimeout(() => f.remove(), 5000); }

/* ---------- sign in ---------- */
function renderLogin(err, email = '') {
  $h('#hUser').innerHTML = '';
  main(`<div class="h-card h-login"><span class="case-tag"><i></i>ORGANIZERS ONLY</span><h1>Host sign in</h1>
    <p>Sign in with the organizer account to create and control duels.</p>
    <form id="hLogin" autocomplete="on"><label>Email<input type="email" id="hEmail" required autocomplete="username" value="${esc(email)}"></label>
    <label>Password<input type="password" id="hPass" required autocomplete="current-password"></label>
    <button class="btn green" type="submit">Sign in</button><p class="dj-err ${err ? 'on' : ''}" role="alert">${err || ''}</p></form></div>`);
  $h('#hLogin').onsubmit = async e => {
    e.preventDefault();
    const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Signing in…';
    const em = $h('#hEmail').value.trim();
    try { await sync.hostSignIn(em, $h('#hPass').value); }
    catch (er) { renderLogin('Sign-in failed. Check the email and password.', em); $h('#hPass').focus(); }
  };
}
function renderNotAdmin() {
  main(`<div class="h-card h-login"><h1>Not authorized</h1><p>This account is not an organizer for this project. Ask the project owner to add its UID under <code>admins</code> in the database.</p>
    <p class="mono-sm">UID: ${esc(user.uid)}</p><button class="btn" id="hOut2">Sign out</button></div>`);
  $h('#hOut2').onclick = () => sync.hostSignOut();
}

/* ---------- duel lifecycle ---------- */
function watch(c) {
  if (unsub) { unsub(); unsub = null; }
  code = c; duel = null;
  if (!c) { render(); return; }
  unsub = sync.watchDuel(c, (d, err) => {
    if (err || !d) { duel = null; code = null; if (unsub) { unsub(); unsub = null; } render(); return; }
    duel = d; automate(); render();
  });
}
const players = () => (duel && duel.players) || {};
const presence = () => (duel && duel.presence) || {};
const subs = () => (duel && duel.submissions) || {};
const both = o => DUEL.SLOTS.every(s => o[s]);

// Moves the state machine forward automatically where no decision is needed.
function automate() {
  if (!duel || !duel.meta || busy) return;
  const st = duel.meta.state;
  if (st === 'waiting' && both(players())) sync.setState(code, 'ready').catch(() => {});
  if (st === 'ready' && !both(players())) sync.setState(code, 'waiting').catch(() => {});
  if (st === 'playing' && both(subs())) sync.setState(code, 'awaiting_results').catch(() => {});
}
function timedOut() {
  if (!duel || duel.meta.state !== 'playing' || !duel.meta.startAt) return false;
  return sync.serverNow() > timing(duel.meta.startAt).acceptUntil && !both(subs());
}

async function createNew() {
  const sel = $h('#hCase'), pick = sel ? sel.value : 'random';
  const caseId = pick === 'random' ? CASE_IDS[Math.floor(Math.random() * CASE_IDS.length)] : pick;
  const c = await sync.createDuel(caseId);
  watch(c);
}
async function newDuel() {
  const ok = await confirmBox('Start a new duel?', 'This closes the current duel, frees both player slots and creates a new game code. Players from this duel cannot submit to the new one.', 'Close and create new');
  if (!ok) return;
  await act(async () => { const old = code; watch(null); stopReveal(); await sync.closeDuel(old); await createNew(); });
}
async function cancelDuel() {
  const ok = await confirmBox('Cancel this duel?', 'The duel is closed without a winner. You can then create a new one.', 'Cancel duel');
  if (!ok) return;
  await act(async () => { const old = code; watch(null); await sync.closeDuel(old); });
}

/* ---------- render ---------- */
function slotCard(slot) {
  const p = players()[slot], on = !!presence()[slot], st = duel.meta.state, sub = !!subs()[slot];
  let status = 'Waiting for player…', cls = 'idle';
  if (p) {
    if (st === 'playing') { status = sub ? 'Evidence received' : 'Investigating'; cls = sub ? 'ok' : 'busy'; }
    else if (['awaiting_results', 'revealing', 'finished'].includes(st)) { status = sub ? 'Evidence received' : 'No evidence submitted'; cls = sub ? 'ok' : 'warn'; }
    else { status = 'Ready'; cls = 'ok'; }
  }
  const lost = p && !on && ['waiting', 'ready', 'playing'].includes(st) && !(st === 'playing' && sub);
  return `<div class="h-player ${cls}${lost ? ' lost' : ''}">
    <div class="hp-top"><span class="hp-slot">${slot === 'p1' ? 'PLAYER 1' : 'PLAYER 2'}</span><span class="conn ${p ? (on ? 'on' : 'off') : ''}">${p ? (on ? 'Connected' : 'Disconnected') : 'Empty'}</span></div>
    <div class="hp-name">${p ? esc(p.nickname) : '—'}</div>
    <div class="hp-status">${cls === 'busy' ? '<span class="dots-loader sm"><i></i><i></i><i></i></span>' : ''}${status}</div>
    ${lost ? `<div class="hp-warn">Connection lost.${['waiting', 'ready'].includes(st) ? ` <button class="link" data-free="${slot}">Free this slot</button>` : ' Waiting for them to reconnect.'}</div>` : ''}
  </div>`;
}

function render() {
  if (revealing) return;
  if (!user) return;
  $h('#hUser').innerHTML = `<span>${esc(user.email || '')}</span><button class="btn sm ghost-w" id="hOut">Sign out</button>`;
  $h('#hOut').onclick = () => { watch(null); sync.hostSignOut(); };
  if (!code || !duel) {
    main(`<div class="h-card h-create"><span class="case-tag"><i></i>NEW DUEL</span><h1>Create a duel</h1>
      <p>Two detectives join from their iPads with a game code. Both get the same case and three questions, with 60 seconds to answer.</p>
      <label class="h-field">Case<select id="hCase"><option value="random">Random case</option>${CASE_IDS.map(id => `<option value="${id}">${esc(CASES.find(c => c.id === id).title)}</option>`).join('')}</select></label>
      <button class="btn green" id="hCreate">Create duel</button></div>`);
    $h('#hCreate').onclick = () => act(createNew);
    return;
  }
  const m = duel.meta, st = m.state, caseId = (duel.private && duel.private.caseId) || m.caseId;
  const caseTitle = caseId && CASES.find(c => c.id === caseId) ? CASES.find(c => c.id === caseId).title : '—';
  const joinUrl = location.origin + location.pathname + '?code=' + code + '#mystery';
  let center = '', actions = '';
  const allOn = DUEL.SLOTS.every(s => players()[s] && presence()[s]);

  if (st === 'waiting' || st === 'ready') {
    center = `<h2 class="h-big">${st === 'ready' ? 'Both detectives are here' : 'Waiting for detectives…'}</h2>
      <p class="h-sub">${st === 'ready' ? (allOn ? 'Press Start Duel when everyone is ready.' : 'A player is disconnected. Wait for them or free the slot.') : 'Players open the site on their iPad, go to Mystery Envelope and enter the game code.'}</p>`;
    actions = `<button class="btn green" id="hStart" ${st === 'ready' && allOn ? '' : 'disabled'}>Start Duel</button>`;
  } else if (st === 'playing') {
    const { begin, deadline } = timing(m.startAt), now = sync.serverNow();
    if (timedOut()) {
      const missing = DUEL.SLOTS.filter(s => !subs()[s]).map(s => players()[s] ? esc(players()[s].nickname) : (s === 'p1' ? 'Player 1' : 'Player 2'));
      center = `<h2 class="h-big">Time is up</h2><p class="h-sub">No evidence arrived from <b>${missing.join(' and ')}</b>. Choose how to continue. Nobody is declared the winner automatically.</p>`;
      actions = `<button class="btn" id="hRetry">Replay the round</button><button class="btn green" id="hScore">Score missing evidence as unanswered</button><button class="btn" id="hCancel">Cancel duel</button>`;
    } else {
      const left = now < begin ? '' : `${Math.ceil(Math.max(0, deadline - now) / 1000)}s left`;
      center = `<span class="case-tag"><i></i>DETECTIVE DUEL</span><h2 class="h-big">${now < begin ? 'Opening the envelopes…' : 'Investigation in Progress'}</h2>
        <p class="h-sub" id="hLeft" data-opened="${now < begin ? 0 : 1}">${left}</p>`;
    }
  } else if (st === 'awaiting_results') {
    center = `<span class="case-tag"><i></i>DETECTIVE DUEL</span><h2 class="h-big">ALL EVIDENCE RECEIVED</h2><p class="h-sub">Preparing the final verdict…</p>`;
    actions = `<button class="btn green h-reveal-btn" id="hReveal">Reveal Winner</button><button class="btn sm ghost-w" id="hRevealNow">Reveal instantly</button>`;
  } else if (st === 'revealing' || st === 'finished') {
    const r = duel.private && duel.private.result, tag = code + ':' + m.round;
    if (r && shownFor !== tag) { shownFor = tag; showVerdict(r, false); return; }
    center = r ? `<span class="case-tag"><i></i>DETECTIVE DUEL</span><h2 class="h-big">CASE CLOSED</h2><p class="h-sub">The verdict has been revealed.</p>`
               : `<h2 class="h-big">Verdict</h2><p class="h-sub">The result could not be loaded.</p>`;
    actions = r ? `<button class="btn" id="hShow">Show verdict again</button><button class="btn green" id="hNew2">New Duel</button>`
                : `<button class="btn green" id="hReveal">Calculate again</button>`;
  }

  main(`<div class="h-grid">
    <section class="h-card h-code"><span class="h-label">GAME CODE</span><div class="code-big" aria-label="Game code ${code.split('').join(' ')}">${code}</div>
      <p class="h-hint">Join at <b>Mystery Envelope → Detective Duel</b><br><span class="mono-sm">${esc(joinUrl)}</span></p>
      <div class="h-meta"><span>State: <b>${st.replace('_', ' ')}</b></span><span>Case: <b>${esc(caseTitle)}</b></span><span>Round ${m.round}</span></div></section>
    <section class="h-players">${slotCard('p1')}${slotCard('p2')}</section>
    <section class="h-card h-center">${center}<div class="h-actions">${actions}</div></section>
  </div>
  <div class="h-foot"><button class="btn sm ghost-w" id="hNew">New Duel</button>${['waiting', 'ready', 'playing'].includes(st) ? '<button class="btn sm ghost-w" id="hCancel2">Cancel duel</button>' : ''}</div>`);

  const on = (id, fn) => { const el = $h('#' + id); if (el) el.onclick = fn; };
  on('hStart', () => act(() => sync.startDuel(code, caseId)));
  on('hReveal', () => act(() => reveal(false)));
  on('hRevealNow', () => act(() => reveal(true)));
  on('hRetry', () => act(() => sync.retryRound(code, m.round)));
  on('hScore', () => act(() => sync.setState(code, 'awaiting_results', { resolved: 'missing-as-unanswered' })));
  on('hCancel', cancelDuel); on('hCancel2', cancelDuel); on('hNew', newDuel); on('hNew2', newDuel);
  on('hShow', () => showVerdict(duel.private.result, false));
  root.querySelectorAll('[data-free]').forEach(b => b.onclick = () => act(() => sync.freeSlot(code, b.dataset.free)));
}

/* ---------- reveal ---------- */
async function reveal(instant) {
  const caseId = (duel.private && duel.private.caseId) || duel.meta.caseId;
  const key = await sync.getAnswerKey(caseId);
  if (!Array.isArray(key) || key.length !== 3) throw new Error('The answer key for this case is missing. Import firebase/setup-data.json (see SETUP.md).');
  const result = computeResult(duel, key);
  await sync.saveResult(code, result);
  await sync.setState(code, 'revealing');
  shownFor = code + ':' + duel.meta.round;
  showVerdict(result, !instant);
  sync.setState(code, 'finished').catch(() => {});
}

let revealTimers = [];
function stopReveal() { revealTimers.forEach(clearTimeout); revealTimers = []; revealing = false; const w = $h('#revealWrap'); w.hidden = true; w.innerHTML = ''; }
const fmt = ms => ms == null ? '—' : (ms / 1000).toFixed(1) + 's';

function showVerdict(r, animate) {
  stopReveal();
  const reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  animate = animate && !reduce;
  const w = $h('#revealWrap'); w.hidden = false; revealing = true;
  const order = r.tie ? ['p1', 'p2'] : [r.winner, r.winner === 'p1' ? 'p2' : 'p1'];
  const card = (s, isWin) => `<div class="v-player${isWin ? ' lead' : ''}"><span class="hp-slot">${s === 'p1' ? 'PLAYER 1' : 'PLAYER 2'}</span>
    <b>${esc(r[s].nickname)}</b><div class="v-score">${r[s].score}<small>points</small></div>
    <ul><li>${r[s].correct} / 3 correct</li><li>${r[s].submitted ? 'Time ' + fmt(r[s].completionMs) : 'No evidence submitted'}</li><li>Speed bonus +${r[s].bonus}</li></ul></div>`;
  const headline = r.tie
    ? `<div class="v-winner"><span>IT’S A TIE!</span><b>${esc(r.p1.nickname)} &amp; ${esc(r.p2.nickname)}</b><p>Both detectives solved the case equally well.</p></div>`
    : `<div class="v-winner"><span>WINNER</span><b>${esc(r[r.winner].nickname)}</b><em>${r[r.winner].score} points</em><p>Brilliant detective work. The case is closed!</p></div>`;
  w.innerHTML = `<div class="reveal ${animate ? 'anim' : 'static'}" id="rev">
    <div class="r-phase r1">INVESTIGATION COMPLETE</div>
    <div class="r-phase r2">ANALYZING EVIDENCE…<div class="r-bar"><i></i></div></div>
    <div class="r-final"><div class="r-stamp">CASE CLOSED</div>${headline}
      <div class="v-cards">${r.tie ? card('p1', false) + card('p2', false) : card(order[0], true) + card(order[1], false)}</div>
      <div class="v-actions"><button class="btn green" id="vNew">New Duel</button><button class="btn sm ghost-w" id="vBack">Back to console</button></div></div>
    ${animate ? '<button class="btn sm ghost-w r-skip" id="rSkip">Reveal now</button>' : ''}</div>`;
  const rev = $h('#rev');
  const finish = () => { rev.classList.remove('anim'); rev.classList.add('static'); const sk = $h('#rSkip'); if (sk) sk.remove(); };
  if (animate) {
    revealTimers.push(setTimeout(() => rev.classList.add('p1on'), 50));
    revealTimers.push(setTimeout(() => rev.classList.add('p2on'), 1700));
    revealTimers.push(setTimeout(() => rev.classList.add('p3on'), 4300));
    revealTimers.push(setTimeout(finish, 7200));
    $h('#rSkip').onclick = () => { revealTimers.forEach(clearTimeout); finish(); };
  }
  $h('#vNew').onclick = newDuel;
  $h('#vBack').onclick = () => { stopReveal(); render(); };
}

/* ---------- start ---------- */
clearInterval(clock);
clock = setInterval(() => {
  if (!duel || revealing) return;
  if (duel.meta.state === 'playing') {
    const el = $h('#hLeft');
    const { begin, deadline } = timing(duel.meta.startAt), now = sync.serverNow();
    const opened = now >= begin;
    if (timedOut() || opened !== !!(el && el.dataset.opened === '1')) render();
    else if (el) el.textContent = opened ? `${Math.ceil(Math.max(0, deadline - now) / 1000)}s left` : '';
  }
}, 500);

if (!sync.configured) {
  main(`<div class="h-card h-login"><h1>Firebase is not configured</h1><p>Add your Firebase Web App settings to <code>js/firebase-config.js</code>, then reload this page. See SETUP.md.</p></div>`);
} else {
  sync.onUser(async u => {
    user = u && !u.isAnonymous ? u : null;
    stopReveal();
    if (!user) { watch(null); return renderLogin(); }
    if (!(await sync.isAdmin(user.uid))) { watch(null); return renderNotAdmin(); }
    const c = await sync.getCurrentCode().catch(() => null);
    watch(c || null);
    render();
  });
}
