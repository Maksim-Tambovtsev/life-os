const Database = require('better-sqlite3');
const path = require('path');

const dbPath = process.env.DB_PATH || './checkins.db';
const db = new Database(dbPath);

// Таблица чек-инов
db.exec(`
  CREATE TABLE IF NOT EXISTS checkins (
    id           INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id      TEXT    NOT NULL,
    date         TEXT    NOT NULL,
    sleep_hours  REAL,
    wake_quality INTEGER,
    activity     TEXT,
    energy       INTEGER,
    reflection   TEXT,
    goal_progress INTEGER, -- прогресс по годовой цели 1-10, опционально
    created_at   TEXT DEFAULT (datetime('now'))
  )
`);

// Таблица профилей пользователей (онбординг)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    user_id       TEXT PRIMARY KEY,
    name          TEXT,
    goal_year     TEXT,    -- главная цель на год
    priority      TEXT,    -- здоровье / продуктивность / баланс
    reminder_time TEXT DEFAULT '21:00',
    onboarded     INTEGER DEFAULT 0, -- 0=нет, 1=да
    last_tomorrow_plan TEXT,
    created_at    TEXT DEFAULT (datetime('now'))
  )
`);

// Таблица рефлексий
 db.exec(`
   CREATE TABLE IF NOT EXISTS reflections (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id TEXT NOT NULL,
     date TEXT NOT NULL,
     answers TEXT NOT NULL,
     summary TEXT,
     created_at TEXT DEFAULT (datetime('now'))
   )
 `);

// Добавляем goal_progress в существующую таблицу, если колонки ещё нет
// (для пользователей, у которых БД уже создана без этого поля)
try {
  db.exec('ALTER TABLE checkins ADD COLUMN goal_progress INTEGER');
} catch (_) { /* колонка уже существует — ок */ }

try {
  db.exec('ALTER TABLE users ADD COLUMN last_tomorrow_plan TEXT');
} catch (_) { /* колонка уже существует — ок */ }

// ─── Checkins ─────────────────────────────────────────────────────────────────

function saveCheckin(obj) {
  const stmt = db.prepare(`
    INSERT INTO checkins
      (user_id, date, sleep_hours, wake_quality, activity, energy, reflection, goal_progress)
    VALUES
      (@user_id, @date, @sleep_hours, @wake_quality, @activity, @energy, @reflection, @goal_progress)
  `);
  return stmt.run(obj);
}

function getAll(userId) {
  return db.prepare(
    'SELECT * FROM checkins WHERE user_id = ? ORDER BY date DESC'
  ).all(userId);
}

function saveReflection(obj) {
  const stmt = db.prepare(`
    INSERT INTO reflections (user_id, date, answers, summary)
    VALUES (@user_id, @date, @answers, @summary)
  `);
  return stmt.run({
    ...obj,
    answers: typeof obj.answers === 'string' ? obj.answers : JSON.stringify(obj.answers),
  });
}

function getLastReflection(userId) {
  return db.prepare('SELECT * FROM reflections WHERE user_id = ? ORDER BY date DESC LIMIT 1').get(userId) || null;
}

function getLastNDays(userId, n) {
  return db.prepare(`
    SELECT * FROM checkins
    WHERE user_id = ?
      AND date >= date('now', '-' || ? || ' days')
    ORDER BY date ASC
  `).all(userId, n - 1);
}

function getStreak(userId) {
  const rows = db.prepare(`
    SELECT DISTINCT date FROM checkins
    WHERE user_id = ?
    ORDER BY date DESC
  `).all(userId);

  if (!rows.length) return 0;

  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let expected = today;

  for (const row of rows) {
    if (row.date === expected) {
      streak += 1;
      const d = new Date(expected);
      d.setDate(d.getDate() - 1);
      expected = d.toISOString().slice(0, 10);
    } else {
      break;
    }
  }

  return streak;
}

// ─── Users ────────────────────────────────────────────────────────────────────

function getUser(userId) {
  return db.prepare('SELECT * FROM users WHERE user_id = ?').get(userId) || null;
}

// Создаёт или обновляет профиль (INSERT OR REPLACE сохраняет created_at при апдейте)
function saveUser(obj) {
  const stmt = db.prepare(`
    INSERT INTO users (user_id, name, goal_year, priority, reminder_time, onboarded, last_tomorrow_plan)
    VALUES (@user_id, @name, @goal_year, @priority, @reminder_time, @onboarded, @last_tomorrow_plan)
    ON CONFLICT(user_id) DO UPDATE SET
      name              = excluded.name,
      goal_year         = excluded.goal_year,
      priority          = excluded.priority,
      reminder_time     = excluded.reminder_time,
      onboarded         = excluded.onboarded,
      last_tomorrow_plan = excluded.last_tomorrow_plan
  `);
  return stmt.run(obj);
}

function isOnboarded(userId) {
  const user = getUser(userId);
  return user ? user.onboarded === 1 : false;
}

// Все пользователи прошедшие онбординг (для cron-задач)
function getAllUsers() {
  return db.prepare('SELECT * FROM users WHERE onboarded = 1').all();
}

// Обновляет goal_progress у конкретного чек-ина после анализа рефлексии
function setGoalProgress(userId, date, value) {
  db.prepare(
    'UPDATE checkins SET goal_progress = ? WHERE user_id = ? AND date = ?'
  ).run(value, userId, date);
}

// Статистика прогресса к цели за последние n дней
function getGoalProgressStats(userId, n) {
  const days = getLastNDays(userId, n);
  const total = days.length;
  const withProgress = days.filter((d) => d.goal_progress === 1).length;
  const percentage = total > 0 ? Math.round((withProgress / total) * 100) : 0;
  return { total, withProgress, percentage };
}

module.exports = {
  saveCheckin, getAll, getLastNDays, getStreak,
  getUser, saveUser, isOnboarded, getAllUsers,
  setGoalProgress, getGoalProgressStats,
  saveReflection, getLastReflection,
};
