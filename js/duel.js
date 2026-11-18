/* Detective Duel — player screen (iPads).
   Uses the existing Mystery Envelope look. Players never see scores, correct answers or the winner. */
import { DUEL, timing, isValidCode, normalizeCode, cleanNickname, isValidNickname } from './duel-core.js';
import * as sync from './sync.js';

const $d = s => document.querySelector(s);
const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem('duel_' + k)); } catch (e) { return null; } },
             set(k, v) { try { sessionStorage.setItem('duel_' + k, JSON.stringify(v)); } catch (e) {} },
             del(k) { try { sessionStorage.removeItem('duel_' + k); } catch (e) {} } };

let S = null;            // current session: { code, slot, uid, nickname }
let meta, players = {}, unsubs = [], tickId = 0, phase = 'join';   // meta stays undefined until the first update arrives
let picks = [-1, -1, -1], sending = false, seenMe = false;

/* ---------- views ---------- */
function soloVisible(on) {
  ['#envs', '.mbar', '#win', '.mrules'].forEach(s => { const el = $d(s); if (el) el.hidden = !on; });
  if (!on) { const c = $d('#case'); if (c) c.hidden = true; }
  $d('#duelJoin').hidden = !on;
  $d('#duelHero').hidden = on;
  if (on) $d('#duelPlay').hidden = true;
}
const roundKey = () => `${S.code}_${meta ? meta.round : 0}`;
const isSubmitted = () => !!ss.get('sent_' + roundKey());

function envelopeHTML(open) {
  return `<div class="envs one"><div class="env${open ? ' open active' : ''}" aria-hidden="true">
    <span class="env-back"></span>
    <span class="env-letter"><small>DETECTIVE DUEL</small><b>Case file</b><i></i><i></i><i></i></span>
    <span class="env-front"><span class="env-label">CASE<b>???</b></span><span class="stamp">CONFIDENTIAL</span></span>
    <span class="env-flap"></span><span class="seal">?</span></div></div>`;
}
function hero(inner) { $d('#duelHero').innerHTML = inner; }

function renderLobby() {
  phase = 'lobby'; $d('#duelPlay').hidden = true;
  const other = players[S.slot === 'p1' ? 'p2' : 'p1'];
  hero(`<div class="duel-lobby">${envelopeHTML(false)}
    <div class="dl-info"><span class="case-tag"><i></i>DUEL ${S.code}</span>
      <h2>Agent ${esc(S.nickname)}</h2>
      <p class="dl-sub">${S.slot === 'p1' ? 'Player 1' : 'Player 2'} · ${other ? `Opponent: <b>${esc(other.nickname)}</b>` : 'Waiting for your opponent…'}</p>
      <div class="scan"><span class="lens"></span><span>Waiting for the host to start the duel…</span></div>
      <p class="dl-note">When the duel starts you have <b>60 seconds</b> to read the case and answer three questions.</p>
      <button class="btn ghost-w sm" id="leaveDuel">Leave duel</button></div></div>`);
  $d('#leaveDuel').onclick = async () => { await sync.leaveDuel(S.code, S.slot); endSession('You left the duel.'); };
}

function renderCountdown(begin) {
  if (phase !== 'countdown') {
    phase = 'countdown'; $d('#duelPlay').hidden = true;
    hero(`<div class="duel-lobby">${envelopeHTML(false)}<div class="dl-info"><span class="case-tag"><i></i>DUEL ${S.code}</span>
      <h2>Get ready</h2><div class="count-num" id="countNum">3</div><p class="dl-sub">The envelope opens when the countdown ends.</p></div></div>`);
  }
  const n = Math.max(1, Math.ceil((begin - sync.serverNow()) / 1000));
  const el = $d('#countNum'); if (el && el.textContent !== String(n)) { el.textContent = n; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
}

function renderPlaying() {
  phase = 'playing';
  const c = CASES.find(x => x.id === meta.caseId), qs = DUEL_QUESTIONS[meta.caseId];
  if (!c || !qs) { hero(`<div class="submitted"><h2>Case not found</h2><p>Please tell the host.</p></div>`); return; }
  picks = ss.get('picks_' + roundKey()) || [-1, -1, -1];
  hero(`<div class="duel-lobby">${envelopeHTML(true)}<div class="dl-info"><span class="case-tag"><i></i>DUEL ${S.code} · OPEN</span>
    <h2>${esc(c.title)}</h2><p class="dl-sub">Read the case below and answer the three questions.</p></div></div>`);
  $d('#duelPlay').hidden = false;
  $d('#duelPlay').innerHTML = `<div class="wrap"><div class="stage">
    <div class="readbar duel-timer" id="dTimer"><div class="lbl">Time left<small>Unanswered questions count as incorrect.</small></div><div class="sbar"><i id="dBar"></i></div><span class="snum" id="dNum">60s</span></div>
    <div class="desk"><p class="desk-hint">Click any <span class="tap">highlighted</span> word to see what it means.</p><div class="swap">${docHTML(c)}</div></div>
    <div class="qcard duel-q">
      <div class="qtop"><div class="qhead"><span class="qpill">?</span>Investigation · 3 questions</div><span class="time">${CLOCK}<b>60</b>seconds in total</span></div>
      ${qs.map((q, i) => `<fieldset class="mcq"><legend><span class="qn">${i + 1}</span>${linkQ(q.q)}</legend><div class="opts" role="radiogroup">
        ${q.o.map((o, j) => `<button type="button" class="opt${picks[i] === j ? ' on' : ''}" role="radio" aria-checked="${picks[i] === j}" data-q="${i}" data-o="${j}"><b>${'ABCD'[j]}</b>${esc(o)}</button>`).join('')}
      </div></fieldset>`).join('')}
      <div class="qnav"><span class="answered" id="answered"></span><button class="btn green" id="submitInv">Submit investigation</button></div>
      <div id="confirmBox"></div>
    </div></div></div>`;
  $d('#duelPlay').querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (sending) return;
    const i = +b.dataset.q, j = +b.dataset.o; picks[i] = j; ss.set('picks_' + roundKey(), picks);
    b.parentElement.querySelectorAll('.opt').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    updateAnswered();
  });
  $d('#submitInv').onclick = () => {
    const left = picks.filter(p => p === -1).length;
    if (!left) return send();
    $d('#confirmBox').innerHTML = `<div class="check self"><h4>${left} question${left > 1 ? 's are' : ' is'} still unanswered</h4><p>Unanswered questions count as incorrect. Submit anyway?</p>
      <div class="row-btns"><button class="btn sm" id="cNo">Keep investigating</button><button class="btn green sm" id="cYes">Submit now</button></div></div>`;
    $d('#cNo').onclick = () => { $d('#confirmBox').innerHTML = ''; };
    $d('#cYes').onclick = send;
  };
  updateAnswered();
  setTimeout(() => $d('#duelPlay').scrollIntoView({ behavior: 'smooth', block: 'start' }), 300);
}
function updateAnswered() { const n = picks.filter(p => p !== -1).length, el = $d('#answered'); if (el) el.textContent = `${n} of 3 answered`; }
function tickPlaying(deadline) {
  const left = Math.max(0, deadline - sync.serverNow()), bar = $d('#dBar'), num = $d('#dNum');
  if (bar) bar.style.transform = `scaleX(${left / DUEL.PLAY_MS})`;
  if (num) num.textContent = Math.ceil(left / 1000) + 's';
  const t = $d('#dTimer'); if (t) t.classList.toggle('urgent', left < 10000);
  if (left <= 0 && !sending) send(true);
}

async function send(auto) {
  if (sending || isSubmitted()) return;
  sending = true;
  const btn = $d('#submitInv'); if (btn) { btn.disabled = true; btn.textContent = auto ? 'Time is up — sending…' : 'Sending…'; }
  $d('#duelPlay').querySelectorAll('.opt').forEach(b => b.disabled = true);
  try {
    await sync.submitAnswers(S.code, S.slot, S.uid, meta.round, picks);
    ss.set('sent_' + roundKey(), true);
    renderSubmitted();
  } catch (e) {
    const late = meta && meta.startAt && sync.serverNow() > timing(meta.startAt).acceptUntil;
    if (late) renderLate();
    else if (!meta || meta.state !== 'playing') renderClosedRound();      // the host already closed the investigation
    else { ss.set('sent_' + roundKey(), true); renderSubmitted(); }         // rejected as a duplicate: evidence is already stored
  } finally { sending = false; }
}

function renderSubmitted() {
  phase = 'submitted'; $d('#duelPlay').hidden = true; $d('#duelPlay').innerHTML = '';
  hero(`<div class="submitted"><div class="sub-icon"><span class="lens"></span></div>
    <span class="case-tag"><i></i>DUEL ${S.code}</span>
    <h2>INVESTIGATION SUBMITTED</h2><p>Your evidence has been sent successfully.</p><p class="muted">Please wait for the final reveal.</p>
    <div class="dots-loader" aria-hidden="true"><i></i><i></i><i></i></div></div>`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderLate() {
  phase = 'late'; $d('#duelPlay').hidden = true;
  hero(`<div class="submitted"><span class="case-tag"><i></i>DUEL ${S.code}</span><h2>TIME IS UP</h2>
    <p>Your evidence could not be delivered in time.</p><p class="muted">Please let the host know.</p></div>`);
}
function renderClosedRound() {
  phase = 'waitreveal'; $d('#duelPlay').hidden = true;
  hero(`<div class="submitted"><div class="sub-icon"><span class="lens"></span></div><span class="case-tag"><i></i>DUEL ${S.code}</span>
    <h2>INVESTIGATION CLOSED</h2><p>The investigation time has ended.</p><p class="muted">Please wait for the final reveal.</p>
    <div class="dots-loader" aria-hidden="true"><i></i><i></i><i></i></div></div>`);
}

/* ---------- state machine ---------- */
function onState() {
  if (!S || meta === undefined) return;
  if (!meta || meta.state === 'closed') return endSession('This duel has been closed by the host.');
  const mine = players && players[S.slot] && players[S.slot].uid === S.uid;
  if (mine) seenMe = true;
  else if (seenMe) return endSession('The host removed you from this duel.');
  const st = meta.state;
  if (st === 'waiting' || st === 'ready') { renderLobby(); return; }
  if (st === 'playing') {
    if (isSubmitted()) { if (phase !== 'submitted') renderSubmitted(); return; }
    const { begin, deadline } = timing(meta.startAt);
    if (sync.serverNow() < begin) renderCountdown(begin);
    else if (phase !== 'playing' && phase !== 'late') renderPlaying();
    return;
  }
  // awaiting_results, revealing, finished: never show results on the iPad
  if (isSubmitted()) { if (phase !== 'submitted') renderSubmitted(); }
  else if (phase !== 'waitreveal' && phase !== 'late') renderClosedRound();
}

function loop() {
  if (!S || !meta) return;
  if (meta.state === 'playing' && !isSubmitted()) {
    const { begin, deadline } = timing(meta.startAt);
    const now = sync.serverNow();
    if (now < begin) renderCountdown(begin);
    else { if (phase !== 'playing' && phase !== 'late' && phase !== 'submitted') renderPlaying(); if (phase === 'playing') tickPlaying(deadline); }
  }
}

async function startSession(code, nickname) {
  const res = await sync.joinDuel(code, nickname);
  const stored = (players && players[res.slot]) ? players[res.slot].nickname : nickname;
  S = { code, slot: res.slot, uid: res.uid, nickname: stored };
  ss.set('session', S);
  soloVisible(false); phase = 'join'; meta = undefined; seenMe = false;
  unsubs.push(sync.startPresence(code, res.slot));
  unsubs.push(sync.watchPlayers(code, p => { players = p; if (players[S.slot]) S.nickname = players[S.slot].nickname; onState(); }));
  unsubs.push(sync.watchMeta(code, m => { meta = m; onState(); }));
  clearInterval(tickId); tickId = setInterval(loop, 200);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function endSession(message) {
  unsubs.forEach(u => { try { u(); } catch (e) {} }); unsubs = []; clearInterval(tickId);
  ss.del('session'); S = null; meta = undefined; players = {}; phase = 'join'; picks = [-1, -1, -1]; seenMe = false;
  soloVisible(true); $d('#duelHero').innerHTML = '';
  showError(message || '');
}

/* ---------- join form ---------- */
const reasons = {
  'not-found': 'No duel uses this code. Check the code on the host screen.',
  'full': 'This duel already has two players.',
  'started': 'This duel has already started.',
  'closed': 'This duel has been closed.',
};
function showError(m) { const e = $d('#jErr'); if (e) { e.textContent = m; e.classList.toggle('on', !!m); } }

function initJoin() {
  const form = $d('#joinForm'); if (!form) return;
  const codeIn = $d('#jCode'), nameIn = $d('#jName');
  codeIn.addEventListener('input', () => { codeIn.value = normalizeCode(codeIn.value); });
  const params = new URLSearchParams(location.search);
  if (params.get('code')) codeIn.value = normalizeCode(params.get('code'));
  form.addEventListener('submit', async ev => {
    ev.preventDefault(); showError('');
    if (!sync.configured) return showError('The duel is not set up yet: the organizer must add the Firebase configuration.');
    const code = normalizeCode(codeIn.value), nick = cleanNickname(nameIn.value);
    if (!isValidCode(code)) return showError('Enter the 6-character game code.');
    if (!isValidNickname(nick)) return showError('Use 1–16 letters, numbers or spaces for your nickname.');
    const btn = form.querySelector('button'); btn.disabled = true; btn.textContent = 'Joining…';
    try { await startSession(code, nick); }
    catch (e) { showError(reasons[e.reason] || 'Could not join. Check your connection and try again.'); }
    finally { btn.disabled = false; btn.textContent = 'Join duel'; }
  });
}

/* ---------- connection banner ---------- */
function initConnection() {
  const bar = document.createElement('div'); bar.className = 'net-banner'; bar.textContent = 'Connection lost. Reconnecting…';
  document.body.appendChild(bar);
  let first = true;
  sync.watchConnection(on => { if (first && !on) { first = false; return; } first = false; bar.classList.toggle('on', !on && !!S); });
}

initJoin();
if (sync.configured) {
  initConnection();
  const saved = ss.get('session');
  if (saved && isValidCode(saved.code)) startSession(saved.code, saved.nickname).catch(() => { ss.del('session'); });
}
