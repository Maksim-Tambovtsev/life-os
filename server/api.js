require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getAll, getLastNDays, getStreak, getUser, saveUser, consumeLoginToken, updateProfile, PROFILE_EDITABLE_FIELDS, getGoalProgressStats, getWeeklyRatings, getRecentReflections } = require('./db');
const { verifyTelegramAuth, signToken, authMiddleware } = require('./auth');
const log = require('./logger').make('api');

const app = express();
const PORT = process.env.PORT || 3001;

// Railway работает за реверс-прокси — без этого req.ip был бы адресом прокси
// одинаковым для всех, и rate-limit ниже бы бил по всем пользователям разом.
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Проверка живости сервера
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// ─── Авторизация ──────────────────────────────────────────────────────────────

// Простой rate-limit по IP: не больше N попыток логина за окно времени.
// Защищает /api/auth/* от подбора user_id (dev-вход) и перебора.
function rateLimit({ windowMs, max }) {
  const hits = new Map(); // ip -> [timestamps]

  return (req, res, next) => {
    const ip = req.ip;
    const now = Date.now();
    const timestamps = (hits.get(ip) || []).filter((t) => now - t < windowMs);

    if (timestamps.length >= max) {
      return res.status(429).json({ error: 'too many attempts, try later' });
    }

    timestamps.push(now);
    hits.set(ip, timestamps);
    next();
  };
}

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20 });

// Вход через Telegram Login Widget. Регистрация автоматическая:
// если пользователя с таким chat_id нет — создаём.
app.post('/api/auth/telegram', authLimiter, (req, res) => {
  const data = req.body;

  if (!verifyTelegramAuth(data)) {
    return res.status(401).json({ error: 'invalid telegram signature' });
  }

  const userId = String(data.id);
  let user = getUser(userId);

  if (!user) {
    // Новый пользователь — авторегистрация с именем из Telegram.
    // Онбординг (цель, приоритет) он пройдёт в боте.
    saveUser({ user_id: userId, name: data.first_name || data.username || 'Пользователь' });
    user = getUser(userId);
  }

  res.json({
    token: signToken(userId),
    user: publicProfile(user),
  });
});

// Вход по одноразовой ссылке из бота (/login) — обходит Telegram Login Widget,
// у которого часть пользователей не получает подтверждение.
app.post('/api/auth/login-token', authLimiter, (req, res) => {
  const loginToken = String(req.body.token || '');
  if (!loginToken) return res.status(400).json({ error: 'token required' });

  const userId = consumeLoginToken(loginToken);
  if (!userId) return res.status(401).json({ error: 'invalid or expired token' });

  const user = getUser(userId);
  if (!user) return res.status(404).json({ error: 'user not found' });

  res.json({ token: signToken(userId), user: publicProfile(user) });
});

// Dev-вход для локальной разработки (Telegram widget не работает на localhost).
// Включается только флагом DEV_LOGIN=1 в .env — в проде выключен.
app.post('/api/auth/dev', authLimiter, (req, res) => {
  if (process.env.DEV_LOGIN !== '1') {
    return res.status(403).json({ error: 'dev login disabled' });
  }
  const userId = String(req.body.user_id || '');
  if (!userId) return res.status(400).json({ error: 'user_id required' });

  const user = getUser(userId);
  if (!user) return res.status(404).json({ error: 'user not found — сначала /start в боте' });

  res.json({ token: signToken(userId), user: publicProfile(user) });
});

// ─── Защищённые эндпоинты (только свои данные) ───────────────────────────────

// Профиль текущего пользователя
app.get('/api/me', authMiddleware, (req, res) => {
  const user = getUser(req.userId);
  if (!user) return res.status(404).json({ error: 'user not found' });
  res.json({ ...publicProfile(user), streak: getStreak(req.userId) });
});

// Обновление профиля с сайта: цель и личные контексты агентов.
// Принимает только поля из белого списка, строки до 2000 символов.
app.put('/api/profile', authMiddleware, (req, res) => {
  const fields = {};
  for (const key of PROFILE_EDITABLE_FIELDS) {
    const value = req.body[key];
    if (value === undefined) continue;
    if (typeof value !== 'string') return res.status(400).json({ error: `${key} must be a string` });
    if (value.length > 2000) return res.status(400).json({ error: `${key} too long (max 2000)` });
    fields[key] = value.trim();
  }

  if (!Object.keys(fields).length) return res.status(400).json({ error: 'no editable fields provided' });

  updateProfile(req.userId, fields);
  res.json(publicProfile(getUser(req.userId)));
});

// Все чек-ины пользователя
app.get('/api/checkins', authMiddleware, (req, res) => {
  res.json(getAll(req.userId));
});

// Сводка для дашборда: стрик, средние за 7 дней, массив последней недели
app.get('/api/stats', authMiddleware, (req, res) => {
  const streak = getStreak(req.userId);
  const week = getLastNDays(req.userId, 7);
  const month = getLastNDays(req.userId, 30);

  const avgSleep = average(week.map((r) => r.sleep_hours));
  const avgEnergy = average(week.map((r) => r.energy));

  const toChart = (rows) =>
    rows.map((r) => ({ date: r.date, sleep_hours: r.sleep_hours, energy: r.energy }));

  // Прогресс к цели: % дней с шагом к цели за неделю + еженедельные оценки 1-10
  const goalWeek = getGoalProgressStats(req.userId, 7);
  const weeklyRatings = getWeeklyRatings(req.userId, 12);
  const reflections = getRecentReflections(req.userId, 7);

  res.json({
    streak, avgSleep, avgEnergy,
    week: toChart(week), month: toChart(month),
    goalProgressPct: goalWeek.percentage,
    weeklyRatings,
    reflections,
  });
});

// ─── Утилиты ─────────────────────────────────────────────────────────────────

// Профиль без внутренних полей (pending_pattern и т.п.)
function publicProfile(user) {
  return {
    user_id: user.user_id,
    name: user.name,
    goal_year: user.goal_year,
    priority: user.priority,
    onboarded: user.onboarded,
    agent_ctx_health: user.agent_ctx_health,
    agent_ctx_strategist: user.agent_ctx_strategist,
    agent_ctx_focus: user.agent_ctx_focus,
    agent_ctx_mentor: user.agent_ctx_mentor,
    agent_ctx_analyst: user.agent_ctx_analyst,
  };
}

// Среднее арифметическое, игнорирует null/undefined
function average(arr) {
  const valid = arr.filter((v) => v != null);
  if (!valid.length) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10; // 1 знак после запятой
}

app.listen(PORT, () => {
  log.info(`🚀 API запущен на http://localhost:${PORT}`);
  if (process.env.DEV_LOGIN === '1') {
    log.warn('⚠️  DEV_LOGIN=1 — dev-вход включён, не используй в проде');
  }
});
