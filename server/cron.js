require('dotenv').config();
const cron = require('node-cron');
const { Telegraf } = require('telegraf');
const { getAllUsers, getLastNDays, getStreak } = require('./db');
const { chatReply } = require('./coach');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// ─── Вспомогательные функции ──────────────────────────────────────────────────

// Считает «нет активности» по тексту
function isNoActivity(text) {
  if (!text) return true;
  const lower = text.trim().toLowerCase();
  return ['нет', 'no', '-', 'ничего', 'нет активности', 'none', '0'].includes(lower);
}

// Безопасная отправка — логируем ошибки, не роняем весь cron
async function send(userId, text) {
  try {
    await bot.telegram.sendMessage(userId, text);
  } catch (e) {
    console.error(`cron: не удалось отправить ${userId}:`, e.message);
  }
}

// ─── Проверка паттернов для одного пользователя ───────────────────────────────

async function checkPatterns(user) {
  const days = getLastNDays(user.user_id, 7);
  if (!days.length) return;

  const today = new Date().toISOString().slice(0, 10);

  // Правило 1: энергия < 5 два дня подряд
  if (days.length >= 2) {
    const last2 = days.slice(-2);
    if (last2.every((d) => d.energy != null && d.energy < 5)) {
      await send(user.user_id,
        `📉 Замечаю что энергия падает второй день (${last2.map((d) => d.energy + '/10').join(', ')}).\n\nЧто происходит?`
      );
      return; // одно сообщение за проверку
    }
  }

  // Правило 2: сон < 6ч три дня подряд
  if (days.length >= 3) {
    const last3 = days.slice(-3);
    if (last3.every((d) => d.sleep_hours != null && d.sleep_hours < 6)) {
      await send(user.user_id,
        `😴 Ты спишь меньше нормы 3 дня подряд (${last3.map((d) => d.sleep_hours + 'ч').join(', ')}).\n\nЭто связано с работой или что-то ещё?`
      );
      return;
    }
  }

  // Правило 3: нет активности 4 дня подряд
  if (days.length >= 4) {
    const last4 = days.slice(-4);
    if (last4.every((d) => isNoActivity(d.activity))) {
      await send(user.user_id,
        `🏃 4 дня без движения. Велосипед или хайкинг сегодня?`
      );
      return;
    }
  }

  // Правило 4: рекорд — энергия 9-10 два дня подряд
  if (days.length >= 2) {
    const last2 = days.slice(-2);
    if (last2.every((d) => d.energy != null && d.energy >= 9)) {
      await send(user.user_id,
        `🔥 Два дня на пике энергии (${last2.map((d) => d.energy + '/10').join(', ')}).\n\nЧто делаешь иначе? Хочу запомнить.`
      );
      return;
    }
  }

  // Правило 5: стрик 7 / 14 / 30 дней
  const streak = getStreak(user.user_id);
  if ([7, 14, 30].includes(streak)) {
    await send(user.user_id,
      `🔥 ${streak} дней подряд! Что помогает держаться?`
    );
    return;
  }
}

// ─── 1. ВЕЧЕРНИЙ НАПОМИНАЛЬНИК (каждые 5 минут) ──────────────────────────────
// Проверяет: чьё reminder_time совпадает с текущим и кто ещё не чекинился сегодня

cron.schedule('*/5 * * * *', async () => {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, '0');
  const mm = String(now.getMinutes()).padStart(2, '0');
  // Округляем минуты до ближайших 5 для сравнения с reminder_time
  const mm5 = String(Math.floor(now.getMinutes() / 5) * 5).padStart(2, '0');
  const currentTime5 = `${hh}:${mm5}`;

  const users = getAllUsers();

  for (const user of users) {
    if (!user.reminder_time) continue;

    // reminder_time хранится как "21:00" — сравниваем с округлённым текущим
    const [rh, rm] = user.reminder_time.split(':');
    const reminderNorm = `${String(rh).padStart(2, '0')}:${String(Math.floor(Number(rm) / 5) * 5).padStart(2, '0')}`;

    if (reminderNorm !== currentTime5) continue;

    // Проверяем: есть ли чекин сегодня
    const today = new Date().toISOString().slice(0, 10);
    const todayCheckins = getLastNDays(user.user_id, 1).filter((d) => d.date === today);

    if (todayCheckins.length > 0) continue; // уже чекинился

    await send(user.user_id, `⏰ Время чекина! /checkin`);
  }
});

// ─── 2. УТРЕННЕЕ НАПОМИНАНИЕ ЗАДАЧ (каждый день в 8:00) ─────────────────────

cron.schedule('0 8 * * *', async () => {
  console.log('cron: утренние задачи');
  const users = getAllUsers();
  for (const user of users) {
    if (!user.last_tomorrow_plan) continue;
    await send(user.user_id,
      `☀️ Доброе утро, ${user.name}!\n\nВчера ты планировал:\n${user.last_tomorrow_plan}`
    );
  }
});

// ─── 3. АНАЛИЗ ПАТТЕРНОВ (каждый день в 9:00) ────────────────────────────────

cron.schedule('0 9 * * *', async () => {
  console.log('cron: проверка паттернов');
  const users = getAllUsers();
  for (const user of users) {
    await checkPatterns(user);
  }
});

// ─── 3. ЗАПРОС ПРОГРЕССА К ЦЕЛИ (каждую пятницу в 18:00) ─────────────────────

cron.schedule('0 18 * * 5', async () => {
  console.log('cron: запрос недельного прогресса');
  const users = getAllUsers();
  for (const user of users) {
    await send(user.user_id,
      `📅 Неделя закончилась.\n\n` +
      `Цель: ${user.goal_year}\n\n` +
      `Как продвинулся? Оцени от 1 до 10 и напиши пару слов.`
    );
  }
});

// ─── 4. НЕДЕЛЬНЫЙ ДАЙДЖЕСТ (каждое воскресенье в 10:00) ──────────────────────

cron.schedule('0 10 * * 0', async () => {
  console.log('cron: недельный дайджест');
  const users = getAllUsers();

  for (const user of users) {
    const days = getLastNDays(user.user_id, 7);
    if (days.length < 3) {
      await send(user.user_id, `📊 Мало данных за неделю — нужно минимум 3 чек-ина для дайджеста.`);
      continue;
    }

    const avgSleep = (days.reduce((s, d) => s + (d.sleep_hours || 0), 0) / days.length).toFixed(1);
    const avgEnergy = (days.reduce((s, d) => s + (d.energy || 0), 0) / days.length).toFixed(1);
    const activeDays = days.filter((d) => !isNoActivity(d.activity)).length;
    const streak = getStreak(user.user_id);

    const summary =
      `Неделя (${days.length} чек-инов):\n` +
      `- Средний сон: ${avgSleep} ч\n` +
      `- Средняя энергия: ${avgEnergy}/10\n` +
      `- Активных дней: ${activeDays} из ${days.length}\n` +
      `- Стрик: ${streak} дней\n` +
      `- Цель: ${user.goal_year}`;

    try {
      const analysis = await chatReply({
        message: summary,
        mode: 'ANALYST',
        user,
        recentCheckins: days,
        history: [],
      });

      await send(user.user_id, `📊 Дайджест недели:\n\n${summary}\n\n🤖 Анализ:\n${analysis}`);
    } catch (e) {
      console.error('cron: ошибка дайджеста:', e.message);
      await send(user.user_id, `📊 Дайджест недели:\n\n${summary}`);
    }
  }
});

console.log('⏰ Cron запущен:');
console.log('  • каждые 5 мин — вечерний напоминальник');
console.log('  • 08:00 ежедневно — утренние задачи');
console.log('  • 09:00 ежедневно — анализ паттернов');
console.log('  • 18:00 пятница — запрос прогресса');
console.log('  • 10:00 воскресенье — недельный дайджест');
