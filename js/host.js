/* Detective Duel — host console (laptop). Open the site with ?mode=host.
   Only a signed-in account listed under /admins can read results, pair devices or control a duel;
   the Security Rules enforce this, the screen below only reflects it. */
import { DUEL, timing, computeResult } from './duel-core.js';
import * as sync from './sync.js';

const $h = s => document.querySelector(s);
const CASE_IDS = Object.keys(DUEL_QUESTIONS);
const SLOT_NAME = { p1: 'Player 1', p2: 'Player 2' };
let user = null, code = null, duel = null, unsub = null, pairing = {}, pairUnsub = null;
let busy = false, revealing = false, shownFor = null, devicesOpen = false, caseChoice = 'random';

/* ---------- shell ---------- */
const root = document.createElement('div');
root.id = 'host'; root.className = 'host';
root.innerHTML = `<header class="h-top"><div class="h-brand"><img src="assets/icon.png" alt="" width="34" height="34"><div>DETECTIVE DUEL<small>Host console</small></div></div>
  <div class="h-right" id="hRight"></div></header>
  <main class="hc" id="hMain"></main>
  <aside class="h-drawer" id="hDrawer" aria-label="Devices"></aside><div class="h-scrim" id="hScrim"></div>
  <div class="reveal-wrap" id="revealWrap" hidden></div><div class="h-modal" id="hModal" hidden></div>`;
document.body.appendChild(root);
let lastKey = '';
// Replaces the screen; the entrance animation only plays when the screen itself changes, not on every data update.
const main = (html, key = html) => { const m = $h('#hMain'); m.innerHTML = html; m.classList.toggle('still', key === lastKey); lastKey = key; };
$h('#hScrim').onclick = () => toggleDevices(false);

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
  $h('#hRight').innerHTML = ''; delete $h('#hRight').dataset.sig;
  main(`<div class="h-card h-login"><span class="eyebrow"><i></i>Organizers only</span><h1>Host sign in</h1>
    <form id="hLogin" autocomplete="on"><label>Email<input type="email" id="hEmail" required autocomplete="username" value="${esc(email)}"></label>
    <label>Password<input type="password" id="hPass" required autocomplete="current-password"></label>
    <button class="btn green" type="submit">Sign in</button><p class="dj-err ${err ? 'on' : ''}" role="alert">${err || ''}</p></form></div>`);
  $h('#hLogin').onsubmit = async e => {
    e.preventDefault();
    const b = e.target.querySelector('button'), em = $h('#hEmail').value.trim(); b.disabled = true; b.textContent = 'Signing in…';
    try { await sync.hostSignIn(em, $h('#hPass').value); }
    catch (er) { renderLogin('Sign-in failed. Check the email and password.', em); $h('#hPass').focus(); }
  };
}
function renderNotAdmin() {
  main(`<div class="h-card h-login"><h1>Not authorized</h1><p>This account is not an organizer. Add its UID under <code>admins</code> in the database.</p>
    <p class="mono-sm">UID: ${esc(user.uid)}</p><button class="btn" id="hOut2">Sign out</button></div>`);
  $h('#hOut2').onclick = () => sync.hostSignOut();
}

/* ---------- data ---------- */
function watch(c) {
  if (unsub) { unsub(); unsub = null; }
  code = c; duel = null;
  if (!c) { render(); return; }
  unsub = sync.watchDuel(c, (d, err) => {
    if (err || !d) { duel = null; code = null; if (unsub) { unsub(); unsub = null; } render(); return; }
    duel = d; automate(); render();
  });
}
const slotOf = s => (pairing.slots || {})[s];
const online = s => !!(pairing.presence || {})[s] && !!slotOf(s);
const players = () => (duel && duel.players) || {};
const subs = () => (duel && duel.submissions) || {};
const both = o => DUEL.SLOTS.every(s => o[s]);

// Moves the state machine forward where no decision is needed.
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

/* ---------- actions ---------- */
async function newDuel() {
  const st = duel && duel.meta.state;
  if (st && !['finished', 'waiting', 'ready'].includes(st)) {
    const ok = await confirmBox('Start a new duel now?', 'The current duel will be closed and its answers discarded.', 'Close and start new');
    if (!ok) return;
  }
  await act(async () => {
    const old = code; watch(null); stopReveal();
    await sync.closeDuel(old);
    const caseId = caseChoice === 'random' ? CASE_IDS[Math.floor(Math.random() * CASE_IDS.length)] : caseChoice;
    watch(await sync.createDuel(caseId));
  });
}
async function cancelDuel() {
  const ok = await confirmBox('Cancel this duel?', 'The duel closes without a winner. Both iPads go back to waiting.', 'Cancel duel');
  if (ok) await act(async () => { const old = code; watch(null); await sync.closeDuel(old); });
}

/* ---------- devices panel ---------- */
function toggleDevices(on) { devicesOpen = on; $h('#hDrawer').classList.toggle('on', on); $h('#hScrim').classList.toggle('on', on); renderDevices(); }
function renderDevices() {
  const reqs = Object.entries(pairing.requests || {}).sort((a, b) => (a[1].at || 0) - (b[1].at || 0));
  const slotCard = s => {
    const p = slotOf(s);
    return `<div class="d-slot"><div><span class="hp-slot">${SLOT_NAME[s].toUpperCase()}</span>
      <b>${p ? (online(s) ? 'Paired · online' : 'Paired · offline') : 'No iPad paired'}</b>
      ${p ? `<small class="mono-sm">${esc(p.uid.slice(0, 8))}…</small>` : ''}</div>
      <span class="dot ${p ? (online(s) ? 'on' : 'off') : ''}"></span>
      ${p ? `<button class="link" data-unpair="${s}">Unpair</button>` : ''}</div>`;
  };
  $h('#hDrawer').innerHTML = `<div class="d-head"><h3>Devices</h3><button class="x" id="dClose" aria-label="Close">✕</button></div>
    <p class="d-help">On each iPad open<br><span class="mono-sm">${esc(location.origin + location.pathname)}?mode=player</span><br>and choose Player 1 or Player 2. Approve it here once; it then joins every duel by itself.</p>
    ${slotCard('p1')}${slotCard('p2')}
    <h4>Requests</h4>
    ${reqs.length ? reqs.map(([uid, q]) => `<div class="d-req"><div><b>${esc(q.device || 'Device')} wants ${SLOT_NAME[q.slot] || '?'}</b><small class="mono-sm">${esc(uid.slice(0, 8))}…</small></div>
      <div class="row-btns"><button class="btn green sm" data-approve="${uid}" data-slot="${q.slot}">${slotOf(q.slot) ? 'Replace' : 'Approve'}</button><button class="btn sm" data-reject="${uid}">Reject</button></div></div>`).join('')
      : '<p class="d-empty">No pending requests.</p>'}`;
  $h('#dClose').onclick = () => toggleDevices(false);
  root.querySelectorAll('[data-approve]').forEach(b => b.onclick = () => act(() => sync.approveDevice(b.dataset.approve, b.dataset.slot,
    duel && ['waiting', 'ready'].includes(duel.meta.state) ? code : null)));
  root.querySelectorAll('[data-reject]').forEach(b => b.onclick = () => act(() => sync.rejectRequest(b.dataset.reject)));
  root.querySelectorAll('[data-unpair]').forEach(b => b.onclick = async () => {
    if (await confirmBox(`Unpair ${SLOT_NAME[b.dataset.unpair]}?`, 'That iPad will need to be paired again.', 'Unpair')) act(() => sync.unpairSlot(b.dataset.unpair));
  });
}
function renderTopRight() {
  const pending = Object.keys(pairing.requests || {}).length;
  const pill = s => `<span class="dev-pill"><span class="dot ${slotOf(s) ? (online(s) ? 'on' : 'off') : ''}"></span>${s === 'p1' ? 'P1' : 'P2'}</span>`;
  const sig = pill('p1') + pill('p2') + pending, box = $h('#hRight');
  if (box.dataset.sig === sig) return;                     // unchanged: keep the buttons stable
  box.dataset.sig = sig;
  box.innerHTML = `<button class="dev-btn" id="hDev">${pill('p1')}${pill('p2')}<span>Devices</span>${pending ? `<span class="count">${pending}</span>` : ''}</button>
    <button class="btn sm ghost-w" id="hOut">Sign out</button>`;
  $h('#hDev').onclick = () => toggleDevices(!devicesOpen);
  $h('#hOut').onclick = () => { watch(null); sync.hostSignOut(); };
}

/* ---------- main screen ---------- */
function playerCard(s) {
  const p = players()[s], st = duel ? duel.meta.state : null, sub = !!subs()[s];
  let name = '—', line = '', cls = '';
  if (!slotOf(s)) { line = 'No iPad paired'; cls = 'warn'; }
  else if (!online(s) && !(sub && st !== 'playing')) { line = 'iPad offline'; cls = 'warn'; }
  if (p) name = esc(p.nickname);
  if (!cls) {
    if (!st) line = 'iPad ready';
    else if (st === 'waiting' || st === 'ready') { line = p ? 'Ready' : 'Writing a name…'; cls = p ? 'ok' : 'busy'; }
    else if (st === 'playing') { line = sub ? 'Evidence received' : 'Investigating'; cls = sub ? 'ok' : 'busy'; }
    else { line = sub ? 'Evidence received' : 'No evidence'; cls = sub ? 'ok' : 'warn'; }
  }
  return `<div class="hc-player ${cls}"><span class="hp-slot">${SLOT_NAME[s].toUpperCase()}</span><b>${name}</b>
    <span class="hc-line">${cls === 'busy' ? '<span class="dots-loader sm"><i></i><i></i><i></i></span>' : cls === 'ok' ? '✓ ' : ''}${line}</span></div>`;
}
function screen(eyebrow, l1, l2, sub, actions, extra = '') {
  return `<div class="hc-wrap"><span class="eyebrow"><i></i>${eyebrow}</span>
    <h1 class="hc-title">${l1}<span class="l2">${l2}</span></h1>${sub ? `<p class="hc-sub" id="hSub">${sub}</p>` : ''}
    ${extra}<div class="hc-players">${playerCard('p1')}${playerCard('p2')}</div>
    <div class="hc-actions">${actions}</div></div>`;
}
function render() {
  if (!user) return;
  renderTopRight(); if (devicesOpen) renderDevices();
  if (revealing) return;
  const bothPaired = slotOf('p1') && slotOf('p2'), bothOnline = online('p1') && online('p2');
  const caseSel = `<label class="hc-case">Case <select id="hCase"><option value="random">Random</option>${CASE_IDS.map(id => `<option value="${id}" ${caseChoice === id ? 'selected' : ''}>${esc(CASES.find(c => c.id === id).title)}</option>`).join('')}</select></label>`;
  let html;
  if (!code || !duel) {
    const hint = !bothPaired ? 'First pair the two iPads in Devices.' : !bothOnline ? 'One iPad is offline. Open the player page on it.' : 'Both iPads are connected.';
    html = screen('Detective Duel', 'Ready for the', 'next detectives', hint,
      `<button class="btn green big" id="hNew">New Duel</button>${!bothPaired ? '<button class="btn ghost-w" id="hDevs">Pair iPads</button>' : ''}`, caseSel);
  } else {
    const m = duel.meta, st = m.state;
    if (st === 'waiting' || st === 'ready') {
      const ready = st === 'ready' && bothOnline;
      html = screen('New case open', ready ? 'Both detectives' : 'Waiting for', ready ? 'are ready' : 'the detectives', ready ? 'Press Start when the players are ready.' : 'Players type their names on the iPads.',
        `<button class="btn green big" id="hStart" ${ready ? '' : 'disabled'}>Start Duel</button>`);
    } else if (st === 'playing') {
      if (timedOut()) {
        html = screen('Time is up', 'Evidence', 'missing', 'Nobody is declared the winner automatically. Choose how to continue.',
          `<button class="btn ghost-w" id="hRetry">Replay round</button><button class="btn green" id="hScore">Score missing as unanswered</button><button class="btn ghost-w" id="hCancel">Cancel duel</button>`);
      } else {
        const { begin, deadline } = timing(m.startAt), now = sync.serverNow();
        html = screen('Detective Duel', now < begin ? 'Opening' : 'Investigation', now < begin ? 'the envelopes…' : 'in progress', '',
          '', `<div class="hc-timer" id="hTimer" data-opened="${now < begin ? 0 : 1}">${now < begin ? '' : Math.ceil(Math.max(0, deadline - now) / 1000)}</div>`);
      }
    } else if (st === 'awaiting_results') {
      html = screen('Preparing the final verdict…', 'All evidence', 'received', '',
        `<button class="btn green big h-reveal-btn" id="hReveal">Reveal Winner</button><button class="link" id="hRevealNow">Reveal instantly</button>`);
    } else {
      const r = duel.private && duel.private.result, tag = code + ':' + m.round;
      if (r && shownFor !== tag) { shownFor = tag; showVerdict(r, false); return; }
      html = screen('Case closed', 'Ready for the', 'next detectives', 'Press New Duel. Both iPads will switch to the new case automatically.',
        `<button class="btn green big" id="hNew">New Duel</button>${r ? '<button class="btn ghost-w" id="hShow">Show verdict</button>' : '<button class="btn ghost-w" id="hReveal">Calculate result</button>'}`, caseSel);
    }
    if (['waiting', 'ready', 'playing'].includes(st) && !timedOut()) html += `<div class="hc-foot"><button class="link" id="hCancel">Cancel duel</button></div>`;
  }
  main(html, html.match(/hc-title">([^<]*)/) ? html.match(/hc-title">([^<]*)/)[1] + (timedOut() ? 'timeout' : '') : html);
  const on = (id, fn) => { const el = $h('#' + id); if (el) el.onclick = fn; };
  const sel = $h('#hCase'); if (sel) sel.onchange = () => { caseChoice = sel.value; };
  on('hNew', newDuel); on('hDevs', () => toggleDevices(true)); on('hCancel', cancelDuel);
  on('hStart', () => act(() => sync.startDuel(code, (duel.private && duel.private.caseId) || CASE_IDS[0])));
  on('hReveal', () => act(() => reveal(false))); on('hRevealNow', () => act(() => reveal(true)));
  on('hRetry', () => act(() => sync.retryRound(code, duel.meta.round)));
  on('hScore', () => act(() => sync.setState(code, 'awaiting_results', { resolved: 'missing-as-unanswered' })));
  on('hShow', () => showVerdict(duel.private.result, false));
}

/* ---------- reveal ---------- */
async function reveal(instant) {
  const caseId = (duel.private && duel.private.caseId) || duel.meta.caseId;
  const key = await sync.getAnswerKey(caseId);
  if (!Array.isArray(key) || key.length !== 3) throw new Error('The answer key is missing. Import firebase/setup-data.json (see SETUP.md).');
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
  const card = (s, lead) => `<div class="v-player${lead ? ' lead' : ''}"><span class="hp-slot">${SLOT_NAME[s].toUpperCase()}</span>
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

/* ---------- clock (local only, no polling) ---------- */
setInterval(() => {
  if (!duel || revealing || duel.meta.state !== 'playing') return;
  const t = $h('#hTimer'), { begin, deadline } = timing(duel.meta.startAt), now = sync.serverNow(), opened = now >= begin;
  if (timedOut() || !t || opened !== (t.dataset.opened === '1')) return render();
  t.textContent = opened ? Math.ceil(Math.max(0, deadline - now) / 1000) : '';
}, 250);

/* ---------- start ---------- */
if (!sync.configured) {
  main(`<div class="h-card h-login"><h1>Firebase is not configured</h1><p>Add your Firebase Web App settings to <code>js/firebase-config.js</code>, then reload. See SETUP.md.</p></div>`);
} else {
  sync.onUser(async u => {
    user = u && !u.isAnonymous ? u : null;
    stopReveal();
    if (pairUnsub) { pairUnsub(); pairUnsub = null; }
    if (!user) { watch(null); return renderLogin(); }
    if (!(await sync.isAdmin(user.uid))) { watch(null); return renderNotAdmin(); }
    pairUnsub = sync.watchPairing(p => { pairing = p; render(); });
    watch((await sync.getLiveCode().catch(() => null)) || null);
    render();
  });
}
