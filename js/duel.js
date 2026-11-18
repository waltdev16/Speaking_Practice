/* Detective Duel — iPad player mode. Open the site with ?mode=player.
   The iPad is paired once (Player 1 or Player 2, approved by the host). After that it follows every
   new duel automatically. Players never see scores, correct answers or the winner. */
import { DUEL, timing, cleanNickname, isValidNickname } from './duel-core.js';
import * as sync from './sync.js';

const $p = s => document.querySelector(s);
const ss = { get(k) { try { return JSON.parse(sessionStorage.getItem('pm_' + k)); } catch (e) { return null; } },
             set(k, v) { try { sessionStorage.setItem('pm_' + k, JSON.stringify(v)); } catch (e) {} } };
const SLOT_NAME = { p1: 'Player 1', p2: 'Player 2' };

let uid = null, slots = {}, myRequest = null, slotsLoaded = false, liveCode = null, liveTarget = null;
let meta, players = {}, duelUnsubs = [], presenceUnsub = null, presenceSlot = null;
let view = '', picks = [-1, -1, -1], sending = false, notice = '';

/* ---------- shell ---------- */
const root = document.createElement('div');
root.id = 'player'; root.className = 'pm';
root.innerHTML = `<header class="pm-top"><div class="h-brand"><img src="assets/icon.png" alt="" width="34" height="34"><div>DETECTIVE DUEL<small>Player device</small></div></div>
  <div class="pm-chip" id="pmChip"></div></header>
  <main class="pm-stage" id="pmMain"></main><section class="pm-play" id="pmPlay" hidden></section>
  <div class="net-banner" id="pmNet">Connection lost. Reconnecting…</div>`;
document.body.appendChild(root);
const main = (html, name) => { view = name; const m = $p('#pmMain'); m.innerHTML = html; delete m.dataset.sig; };
const mySlot = () => (uid ? ['p1', 'p2'].find(s => slots[s] && slots[s].uid === uid) : null) || null;
const roundKey = () => `${liveCode}_${meta ? meta.round : 0}`;
const isSubmitted = () => !!ss.get('sent_' + roundKey());

function envelope(cls = '') {
  return `<div class="pm-env ${cls}"><div class="env" aria-hidden="true">
    <span class="env-back"></span>
    <span class="env-letter"><small>CASE FILE</small><b>Top secret</b><i></i><i></i><i></i><em class="classified">CLASSIFIED</em></span>
    <span class="env-front"><span class="env-label">CASE<b>???</b></span><span class="stamp">CONFIDENTIAL</span></span>
    <span class="env-flap"></span><span class="seal">?</span></div></div>`;
}
function chip() {
  const s = mySlot();
  $p('#pmChip').innerHTML = s ? `<span class="dot on"></span>${SLOT_NAME[s]}` : '';
}

/* ---------- screens ---------- */
function renderChoose() {
  const sig = ['p1', 'p2'].map(s => (slots[s] ? slots[s].uid : '')).join('|') + notice;
  if (view === 'choose' && $p('#pmMain').dataset.sig === sig) return;   // nothing changed: keep the buttons stable
  const card = s => {
    const taken = slots[s] && slots[s].uid !== uid;
    return `<button class="pm-slot${taken ? ' taken' : ''}" data-slot="${s}">
      <span class="pm-slot-n">${s === 'p1' ? '1' : '2'}</span><b>${SLOT_NAME[s]}</b>
      <small>${taken ? 'Already paired. The host can replace it.' : 'Available'}</small></button>`;
  };
  main(`<div class="pm-hero"><span class="eyebrow"><i></i>Device setup</span>
    <h1>Which detective<span class="l2">is this iPad?</span></h1>
    ${notice ? `<p class="pm-notice">${esc(notice)}</p>` : '<p class="lead">Choose once. The host approves it from the laptop, and this iPad will join every new duel by itself.</p>'}
    <div class="pm-slots">${card('p1')}${card('p2')}</div></div>`, 'choose');
  $p('#pmMain').dataset.sig = sig;
  root.querySelectorAll('[data-slot]').forEach(b => b.onclick = async () => {
    b.disabled = true; notice = '';
    try { await sync.requestSlot(b.dataset.slot); } catch (e) { notice = 'Could not send the request. Check the connection.'; renderChoose(); }
  });
}
function renderPending() {
  main(`<div class="pm-hero center"><div class="radar"><span></span><span></span><span class="lens"></span></div>
    <span class="eyebrow"><i></i>Waiting for approval</span>
    <h1>${SLOT_NAME[myRequest.slot]}<span class="l2">request sent</span></h1>
    <p class="lead">Ask the host to approve this iPad on the laptop (Devices).</p>
    <button class="btn ghost-w sm" id="pmCancel">Choose again</button></div>`, 'pending');
  $p('#pmCancel').onclick = () => sync.cancelRequest();
}
function renderIdle() {
  if (view === 'idle') return;
  hidePlay();
  main(`<div class="pm-hero center">${envelope('float')}
    <span class="eyebrow"><i></i>Ready for duty</span>
    <h1>Waiting for<span class="l2">the next case</span></h1>
    <p class="lead">This iPad is ${SLOT_NAME[mySlot()]}. A new duel will appear here automatically.</p></div>`, 'idle');
}
function renderPrep() {
  if (view === 'prep') return;
  hidePlay();
  main(`<div class="pm-hero center">${envelope('float')}
    <span class="eyebrow"><i></i>New case · ${SLOT_NAME[mySlot()]}</span>
    <h1>Detective,<span class="l2">what’s your name?</span></h1>
    <form class="pm-name" id="pmName" autocomplete="off" novalidate>
      <input id="pmNick" maxlength="16" placeholder="Your name" aria-label="Your name" spellcheck="false" autocomplete="off">
      <button class="btn green" type="submit">I’m ready</button></form>
    <p class="dj-err" id="pmErr" role="alert"></p>
    <p class="pm-note">60 seconds · 3 questions · read the case fast</p></div>`, 'prep');
  $p('#pmName').onsubmit = async e => {
    e.preventDefault();
    const nick = cleanNickname($p('#pmNick').value), err = $p('#pmErr');
    if (!isValidNickname(nick)) { err.textContent = 'Use 1–16 letters, numbers or spaces (no accents).'; err.classList.add('on'); return; }
    const b = e.target.querySelector('button'); b.disabled = true; b.textContent = 'Saving…';
    try { await sync.setReady(liveCode, mySlot(), nick); }
    catch (er) { err.textContent = 'Could not save. The duel may have started already.'; err.classList.add('on'); b.disabled = false; b.textContent = 'I’m ready'; }
  };
  setTimeout(() => { const i = $p('#pmNick'); if (i) i.focus(); }, 300);
}
function renderLobby() {
  hidePlay();
  const me = players[mySlot()], other = players[mySlot() === 'p1' ? 'p2' : 'p1'];
  const html = `<div class="pm-hero center">${envelope('float')}
    <span class="eyebrow"><i></i>${SLOT_NAME[mySlot()]}</span>
    <h1>Agent ${esc(me.nickname)}<span class="l2">is ready</span></h1>
    <div class="pm-status"><span class="lens"></span><span>${other ? `${esc(other.nickname)} is ready too. Waiting for the host…` : 'Waiting for your opponent…'}</span></div></div>`;
  const sig = me.nickname + '|' + (other ? other.nickname : '');
  if (view !== 'lobby' || $p('#pmMain').dataset.sig !== sig) { main(html, 'lobby'); $p('#pmMain').dataset.sig = sig; }
}
function renderCountdown(begin) {
  if (view !== 'countdown') {
    hidePlay();
    main(`<div class="pm-hero center">${envelope('shake')}
      <span class="eyebrow"><i></i>The case is about to open</span>
      <div class="count-num" id="pmCount">3</div></div>`, 'countdown');
  }
  const n = Math.max(1, Math.ceil((begin - sync.serverNow()) / 1000)), el = $p('#pmCount');
  if (el && el.textContent !== String(n)) { el.textContent = n; el.classList.remove('pulse'); void el.offsetWidth; el.classList.add('pulse'); }
}
function renderOpening() {
  view = 'opening';
  const env = root.querySelector('.pm-env');
  if (env) { env.classList.remove('shake'); env.querySelector('.env').classList.add('open'); env.classList.add('opened'); }
  const c = $p('#pmCount'); if (c) { c.textContent = 'GO!'; c.classList.add('go'); }
  setTimeout(() => { if (view === 'opening') renderPlaying(); }, 1300);
}
function hidePlay() { const p = $p('#pmPlay'); p.hidden = true; p.innerHTML = ''; }

function renderPlaying() {
  const c = CASES.find(x => x.id === meta.caseId), qs = DUEL_QUESTIONS[meta.caseId];
  if (!c || !qs) { main(`<div class="pm-hero center"><h1>Case not found</h1><p class="lead">Please tell the host.</p></div>`, 'error'); return; }
  view = 'playing';
  picks = ss.get('picks_' + roundKey()) || [-1, -1, -1];
  main(`<div class="pm-mini"><span class="eyebrow"><i></i>Case open · ${SLOT_NAME[mySlot()]}</span><h2>${esc(c.title)}</h2></div>`, 'playing');
  const play = $p('#pmPlay'); play.hidden = false;
  play.innerHTML = `<div class="wrap"><div class="stage">
    <div class="readbar duel-timer" id="dTimer"><div class="lbl">Time left<small>Unanswered questions count as incorrect.</small></div><div class="sbar"><i id="dBar"></i></div><span class="snum" id="dNum">60s</span></div>
    <div class="desk scan-in"><p class="desk-hint">Tap any <span class="tap">highlighted</span> word to see what it means.</p><div class="swap">${docHTML(c)}</div><span class="scanline"></span></div>
    <div class="qcard duel-q">
      <div class="qtop"><div class="qhead"><span class="qpill">?</span>Investigation · 3 questions</div><span class="answered" id="answered"></span></div>
      ${qs.map((q, i) => `<fieldset class="mcq" style="--d:${200 + i * 120}ms"><legend><span class="qn">${i + 1}</span>${linkQ(q.q)}</legend><div class="opts" role="radiogroup">
        ${q.o.map((o, j) => `<button type="button" class="opt${picks[i] === j ? ' on' : ''}" role="radio" aria-checked="${picks[i] === j}" data-q="${i}" data-o="${j}"><b>${'ABCD'[j]}</b>${esc(o)}</button>`).join('')}
      </div></fieldset>`).join('')}
      <div class="qnav"><span></span><button class="btn green" id="submitInv">Submit investigation</button></div>
      <div id="confirmBox"></div></div></div></div>`;
  play.querySelectorAll('.opt').forEach(b => b.onclick = () => {
    if (sending) return;
    const i = +b.dataset.q, j = +b.dataset.o; picks[i] = j; ss.set('picks_' + roundKey(), picks);
    b.parentElement.querySelectorAll('.opt').forEach(x => { const on = x === b; x.classList.toggle('on', on); x.setAttribute('aria-checked', on); });
    updateAnswered();
  });
  $p('#submitInv').onclick = () => {
    const left = picks.filter(p => p === -1).length;
    if (!left) return send();
    $p('#confirmBox').innerHTML = `<div class="check self"><h4>${left} question${left > 1 ? 's are' : ' is'} still unanswered</h4><p>Unanswered questions count as incorrect. Submit anyway?</p>
      <div class="row-btns"><button class="btn sm" id="cNo">Keep investigating</button><button class="btn green sm" id="cYes">Submit now</button></div></div>`;
    $p('#cNo').onclick = () => { $p('#confirmBox').innerHTML = ''; };
    $p('#cYes').onclick = () => send();
  };
  updateAnswered();
  window.scrollTo({ top: 0 });
}
function updateAnswered() { const n = picks.filter(p => p !== -1).length, el = $p('#answered'); if (el) el.textContent = `${n} of 3 answered`; }
function tickPlaying(deadline) {
  const left = Math.max(0, deadline - sync.serverNow()), bar = $p('#dBar'), num = $p('#dNum');
  if (bar) bar.style.transform = `scaleX(${left / DUEL.PLAY_MS})`;
  if (num) num.textContent = Math.ceil(left / 1000) + 's';
  const t = $p('#dTimer'); if (t) t.classList.toggle('urgent', left < 10000);
  if (left <= 0 && !sending) send(true);
}
async function send(auto) {
  if (sending || isSubmitted()) return;
  sending = true;
  const btn = $p('#submitInv'); if (btn) { btn.disabled = true; btn.textContent = auto ? 'Time is up. Sending…' : 'Sending…'; }
  root.querySelectorAll('.opt').forEach(b => b.disabled = true);
  try {
    await sync.submitAnswers(liveCode, mySlot(), meta.round, picks);
    ss.set('sent_' + roundKey(), true); renderSubmitted();
  } catch (e) {
    const late = meta && meta.startAt && sync.serverNow() > timing(meta.startAt).acceptUntil;
    if (late) renderMessage('TIME IS UP', 'Your evidence could not be delivered in time.', 'Please let the host know.');
    else if (!meta || meta.state !== 'playing') renderClosedRound();
    else { ss.set('sent_' + roundKey(), true); renderSubmitted(); }  // rejected as a duplicate: evidence is already stored
  } finally { sending = false; }
}
function renderSubmitted() {
  if (view === 'submitted') return;
  hidePlay();
  main(`<div class="pm-hero center"><div class="folder"><span class="folder-tab"></span><span class="folder-body"><i></i><i></i><i></i></span><span class="evidence-stamp">EVIDENCE SENT</span></div>
    <h1 class="pm-sub-title">INVESTIGATION SUBMITTED</h1><p class="lead">Awaiting Final Results</p>
    <div class="dots-loader" aria-hidden="true"><i></i><i></i><i></i></div></div>`, 'submitted');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}
function renderClosedRound() { renderMessage('INVESTIGATION CLOSED', 'The investigation time has ended.', 'Awaiting Final Results'); }
function renderMessage(title, line1, line2) {
  if (view === 'msg:' + title) return;
  hidePlay();
  main(`<div class="pm-hero center"><div class="radar"><span></span><span></span><span class="lens"></span></div>
    <h1 class="pm-sub-title">${title}</h1><p class="lead">${line1}</p><p class="pm-note">${line2}</p></div>`, 'msg:' + title);
}

/* ---------- state machine ---------- */
function update() {
  chip();
  if (!uid || !slotsLoaded) return;
  const slot = mySlot();
  if (!slot) {
    stopPresence(); followDuel(null);
    return myRequest && myRequest.slot ? renderPending() : renderChoose();
  }
  if (presenceSlot !== slot) { stopPresence(); presenceSlot = slot; presenceUnsub = sync.devicePresence(slot); }
  if (liveTarget !== liveCode) followDuel(liveTarget);
  if (!liveCode || meta === null || (meta && meta.state === 'closed')) return renderIdle();
  if (meta === undefined) return;
  const mine = players[slot] && players[slot].uid === uid, st = meta.state;
  if (st === 'waiting' || st === 'ready') return mine ? renderLobby() : renderPrep();
  if (st === 'playing') {
    if (!mine) return renderMessage('DUEL IN PROGRESS', 'This round started without this iPad.', 'Wait for the next case.');
    if (isSubmitted()) return renderSubmitted();
    const { begin } = timing(meta.startAt);
    if (sync.serverNow() < begin) return renderCountdown(begin);
    if (view === 'countdown') return renderOpening();
    if (view !== 'playing' && view !== 'opening' && !view.startsWith('msg:')) renderPlaying();
    return;
  }
  if (!mine) return renderIdle();
  return isSubmitted() ? renderSubmitted() : renderClosedRound();   // results are never shown here
}
function followDuel(code) {
  if (code === liveCode && (code === null || duelUnsubs.length)) return;
  duelUnsubs.forEach(u => u()); duelUnsubs = [];
  liveCode = code; meta = code ? undefined : null; players = {}; picks = [-1, -1, -1];
  if (code) {
    duelUnsubs.push(sync.watchMeta(code, m => { meta = m; update(); }));
    duelUnsubs.push(sync.watchPlayers(code, p => { players = p; update(); }));
  }
}
function stopPresence() { if (presenceUnsub) { presenceUnsub(); presenceUnsub = null; } presenceSlot = null; }

// Local clock for the countdown and the 60-second timer (no database polling).
setInterval(() => {
  if (!meta || meta.state !== 'playing' || !mySlot() || isSubmitted()) return;
  const { begin, deadline } = timing(meta.startAt), now = sync.serverNow();
  if (now < begin) renderCountdown(begin);
  else if (view === 'countdown') renderOpening();
  else if (view === 'playing') tickPlaying(deadline);
  else if (view !== 'opening' && !view.startsWith('msg:') && view !== 'submitted') update();
}, 200);

/* ---------- start ---------- */
if (!sync.configured) {
  main(`<div class="pm-hero center"><h1>Not set up yet</h1><p class="lead">The organizer must add the Firebase configuration (see SETUP.md).</p></div>`, 'error');
} else {
  main(`<div class="pm-hero center"><div class="radar"><span></span><span></span><span class="lens"></span></div><p class="lead">Connecting…</p></div>`, 'connecting');
  sync.deviceSignIn().then(user => {
    uid = user.uid;
    let hadSlot = false;
    sync.watchSlots(s => {
      slots = s; slotsLoaded = true;
      const now = !!mySlot();
      if (hadSlot && !now) notice = 'The host unpaired this iPad. Choose a player again.';
      hadSlot = now; update();
    });
    sync.watchMyRequest(req => { myRequest = req; update(); });
    sync.watchLive(code => { liveTarget = code || null; update(); });
    let first = true;
    sync.watchConnection(on => { if (first && !on) { first = false; return; } first = false; $p('#pmNet').classList.toggle('on', !on); });
  }).catch(() => main(`<div class="pm-hero center"><h1>Could not connect</h1><p class="lead">Check that Anonymous sign-in is enabled in Firebase and that the iPad is online, then reload.</p></div>`, 'error'));
}
