require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getAll, getLastNDays, getStreak, getUser, saveUser } = require('./db');
const { verifyTelegramAuth, signToken, authMiddleware } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Проверка живости сервера
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// ─── Авторизация ──────────────────────────────────────────────────────────────

// Вход через Telegram Login Widget. Регистрация автоматическая:
// если пользователя с таким chat_id нет — создаём.
app.post('/api/auth/telegram', (req, res) => {
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

// Dev-вход для локальной разработки (Telegram widget не работает на localhost).
// Включается только флагом DEV_LOGIN=1 в .env — в проде выключен.
app.post('/api/auth/dev', (req, res) => {
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

  res.json({ streak, avgSleep, avgEnergy, week: toChart(week), month: toChart(month) });
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
  console.log(`🚀 API запущен на http://localhost:${PORT}`);
  if (process.env.DEV_LOGIN === '1') {
    console.warn('⚠️  DEV_LOGIN=1 — dev-вход включён, не используй в проде');
  }
});
