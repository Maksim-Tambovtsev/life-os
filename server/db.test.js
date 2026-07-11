const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

// db.js opens the SQLite connection at require-time using DB_PATH, so point
// it at a throwaway file before requiring — keeps tests off real user data.
const tmpDbPath = path.join(os.tmpdir(), `life-os-test-${process.pid}-${Date.now()}.db`);
process.env.DB_PATH = tmpDbPath;
test.after(() => {
  fs.rmSync(tmpDbPath, { force: true });
});

const {
  saveCheckin, getAll, getLastNDays, getStreak,
  getUser, saveUser, isOnboarded, getAllUsers,
  setGoalProgress, getGoalProgressStats, getGoalStreak,
  setPendingPattern, clearPendingPattern,
  saveReflection, getLastReflection,
  createLoginToken, consumeLoginToken,
  updateProfile, setPendingWeeklyRating, saveWeeklyRating, getWeeklyRatings,
} = require('./db');

// Дата N дней назад в формате YYYY-MM-DD, как хранится в БД
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

test('saveUser + getUser round-trip with only required fields', () => {
  saveUser({ user_id: 'u1', name: 'Макс', goal_year: 'Цель', priority: 'Здоровье', onboarded: 1 });
  const user = getUser('u1');
  assert.equal(user.name, 'Макс');
  assert.equal(user.reminder_time, '21:00'); // дефолт применился
  assert.equal(user.onboarded, 1);
});

test('saveUser does not throw when optional fields are missing (regression for RangeError)', () => {
  assert.doesNotThrow(() => saveUser({ user_id: 'u2' }));
  const user = getUser('u2');
  assert.equal(user.onboarded, 0);
  assert.equal(user.name, null);
});

test('isOnboarded reflects onboarded flag', () => {
  saveUser({ user_id: 'u3', onboarded: 0 });
  assert.equal(isOnboarded('u3'), false);
  saveUser({ user_id: 'u3', onboarded: 1 });
  assert.equal(isOnboarded('u3'), true);
});

test('isOnboarded is false for unknown user', () => {
  assert.equal(isOnboarded('nope'), false);
});

test('getAllUsers returns only onboarded users', () => {
  saveUser({ user_id: 'onb1', onboarded: 1 });
  saveUser({ user_id: 'onb2', onboarded: 0 });
  const ids = getAllUsers().map((u) => u.user_id);
  assert.ok(ids.includes('onb1'));
  assert.ok(!ids.includes('onb2'));
});

test('getStreak counts only consecutive days ending today', () => {
  const userId = 'streak1';
  saveCheckin({ user_id: userId, date: daysAgo(0), sleep_hours: 7, wake_quality: 8, activity: 'нет', energy: 7, reflection: '', goal_progress: null });
  saveCheckin({ user_id: userId, date: daysAgo(1), sleep_hours: 7, wake_quality: 8, activity: 'нет', energy: 7, reflection: '', goal_progress: null });
  saveCheckin({ user_id: userId, date: daysAgo(2), sleep_hours: 7, wake_quality: 8, activity: 'нет', energy: 7, reflection: '', goal_progress: null });
  // разрыв на дне 3 — день 4 не должен войти в стрик
  saveCheckin({ user_id: userId, date: daysAgo(4), sleep_hours: 7, wake_quality: 8, activity: 'нет', energy: 7, reflection: '', goal_progress: null });

  assert.equal(getStreak(userId), 3);
});

test('getStreak is 0 without a check-in today', () => {
  const userId = 'streak2';
  saveCheckin({ user_id: userId, date: daysAgo(1), sleep_hours: 7, wake_quality: 8, activity: 'нет', energy: 7, reflection: '', goal_progress: null });
  assert.equal(getStreak(userId), 0);
});

test('getStreak is 0 for a user with no check-ins', () => {
  assert.equal(getStreak('ghost'), 0);
});

test('getAll and getLastNDays scope rows to the given user', () => {
  const userId = 'scope1';
  const other = 'scope2';
  saveCheckin({ user_id: userId, date: daysAgo(0), sleep_hours: 6, wake_quality: 5, activity: 'нет', energy: 5, reflection: '', goal_progress: null });
  saveCheckin({ user_id: other, date: daysAgo(0), sleep_hours: 9, wake_quality: 9, activity: 'зал', energy: 9, reflection: '', goal_progress: null });

  const mine = getAll(userId);
  assert.equal(mine.length, 1);
  assert.equal(mine[0].user_id, userId);

  const recent = getLastNDays(userId, 7);
  assert.equal(recent.length, 1);
});

test('setGoalProgress updates the checkin row', () => {
  const userId = 'goal1';
  const date = daysAgo(0);
  saveCheckin({ user_id: userId, date, sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 7, reflection: 'сделал шаг', goal_progress: null });
  setGoalProgress(userId, date, 1);
  const [row] = getAll(userId);
  assert.equal(row.goal_progress, 1);
});

test('getGoalStreak counts consecutive progress days from most recent, stops at gap', () => {
  const userId = 'goalstreak1';
  saveCheckin({ user_id: userId, date: daysAgo(0), sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 7, reflection: '', goal_progress: 1 });
  saveCheckin({ user_id: userId, date: daysAgo(1), sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 7, reflection: '', goal_progress: 1 });
  saveCheckin({ user_id: userId, date: daysAgo(2), sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 7, reflection: '', goal_progress: 0 });
  saveCheckin({ user_id: userId, date: daysAgo(3), sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 7, reflection: '', goal_progress: 1 });

  assert.equal(getGoalStreak(userId), 2);
});

test('getGoalProgressStats computes percentage over the window', () => {
  const userId = 'goalstats1';
  saveCheckin({ user_id: userId, date: daysAgo(0), sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 7, reflection: '', goal_progress: 1 });
  saveCheckin({ user_id: userId, date: daysAgo(1), sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 7, reflection: '', goal_progress: 0 });

  const stats = getGoalProgressStats(userId, 7);
  assert.equal(stats.total, 2);
  assert.equal(stats.withProgress, 1);
  assert.equal(stats.percentage, 50);
});

test('setPendingPattern then clearPendingPattern round-trip', () => {
  const userId = 'pattern1';
  saveUser({ user_id: userId, onboarded: 1 });
  setPendingPattern(userId, 'energy', '2026-07-08: 8, 2026-07-09: 6, 2026-07-10: 4');

  let user = getUser(userId);
  assert.equal(user.pending_pattern, 'energy');
  assert.match(user.pending_pattern_ctx, /2026-07-10/);

  clearPendingPattern(userId);
  user = getUser(userId);
  assert.equal(user.pending_pattern, null);
  assert.equal(user.pending_pattern_ctx, null);
});

test('saveReflection + getLastReflection returns most recent by date', () => {
  const userId = 'refl1';
  saveReflection({ user_id: userId, date: daysAgo(1), answers: ['вчера'], summary: 'сводка вчера' });
  saveReflection({ user_id: userId, date: daysAgo(0), answers: ['сегодня'], summary: 'сводка сегодня' });

  const last = getLastReflection(userId);
  assert.equal(last.date, daysAgo(0));
  assert.equal(last.summary, 'сводка сегодня');
});

test('getLastReflection is null when user has none', () => {
  assert.equal(getLastReflection('no-reflections'), null);
});

test('createLoginToken + consumeLoginToken round-trip returns the right user', () => {
  const userId = 'login1';
  const token = createLoginToken(userId);
  assert.equal(consumeLoginToken(token), userId);
});

test('consumeLoginToken cannot be used twice', () => {
  const token = createLoginToken('login2');
  assert.equal(consumeLoginToken(token), 'login2');
  assert.equal(consumeLoginToken(token), null);
});

test('consumeLoginToken rejects unknown tokens', () => {
  assert.equal(consumeLoginToken('does-not-exist'), null);
});

test('consumeLoginToken rejects expired tokens', () => {
  const userId = 'login3';
  const token = createLoginToken(userId);
  // токен создаётся со сроком в будущем — искусственно просрочим его напрямую в БД
  const Database = require('better-sqlite3');
  const db = new Database(tmpDbPath);
  db.prepare("UPDATE login_tokens SET expires_at = datetime('now', '-1 minute') WHERE token = ?").run(token);
  db.close();

  assert.equal(consumeLoginToken(token), null);
});

test('updateProfile updates only whitelisted provided fields', () => {
  const userId = 'prof1';
  saveUser({ user_id: userId, name: 'Имя', goal_year: 'Старая цель', onboarded: 1 });

  const changed = updateProfile(userId, {
    goal_year: 'Новая цель',
    agent_ctx_health: 'бегаю по утрам, болит колено',
    user_id: 'hacker-attempt', // не в белом списке — должно игнорироваться
    onboarded: 0,              // не в белом списке — должно игнорироваться
  });

  assert.equal(changed, true);
  const user = getUser(userId);
  assert.equal(user.goal_year, 'Новая цель');
  assert.equal(user.agent_ctx_health, 'бегаю по утрам, болит колено');
  assert.equal(user.user_id, userId);
  assert.equal(user.onboarded, 1);
});

test('updateProfile returns false when nothing editable is passed', () => {
  saveUser({ user_id: 'prof2', onboarded: 1 });
  assert.equal(updateProfile('prof2', { onboarded: 0 }), false);
});

test('weekly rating flag + save + list round-trip', () => {
  const userId = 'wr1';
  saveUser({ user_id: userId, onboarded: 1 });

  setPendingWeeklyRating(userId, true);
  assert.equal(getUser(userId).pending_weekly_rating, 1);

  saveWeeklyRating(userId, 7, 'норм неделя');
  setPendingWeeklyRating(userId, false);
  assert.equal(getUser(userId).pending_weekly_rating, 0);

  const ratings = getWeeklyRatings(userId);
  assert.equal(ratings.length, 1);
  assert.equal(ratings[0].rating, 7);
  assert.equal(ratings[0].note, 'норм неделя');
});

test('getLastNDays returns one row per date — the latest checkin wins', () => {
  const userId = 'dup1';
  const today = daysAgo(0);
  saveCheckin({ user_id: userId, date: today, sleep_hours: 7, wake_quality: 7, activity: 'нет', energy: 5, reflection: 'первый', goal_progress: null });
  saveCheckin({ user_id: userId, date: today, sleep_hours: 8, wake_quality: 9, activity: 'вело', energy: 9, reflection: 'второй', goal_progress: null });

  const days = getLastNDays(userId, 7);
  assert.equal(days.length, 1);
  assert.equal(days[0].energy, 9);
  assert.equal(days[0].reflection, 'второй');
});
