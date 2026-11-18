/* Detective Duel — pure game rules (no Firebase, no DOM). Shared by player and host screens. */

export const DUEL = {
  LEAD_MS: 3000,     // countdown between "Start Duel" and the first second of play
  PLAY_MS: 60000,    // each detective has 60 seconds for the three questions
  GRACE_MS: 5000,    // extra time the database accepts for an automatic submission in transit
  QUESTIONS: 3,
  SLOTS: ['p1', 'p2']
};

export const STATES = ['waiting', 'ready', 'playing', 'awaiting_results', 'revealing', 'finished', 'closed'];

const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I, O, 0, 1
export function makeCode(rand = Math.random) {
  let c = '';
  for (let i = 0; i < 6; i++) c += CODE_ALPHABET[Math.floor(rand() * CODE_ALPHABET.length)];
  return c;
}
export const isValidCode = c => typeof c === 'string' && /^[A-HJ-NP-Z2-9]{6}$/.test(c);
export const normalizeCode = c => String(c || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);

/* Nicknames: 1–16 characters, letters, numbers, spaces, dot, dash, underscore. Same rule as the database. */
export function cleanNickname(s) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, 16);
}
export const isValidNickname = s => /^[A-Za-z0-9 ._-]{1,16}$/.test(s) && s.trim().length > 0;

/* Shared clock: every time is a server timestamp in milliseconds. */
export function timing(startAt) {
  const begin = startAt + DUEL.LEAD_MS;
  return { begin, deadline: begin + DUEL.PLAY_MS, acceptUntil: begin + DUEL.PLAY_MS + DUEL.GRACE_MS };
}

/* Score one detective from their submission and the trusted answer key.
   sub: { answers: {0:n,1:n,2:n}, submittedAt } or null when nothing arrived. */
export function scorePlayer(sub, key, startAt) {
  const { begin, deadline } = timing(startAt);
  const answers = [0, 1, 2].map(i => {
    const v = sub && sub.answers ? sub.answers[i] : undefined;
    return Number.isInteger(v) && v >= 0 && v <= 3 ? v : -1;
  });
  const correct = answers.reduce((n, a, i) => n + (a !== -1 && a === key[i] ? 1 : 0), 0);
  const submitted = !!(sub && typeof sub.submittedAt === 'number');
  const completionMs = submitted ? Math.max(0, Math.min(sub.submittedAt, deadline) - begin) : Infinity;
  const remaining = submitted ? Math.max(0, Math.min(60, Math.floor((deadline - sub.submittedAt) / 1000))) : 0;
  const bonus = correct === DUEL.QUESTIONS ? remaining * 2 : 0;
  return { answers, correct, submitted, completionMs, remaining, bonus, score: correct * 100 + bonus };
}

/* Winner: most correct answers, then fastest valid completion, otherwise a tie. */
export function decide(a, b) {
  if (a.correct !== b.correct) return { winner: a.correct > b.correct ? 'p1' : 'p2', tie: false };
  if (a.completionMs !== b.completionMs) return { winner: a.completionMs < b.completionMs ? 'p1' : 'p2', tie: false };
  return { winner: null, tie: true };
}

export function computeResult(duel, key) {
  const startAt = duel.meta.startAt;
  const subs = duel.submissions || {};
  const players = duel.players || {};
  const p1 = { ...scorePlayer(subs.p1, key, startAt), nickname: players.p1 ? players.p1.nickname : 'Player 1' };
  const p2 = { ...scorePlayer(subs.p2, key, startAt), nickname: players.p2 ? players.p2.nickname : 'Player 2' };
  const { winner, tie } = decide(p1, p2);
  const clean = p => ({ nickname: p.nickname, correct: p.correct, score: p.score, bonus: p.bonus, submitted: p.submitted,
    completionMs: Number.isFinite(p.completionMs) ? p.completionMs : null });
  return { p1: clean(p1), p2: clean(p2), winner, tie, round: duel.meta.round };
}
