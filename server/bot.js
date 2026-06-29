require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const { saveCheckin, getStreak, getLastNDays, getUser, saveUser, isOnboarded, setGoalProgress } = require('./db');
const { coachReply, chatReply, analyzeGoalProgress } = require('./coach');
const { detectMode } = require('./prompts');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);

// sessions[chatId] = {
//   type: 'onboarding' | 'checkin' | null,
//   step: number,
//   data: {},
//   history: [{role, content}],   // история свободного диалога
//   historyTimer: TimeoutId,      // таймер очистки истории через 30 мин
// }
const sessions = {};

function getSession(chatId) {
  if (!sessions[chatId]) sessions[chatId] = { type: null, step: 0, data: {}, history: [] };
  return sessions[chatId];
}

// Сбросить таймер очистки истории и поставить новый на 30 минут
function resetHistoryTimer(chatId) {
  const session = sessions[chatId];
  if (!session) return;
  if (session.historyTimer) clearTimeout(session.historyTimer);
  session.historyTimer = setTimeout(() => {
    if (sessions[chatId]) sessions[chatId].history = [];
  }, 30 * 60 * 1000);
}

// Добавить пару user/assistant в историю, обрезать до 10 сообщений
function pushHistory(chatId, userText, assistantText) {
  const session = getSession(chatId);
  session.history.push({ role: 'user', content: userText });
  session.history.push({ role: 'assistant', content: assistantText });
  if (session.history.length > 20) session.history = session.history.slice(-20); // 10 пар
  resetHistoryTimer(chatId);
}

// ─── Онбординг ────────────────────────────────────────────────────────────────

const ONBOARDING_STEPS = [
  { field: 'name',          question: '👋 Привет! Как тебя зовут?' },
  { field: 'goal_year',     question: '🎯 Какая твоя главная цель на следующие 12 месяцев?\nНапиши одним предложением.' },
  { field: 'priority',      question: '⚡ Что для тебя важнее всего прямо сейчас?', keyboard: ['Здоровье', 'Продуктивность', 'Баланс'] },
  { field: 'reminder_time', question: '🔔 В какое время присылать вечерний напоминальник?\n(например, 21:00)' },
];

async function askOnboardingStep(ctx, step) {
  if (step.keyboard) {
    await ctx.reply(step.question, Markup.keyboard(step.keyboard).oneTime().resize());
  } else {
    await ctx.reply(step.question, Markup.removeKeyboard());
  }
}

// ─── Чек-ин ──────────────────────────────────────────────────────────────────

const CHECKIN_STEPS = [
  { field: 'sleep_hours',  question: '😴 Сколько часов ты спал? (например: 7.5)' },
  { field: 'wake_quality', question: '🌅 Как проснулся? Оцени от 1 до 10' },
  { field: 'activity',     question: '🏃 Была активность? (велосипед / хайкинг / зал / нет)' },
  { field: 'energy',       question: '⚡ Энергия сейчас? Оцени от 1 до 10' },
  { field: 'reflection',   question: '💭 Пара слов, как прошёл день?' },
];

// ─── /start ──────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id;

  if (isOnboarded(String(chatId))) {
    const user = getUser(String(chatId));
    await ctx.reply(
      `Привет, ${user.name}! Рад снова видеть тебя. 👋\n\n` +
      `Напиши /checkin для чекина или просто напиши что думаешь.`
    );
    return;
  }

  const session = getSession(chatId);
  session.type = 'onboarding';
  session.step = 0;
  session.data = { user_id: String(chatId) };
  await askOnboardingStep(ctx, ONBOARDING_STEPS[0]);
});

// ─── /checkin ────────────────────────────────────────────────────────────────

bot.command('checkin', async (ctx) => {
  const chatId = ctx.chat.id;

  if (!isOnboarded(String(chatId))) {
    const session = getSession(chatId);
    session.type = 'onboarding';
    session.step = 0;
    session.data = { user_id: String(chatId) };
    await ctx.reply('Сначала познакомимся! 👋');
    await askOnboardingStep(ctx, ONBOARDING_STEPS[0]);
    return;
  }

  const session = getSession(chatId);
  session.type = 'checkin';
  session.step = 0;
  session.data = { user_id: String(chatId), date: new Date().toISOString().slice(0, 10) };
  session.history = []; // чек-ин сбрасывает историю диалога

  await ctx.reply('Начинаем чек-ин!\n\n' + CHECKIN_STEPS[0].question);
});

// ─── Все текстовые сообщения ──────────────────────────────────────────────────

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  // Команды обрабатываются выше — сюда не попадают
  if (text.startsWith('/')) return;

  const session = getSession(chatId);

  if (session.type === 'onboarding') {
    await handleOnboarding(ctx, chatId, session);
    return;
  }

  if (session.type === 'checkin') {
    await handleCheckin(ctx, chatId, session);
    return;
  }

  // Нет активного флоу — свободный диалог с коучем
  await handleFreeChat(ctx, chatId, text, session);
});

// ─── Логика онбординга ────────────────────────────────────────────────────────

async function handleOnboarding(ctx, chatId, session) {
  const currentStep = ONBOARDING_STEPS[session.step];
  const answer = ctx.message.text.trim();

  if (currentStep.field === 'priority') {
    const allowed = ['Здоровье', 'Продуктивность', 'Баланс'];
    if (!allowed.includes(answer)) {
      await ctx.reply('Выбери один из вариантов:', Markup.keyboard(allowed).oneTime().resize());
      return;
    }
  }

  if (currentStep.field === 'reminder_time') {
    if (!/^\d{1,2}:\d{2}$/.test(answer)) {
      await ctx.reply('Введи время в формате ЧЧ:ММ, например 21:00');
      return;
    }
  }

  session.data[currentStep.field] = answer;
  session.step += 1;

  if (session.step < ONBOARDING_STEPS.length) {
    await askOnboardingStep(ctx, ONBOARDING_STEPS[session.step]);
    return;
  }

  const profile = { ...session.data, onboarded: 1 };
  saveUser(profile);
  session.type = null;
  session.data = {};

  await ctx.reply(
    `✅ Профиль создан, ${profile.name}!\n\n` +
    `🎯 Цель: ${profile.goal_year}\n` +
    `⚡ Приоритет: ${profile.priority}\n` +
    `🔔 Напоминание: ${profile.reminder_time}\n\n` +
    `Готово! Напиши /checkin чтобы начать первый чек-ин.\nИли просто пиши — я всегда здесь.`,
    Markup.removeKeyboard()
  );
}

// ─── Логика чек-ина ──────────────────────────────────────────────────────────

async function handleCheckin(ctx, chatId, session) {
  const currentStep = CHECKIN_STEPS[session.step];
  const answer = ctx.message.text.trim();

  if (currentStep.field === 'sleep_hours') {
    const num = parseFloat(answer);
    if (isNaN(num) || num < 0 || num > 24) {
      await ctx.reply('Введи число, например 7 или 7.5');
      return;
    }
    session.data.sleep_hours = num;
  } else if (currentStep.field === 'wake_quality' || currentStep.field === 'energy') {
    const num = parseInt(answer, 10);
    if (isNaN(num) || num < 1 || num > 10) {
      await ctx.reply('Введи число от 1 до 10');
      return;
    }
    session.data[currentStep.field] = num;
  } else {
    session.data[currentStep.field] = answer;
  }

  session.step += 1;

  if (session.step < CHECKIN_STEPS.length) {
    await ctx.reply(CHECKIN_STEPS[session.step].question);
    return;
  }

  const checkin = { ...session.data, goal_progress: null };
  session.type = null;
  session.data = {};

  try {
    saveCheckin(checkin);
    const streak = getStreak(checkin.user_id);
    const streakText = streak > 1 ? `🔥 Стрик: ${streak} дней подряд!` : '🌱 День первый — начало стрика!';

    await ctx.reply(
      '✅ Чек-ин сохранён!\n\n' +
      `📅 ${checkin.date}\n` +
      `😴 Сон: ${checkin.sleep_hours} ч\n` +
      `🌅 Пробуждение: ${checkin.wake_quality}/10\n` +
      `🏃 Активность: ${checkin.activity}\n` +
      `⚡ Энергия: ${checkin.energy}/10\n` +
      `💭 ${checkin.reflection}\n\n` +
      streakText
    );

    await ctx.reply('🤖 Анализирую данные…');
    const recentDays = getLastNDays(checkin.user_id, 7);
    const user = getUser(checkin.user_id);

    // Запускаем коуч-ответ и анализ прогресса к цели параллельно
    const [advice, goalResult] = await Promise.all([
      coachReply(checkin, recentDays, user),
      analyzeGoalProgress(checkin.reflection, user?.goal_year),
    ]);

    // Обновляем goal_progress в БД (0 или 1)
    setGoalProgress(checkin.user_id, checkin.date, goalResult.progress ? 1 : 0);

    // Добавляем отметку прогресса к ответу коуча если шаг был сделан
    const progressNote = goalResult.progress && goalResult.comment
      ? `\n\n🎯 ${goalResult.comment}`
      : '';

    await ctx.reply(`🤖 AI-коуч:\n\n${advice}${progressNote}`);

    // После чек-ина коуч-ответ идёт в историю как точка отсчёта разговора
    pushHistory(chatId,
      `Чек-ин ${checkin.date}: сон ${checkin.sleep_hours}ч, энергия ${checkin.energy}/10`,
      advice
    );

  } catch (err) {
    console.error('Ошибка чек-ина:', err);
    if (err.message?.includes('anthropic') || err.status) {
      await ctx.reply('⚠️ Чек-ин сохранён, но AI-коуч временно недоступен.');
    } else {
      await ctx.reply('Что-то пошло не так при сохранении. Попробуй ещё раз.');
    }
  }
}

// ─── Свободный диалог ────────────────────────────────────────────────────────

async function handleFreeChat(ctx, chatId, text, session) {
  if (!isOnboarded(String(chatId))) {
    await ctx.reply('Напиши /start чтобы познакомиться, или /checkin для чек-ина.');
    return;
  }

  const mode = detectMode(text);
  const user = getUser(String(chatId));
  const recentCheckins = getLastNDays(String(chatId), 7);

  try {
    await ctx.sendChatAction('typing'); // показывает "печатает..."

    const reply = await chatReply({
      message: text,
      mode,
      user,
      recentCheckins,
      history: session.history,
    });

    await ctx.reply(reply);
    pushHistory(chatId, text, reply);

  } catch (err) {
    console.error('Ошибка свободного диалога:', err);
    await ctx.reply('⚠️ AI-коуч временно недоступен. Попробуй чуть позже.');
  }
}

bot.launch();
console.log('🤖 Life OS бот запущен');

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));
