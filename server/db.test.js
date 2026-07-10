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
