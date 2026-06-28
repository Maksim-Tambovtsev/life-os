require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { getAll, getLastNDays, getStreak } = require('./db');

const app = express();
const PORT = 3001;

// userId пока константа из .env (один пользователь — Максим)
const USER_ID = process.env.USER_ID;

app.use(cors());
app.use(express.json());

// Проверка живости сервера
app.get('/api/health', (req, res) => {
  res.json({ ok: true });
});

// Все чек-ины пользователя
app.get('/api/checkins', (req, res) => {
  const checkins = getAll(USER_ID);
  res.json(checkins);
});

// Сводка для дашборда: стрик, средние за 7 дней, массив последней недели
app.get('/api/stats', (req, res) => {
  const streak = getStreak(USER_ID);
  const week = getLastNDays(USER_ID, 7);
  const month = getLastNDays(USER_ID, 30);

  const avgSleep = average(week.map((r) => r.sleep_hours));
  const avgEnergy = average(week.map((r) => r.energy));

  const toChart = (rows) =>
    rows.map((r) => ({ date: r.date, sleep_hours: r.sleep_hours, energy: r.energy }));

  res.json({ streak, avgSleep, avgEnergy, week: toChart(week), month: toChart(month) });
});

// Утилита: среднее арифметическое, игнорирует null/undefined
function average(arr) {
  const valid = arr.filter((v) => v != null);
  if (!valid.length) return null;
  const sum = valid.reduce((a, b) => a + b, 0);
  return Math.round((sum / valid.length) * 10) / 10; // 1 знак после запятой
}

app.listen(PORT, () => {
  console.log(`🚀 API запущен на http://localhost:${PORT}`);
  if (!USER_ID) {
    console.warn('⚠️  USER_ID не задан в .env — эндпоинты вернут пустые данные');
  }
});
