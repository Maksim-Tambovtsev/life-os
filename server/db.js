const Database = require('better-sqlite3');
const path = require('path');
const crypto = require('crypto');

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

// Таблица одноразовых токенов для входа на сайт через бота (/login)
db.exec(`
  CREATE TABLE IF NOT EXISTS login_tokens (
    token      TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    used       INTEGER DEFAULT 0
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

try {
  db.exec('ALTER TABLE users ADD COLUMN pending_pattern TEXT');
} catch (_) {}
try {
  db.exec('ALTER TABLE users ADD COLUMN pending_pattern_ctx TEXT');
} catch (_) {}

// Личный контекст для каждого из пяти агентов (раздел «Мои агенты» на сайте)
for (const col of ['agent_ctx_health', 'agent_ctx_strategist', 'agent_ctx_focus', 'agent_ctx_mentor', 'agent_ctx_analyst']) {
  try {
    db.exec(`ALTER TABLE users ADD COLUMN ${col} TEXT`);
  } catch (_) {}
}

// Ожидание еженедельной оценки прогресса к цели (пятничный вопрос из cron)
try {
  db.exec('ALTER TABLE users ADD COLUMN pending_weekly_rating INTEGER DEFAULT 0');
} catch (_) {}

// Еженедельные оценки прогресса к цели (1-10, из пятничного вопроса)
db.exec(`
  CREATE TABLE IF NOT EXISTS weekly_goal_ratings (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    TEXT NOT NULL,
    date       TEXT NOT NULL,
    rating     INTEGER NOT NULL,
    note       TEXT,
    created_at TEXT DEFAULT (datetime('now'))
  )
`);

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

// Последние N рефлексий для ленты на дашборде — самые новые первыми
function getRecentReflections(userId, limit = 7) {
  return db.prepare(
    'SELECT date, summary FROM reflections WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?'
  ).all(userId, limit);
}

function getLastNDays(userId, n) {
  // Один ряд на день: при повторном чек-ине за день берём последний,
  // иначе дубликаты ломают графики и искажают средние.
  return db.prepare(`
    SELECT * FROM checkins
    WHERE id IN (
      SELECT MAX(id) FROM checkins
      WHERE user_id = ?
        AND date >= date('now', '-' || ? || ' days')
      GROUP BY date
    )
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
      name               = excluded.name,
      goal_year          = excluded.goal_year,
      priority           = excluded.priority,
      reminder_time      = excluded.reminder_time,
      onboarded          = excluded.onboarded,
      last_tomorrow_plan = excluded.last_tomorrow_plan
  `);

  // better-sqlite3 бросает RangeError если named parameter отсутствует в объекте.
  // Гарантируем дефолты для всех полей, которые вызывающий может не передать.
  const dataToSave = {
    user_id:            obj.user_id,
    name:               obj.name               ?? null,
    goal_year:          obj.goal_year          ?? null,
    priority:           obj.priority           ?? null,
    reminder_time:      obj.reminder_time      ?? '21:00',
    onboarded:          obj.onboarded          ?? 0,
    last_tomorrow_plan: obj.last_tomorrow_plan ?? null,
  };

  return stmt.run(dataToSave);
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

// Стрик дней с прогрессом к цели (goal_progress = 1, подряд от сегодня)
function getGoalStreak(userId) {
  const rows = db.prepare(`
    SELECT date, goal_progress FROM checkins
    WHERE user_id = ?
    ORDER BY date DESC
  `).all(userId);

  let streak = 0;
  for (const row of rows) {
    if (row.goal_progress === 1) streak++;
    else break;
  }
  return streak;
}

// ─── Pending pattern (ожидание ответа на вопрос по паттерну) ─────────────────

function setPendingPattern(userId, pattern, ctx) {
  db.prepare(
    'UPDATE users SET pending_pattern = ?, pending_pattern_ctx = ? WHERE user_id = ?'
  ).run(pattern, typeof ctx === 'string' ? ctx : JSON.stringify(ctx), userId);
}

function clearPendingPattern(userId) {
  db.prepare(
    'UPDATE users SET pending_pattern = NULL, pending_pattern_ctx = NULL WHERE user_id = ?'
  ).run(userId);
}

// ─── Профиль: цель и контексты агентов (редактируются с сайта) ───────────────

const PROFILE_EDITABLE_FIELDS = [
  'goal_year',
  'agent_ctx_health', 'agent_ctx_strategist', 'agent_ctx_focus',
  'agent_ctx_mentor', 'agent_ctx_analyst',
];

// Обновляет только переданные поля из белого списка. Возвращает true если что-то обновилось.
function updateProfile(userId, fields) {
  const updates = PROFILE_EDITABLE_FIELDS.filter((f) => fields[f] !== undefined);
  if (!updates.length) return false;

  const setClause = updates.map((f) => `${f} = ?`).join(', ');
  const values = updates.map((f) => fields[f]);
  const result = db.prepare(`UPDATE users SET ${setClause} WHERE user_id = ?`).run(...values, userId);
  return result.changes > 0;
}

// ─── Еженедельные оценки прогресса к цели ─────────────────────────────────────

function setPendingWeeklyRating(userId, value) {
  db.prepare('UPDATE users SET pending_weekly_rating = ? WHERE user_id = ?').run(value ? 1 : 0, userId);
}

function saveWeeklyRating(userId, rating, note = '') {
  const date = new Date().toISOString().slice(0, 10);
  db.prepare(
    'INSERT INTO weekly_goal_ratings (user_id, date, rating, note) VALUES (?, ?, ?, ?)'
  ).run(userId, date, rating, note);
}

function getWeeklyRatings(userId, limit = 12) {
  return db.prepare(
    'SELECT date, rating, note FROM weekly_goal_ratings WHERE user_id = ? ORDER BY date DESC, id DESC LIMIT ?'
  ).all(userId, limit).reverse(); // от старых к новым — удобно для графиков
}

// ─── Login tokens (одноразовые ссылки для входа на сайт через бота) ──────────

const LOGIN_TOKEN_TTL_MS = 5 * 60 * 1000; // 5 минут

function createLoginToken(userId) {
  const token = crypto.randomBytes(24).toString('hex');
  const expiresAt = new Date(Date.now() + LOGIN_TOKEN_TTL_MS).toISOString();
  db.prepare(
    'INSERT INTO login_tokens (token, user_id, expires_at) VALUES (?, ?, ?)'
  ).run(token, userId, expiresAt);
  return token;
}

// Возвращает user_id и помечает токен использованным, либо null если
// токен не найден, уже использован или истёк.
function consumeLoginToken(token) {
  const row = db.prepare('SELECT * FROM login_tokens WHERE token = ?').get(token);
  if (!row || row.used || new Date(row.expires_at).getTime() < Date.now()) return null;

  db.prepare('UPDATE login_tokens SET used = 1 WHERE token = ?').run(token);
  return row.user_id;
}

module.exports = {
  saveCheckin, getAll, getLastNDays, getStreak,
  getUser, saveUser, isOnboarded, getAllUsers,
  setGoalProgress, getGoalProgressStats, getGoalStreak,
  setPendingPattern, clearPendingPattern,
  saveReflection, getLastReflection, getRecentReflections,
  createLoginToken, consumeLoginToken,
  updateProfile, PROFILE_EDITABLE_FIELDS,
  setPendingWeeklyRating, saveWeeklyRating, getWeeklyRatings,
};
