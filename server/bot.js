require('dotenv').config();
const { Telegraf, Markup } = require('telegraf');
const Anthropic = require('@anthropic-ai/sdk');
const { saveCheckin, getStreak, getLastNDays, getUser, saveUser, isOnboarded, setGoalProgress, saveReflection, clearPendingPattern, createLoginToken, setPendingWeeklyRating, saveWeeklyRating } = require('./db');
const { chatReply, analyzeGoalProgress, getPatternAdvice, withDate } = require('./coach');
const { detectMode, REFLECTION_QUESTIONS, getPrompt, REFLECTION_SUMMARY_PROMPT } = require('./prompts');
const log = require('./logger').make('bot');

const bot = new Telegraf(process.env.TELEGRAM_TOKEN);
const anthropicClient = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

// sessions[chatId] = {
//   type: 'onboarding' | 'reflection' | 'profile_edit' | null,
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

const PROFILE_EDIT_FIELDS = {
  'Изменить цель': { field: 'goal_year', question: '🎯 Введи новую цель на следующие 12 месяцев:' },
  'Изменить имя': { field: 'name', question: '👤 Какое имя сохранить?' },
  'Изменить время': { field: 'reminder_time', question: '🔔 Введи новое время напоминания в формате ЧЧ:ММ (например, 21:00):' },
};

function getMainKeyboard() {
  return Markup.keyboard([
    ['📝 Рефлексия'],
    ['📊 Анализ', '💬 Поговорить'],
  ]).resize();
}

// Единый вечерний флоу: короткие структурные вопросы (для графиков),
// затем свободная рефлексия — один разбор дня вместо чекин + рефлексия отдельно.
const REFLECTION_STEPS = [
  { field: 'sleep_hours',  question: '😴 Сколько часов ты спал? (например: 7.5)' },
  { field: 'wake_quality', question: '🌅 Как проснулся? Оцени от 1 до 10' },
  { field: 'activity',     question: '🏃 Была активность? (велосипед / хайкинг / зал / нет)' },
  { field: 'energy',       question: '⚡ Энергия сейчас? Оцени от 1 до 10' },
];

async function startReflectionFlow(ctx, chatId, session) {
  session.type = 'reflection';
  session.step = 0;
  session.data = { user_id: String(chatId), date: new Date().toISOString().slice(0, 10) };
  session.history = []; // рефлексия начинает разговор с чистого листа

  await ctx.reply(
    'Подведём итоги дня. Сначала четыре коротких вопроса.\n\n' + REFLECTION_STEPS[0].question,
    Markup.removeKeyboard()
  );
}

// Финальный вопрос флоу — свободная рефлексия по списку вопросов
async function askReflectionText(ctx, chatId) {
  const user = getUser(String(chatId));
  const previousPlan = user?.last_tomorrow_plan;

  const questions = [...REFLECTION_QUESTIONS];
  if (previousPlan && String(previousPlan).trim()) {
    questions[0] = `Что сделал из вчерашних планов:\n${previousPlan}`;
  }

  const numbered = questions.map((q, i) => `${i + 1}. ${q}`).join('\n');

  await ctx.reply(
    `Теперь рефлексия:\n\n${numbered}\n\nОтветь одним сообщением — по пунктам или свободным текстом, как удобно.`
  );
}

async function summarizeReflection(reflectionText, user, dayStats = null) {
  const system = withDate(`${getPrompt('HEALTH', user)}\n\n${getPrompt('STRATEGIST', user)}\n\n${REFLECTION_SUMMARY_PROMPT}`);

  const statsLine = dayStats
    ? `Данные дня: сон ${dayStats.sleep_hours} ч, пробуждение ${dayStats.wake_quality}/10, ` +
      `активность: ${dayStats.activity}, энергия ${dayStats.energy}/10.\n\n`
    : '';

  try {
    const response = await anthropicClient.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 700,
      system,
      messages: [{ role: 'user', content: `${statsLine}Рефлексия пользователя:\n\n${reflectionText}` }],
    });
    return response.content[0].text;
  } catch (error) {
    log.error('Reflection summary error:', error);
    return 'Рефлексия сохранена.';
  }
}

async function handleReflectionFlow(ctx, chatId, session) {
  const answer = ctx.message.text.trim();

  // Этап 1: структурные вопросы (сон / пробуждение / активность / энергия)
  if (session.step < REFLECTION_STEPS.length) {
    const currentStep = REFLECTION_STEPS[session.step];

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

    if (session.step < REFLECTION_STEPS.length) {
      await ctx.reply(REFLECTION_STEPS[session.step].question);
    } else {
      await askReflectionText(ctx, chatId);
    }
    return;
  }

  // Этап 2: свободная рефлексия — сохраняем всё и делаем один разбор дня
  if (!answer) {
    await ctx.reply('Напиши хоть пару слов, чтобы продолжить.');
    return;
  }

  const user = getUser(String(chatId));
  const checkin = { ...session.data, reflection: answer, goal_progress: null };
  session.type = null;
  session.step = 0;
  session.data = {};

  try {
    saveCheckin(checkin);
    const streak = getStreak(checkin.user_id);
    const streakText = streak > 1 ? `🔥 Стрик: ${streak} дней подряд!` : '🌱 День первый — начало стрика!';

    await ctx.reply(
      '✅ День записан!\n\n' +
      `📅 ${checkin.date}\n` +
      `😴 Сон: ${checkin.sleep_hours} ч\n` +
      `🌅 Пробуждение: ${checkin.wake_quality}/10\n` +
      `🏃 Активность: ${checkin.activity}\n` +
      `⚡ Энергия: ${checkin.energy}/10\n\n` +
      streakText
    );
    await ctx.reply('🤖 Анализирую день…');

    // Разбор дня и анализ шага к цели — параллельно
    const [summary, goalResult] = await Promise.all([
      summarizeReflection(answer, user, checkin),
      analyzeGoalProgress(answer, user?.goal_year),
    ]);

    setGoalProgress(checkin.user_id, checkin.date, goalResult.progress ? 1 : 0);

    saveReflection({
      user_id: String(chatId),
      date: checkin.date,
      answers: [answer],
      summary,
    });

    // Извлекаем задачи на завтра для утреннего напоминания
    const tasksMatch = summary.match(/<b>Задачи на завтра<\/b>\n\n([\s\S]+?)(?:\n\n|$)/);
    const tasksText = tasksMatch ? tasksMatch[1].trim() : '';

    saveUser({
      user_id: String(chatId),
      name: user?.name,
      goal_year: user?.goal_year,
      priority: user?.priority,
      reminder_time: user?.reminder_time,
      onboarded: user?.onboarded ?? 1,
      last_tomorrow_plan: tasksText,
    });

    const progressNote = goalResult.progress && goalResult.comment
      ? `\n\n🎯 ${goalResult.comment}`
      : '';

    await ctx.replyWithHTML(`📝 Итог дня:\n\n${summary}${progressNote}`, getMainKeyboard());

    // Итог идёт в историю как точка отсчёта разговора
    pushHistory(chatId,
      `Рефлексия ${checkin.date}: сон ${checkin.sleep_hours}ч, энергия ${checkin.energy}/10`,
      summary
    );

  } catch (err) {
    log.error('Ошибка рефлексии:', err);
    if (err.message?.includes('anthropic') || err.status) {
      await ctx.reply('⚠️ День записан, но AI-разбор временно недоступен.');
    } else {
      await ctx.reply('Что-то пошло не так при сохранении. Попробуй ещё раз.');
    }
  }
}

async function showProfile(ctx, chatId) {
  const user = getUser(String(chatId));

  if (!user || user.onboarded !== 1) {
    await ctx.reply('Сначала пройди /start, чтобы создать профиль.');
    return;
  }

  const profileText = [
    'Твой профиль:',
    `Имя: ${user.name || '—'}`,
    `Цель: ${user.goal_year || '—'}`,
    `Приоритет: ${user.priority || '—'}`,
    `Напоминальник: ${user.reminder_time || '21:00'}`,
  ].join('\n');

  await ctx.reply(profileText);
  await ctx.reply('Главное меню:', getMainKeyboard());
}

async function handleProfileEdit(ctx, chatId, session) {
  const field = session.editField;
  const answer = ctx.message.text.trim();
  const user = getUser(String(chatId));

  if (!user || user.onboarded !== 1) {
    session.type = null;
    session.editField = null;
    session.data = {};
    await ctx.reply('Сначала пройди /start, чтобы создать профиль.');
    return;
  }

  if (field === 'reminder_time' && !/^\d{1,2}:\d{2}$/.test(answer)) {
    await ctx.reply('Введи время в формате ЧЧ:ММ, например 21:00');
    return;
  }

  if ((field === 'goal_year' || field === 'name') && !answer) {
    await ctx.reply('Поле не может быть пустым. Попробуй ещё раз.');
    return;
  }

  const updatedProfile = {
    user_id: String(chatId),
    name: user.name,
    goal_year: user.goal_year,
    priority: user.priority,
    reminder_time: user.reminder_time,
    onboarded: user.onboarded,
  };

  updatedProfile[field] = answer;
  saveUser(updatedProfile);

  session.type = null;
  session.editField = null;
  session.data = {};

  const fieldLabel = field === 'goal_year' ? 'цель' : field === 'name' ? 'имя' : 'время';
  await ctx.reply(`✅ ${fieldLabel.charAt(0).toUpperCase() + fieldLabel.slice(1)} обновлено.`, Markup.removeKeyboard());
  await showProfile(ctx, chatId);
}

// ─── /start ──────────────────────────────────────────────────────────────────

bot.command('start', async (ctx) => {
  const chatId = ctx.chat.id;

  if (isOnboarded(String(chatId))) {
    const user = getUser(String(chatId));
    await ctx.reply(
      `Привет, ${user.name}! Рад снова видеть тебя. 👋\n\n` +
      `Нажми 📝 Рефлексия, чтобы подвести итоги дня, или просто пиши.`
    );
    await ctx.reply('Главное меню:', getMainKeyboard());
    return;
  }

  const session = getSession(chatId);
  session.type = 'onboarding';
  session.step = 0;
  session.data = { user_id: String(chatId) };
  await askOnboardingStep(ctx, ONBOARDING_STEPS[0]);
});

// ─── /profile ───────────────────────────────────────────────────────────────

bot.command('profile', async (ctx) => {
  await showProfile(ctx, ctx.chat.id);
});

// ─── /login ─────────────────────────────────────────────────────────────────
// Одноразовая ссылка для входа на сайт — обходит виджет Telegram Login,
// который у части пользователей не доставляет код подтверждения.

bot.command('login', async (ctx) => {
  const chatId = ctx.chat.id;

  if (!isOnboarded(String(chatId))) {
    await ctx.reply('Сначала пройди /start, чтобы создать профиль.');
    return;
  }

  const loginToken = createLoginToken(String(chatId));
  const url = `${FRONTEND_URL}/?login_token=${loginToken}`;
  await ctx.reply(`🔑 Ссылка для входа на сайт (действует 5 минут):\n${url}`);
});

// ─── /reflection (и /checkin как алиас для старых пользователей) ─────────────

async function startReflectionOrOnboard(ctx) {
  const chatId = ctx.chat.id;
  const session = getSession(chatId);

  if (!isOnboarded(String(chatId))) {
    session.type = 'onboarding';
    session.step = 0;
    session.data = { user_id: String(chatId) };
    await ctx.reply('Сначала познакомимся! 👋');
    await askOnboardingStep(ctx, ONBOARDING_STEPS[0]);
    return;
  }

  await startReflectionFlow(ctx, chatId, session);
}

bot.command('reflection', startReflectionOrOnboard);

// Чекин объединён с рефлексией — команда осталась, чтобы не ломать привычку
bot.command('checkin', async (ctx) => {
  await ctx.reply('Чекин теперь часть рефлексии — один общий итог дня.');
  await startReflectionOrOnboard(ctx);
});

// ─── Все текстовые сообщения ──────────────────────────────────────────────────

bot.on('text', async (ctx) => {
  const chatId = ctx.chat.id;
  const text = ctx.message.text;

  // Команды обрабатываются выше — сюда не попадают
  if (text.startsWith('/')) return;

  const session = getSession(chatId);

  // Главное меню кнопок (обрабатываем первыми)
  if (text === '📝 Рефлексия') {
    await startReflectionOrOnboard(ctx);
    return;
  }

  // Старая кнопка чекина — у части пользователей ещё висит прежняя клавиатура
  if (text === '💪 Здоровье') {
    await ctx.reply('Чекин теперь часть рефлексии — один общий итог дня.');
    await startReflectionOrOnboard(ctx);
    return;
  }

  if (text === '📊 Анализ') {
    await ctx.reply('Неделю или месяц?', Markup.inlineKeyboard([
      Markup.button.callback('Неделя', 'ANALYZE_7'),
      Markup.button.callback('Месяц', 'ANALYZE_30'),
    ]));
    return;
  }

  if (text === '💬 Поговорить') {
    // Остаёмся в свободном чате — просто спрашиваем и ждём следующего сообщения
    session.type = null;
    await ctx.reply('Слушаю. Что на уме?');
    return;
  }

  if (session.type === 'profile_edit') {
    await handleProfileEdit(ctx, chatId, session);
    return;
  }

  if (text === 'Изменить цель' || text === 'Изменить имя' || text === 'Изменить время') {
    const config = PROFILE_EDIT_FIELDS[text];
    session.type = 'profile_edit';
    session.editField = config.field;
    session.data = {};
    await ctx.reply(config.question, Markup.removeKeyboard());
    return;
  }

  if (session.type === 'reflection') {
    await handleReflectionFlow(ctx, chatId, session);
    return;
  }

  if (session.type === 'onboarding') {
    await handleOnboarding(ctx, chatId, session);
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
    `Готово! Нажми 📝 Рефлексия вечером, чтобы подвести итоги дня.\nИли просто пиши — я всегда здесь.`,
    Markup.removeKeyboard()
  );
}

// ─── Свободный диалог ────────────────────────────────────────────────────────

async function handleFreeChat(ctx, chatId, text, session) {
  if (!isOnboarded(String(chatId))) {
    await ctx.reply('Напиши /start чтобы познакомиться, или /reflection для итогов дня.');
    return;
  }

  const user = getUser(String(chatId));
  const recentCheckins = getLastNDays(String(chatId), 7);

  try {
    await ctx.sendChatAction('typing');

    // Если бот ждёт еженедельную оценку прогресса (пятничный вопрос) —
    // вытаскиваем число 1-10 из ответа и сохраняем для дашборда
    if (user?.pending_weekly_rating) {
      const ratingMatch = text.match(/\b([1-9]|10)\b/);
      if (ratingMatch) {
        const rating = parseInt(ratingMatch[1], 10);
        setPendingWeeklyRating(String(chatId), false);
        saveWeeklyRating(String(chatId), rating, text);

        const reply = await chatReply({
          message:
            `Пользователь оценил недельный прогресс к цели на ${rating}/10 и написал: "${text}". ` +
            `Отреагируй коротко: одно наблюдение или один вопрос.`,
          mode: 'STRATEGIST',
          user,
          recentCheckins,
          history: session.history,
        });
        await ctx.reply(`✅ Оценка ${rating}/10 записана — увидишь её на дашборде.\n\n${reply}`);
        pushHistory(chatId, text, reply);
        return;
      }
      // Числа в ответе нет — просим оценку ещё раз, флаг не снимаем
      await ctx.reply('Поставь оценку числом от 1 до 10 (можно вместе с комментарием).');
      return;
    }

    // Если бот ждёт ответ на вопрос о паттерне — даём адресный совет
    if (user?.pending_pattern) {
      clearPendingPattern(String(chatId));
      const reply = await getPatternAdvice(
        user.pending_pattern,
        user.pending_pattern_ctx || '',
        text,
        user,
        recentCheckins
      );
      await ctx.reply(reply);
      pushHistory(chatId, text, reply);
      return;
    }

    const mode = detectMode(text);
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
    log.error('Ошибка свободного диалога:', err);
    await ctx.reply('⚠️ AI-коуч временно недоступен. Попробуй чуть позже.');
  }
}

bot.launch();
log.info('🤖 Life OS бот запущен');

// Меню команд в Telegram (кнопка «/» рядом с полем ввода)
bot.telegram.setMyCommands([
  { command: 'reflection', description: 'Итоги дня: чекин + рефлексия' },
  { command: 'profile', description: 'Мой профиль' },
  { command: 'login', description: 'Ссылка для входа на сайт' },
  { command: 'start', description: 'Перезапустить бота' },
]).catch((e) => log.warn('setMyCommands failed:', e.message));

process.once('SIGINT', () => bot.stop('SIGINT'));
process.once('SIGTERM', () => bot.stop('SIGTERM'));

// Обработчики inline-кнопок для анализа
bot.action('ANALYZE_7', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const chatId = ctx.chat.id;
    await ctx.reply('Собираю данные за неделю...');
    const days = getLastNDays(String(chatId), 7);
    const user = getUser(String(chatId));
    const reply = await chatReply({
      message: 'Сделай аналитический дайджест по этим данным за последние 7 дней.',
      mode: 'ANALYST',
      user,
      recentCheckins: days,
    });
    await ctx.reply(reply);
  } catch (e) {
    log.error('ANALYZE_7 error:', e);
    await ctx.reply('Не удалось собрать анализ. Попробуй позже.');
  }
});

bot.action('ANALYZE_30', async (ctx) => {
  try {
    await ctx.answerCbQuery();
    const chatId = ctx.chat.id;
    await ctx.reply('Собираю данные за месяц...');
    const days = getLastNDays(String(chatId), 30);
    const user = getUser(String(chatId));
    const reply = await chatReply({
      message: 'Сделай аналитический дайджест по этим данным за последние 30 дней.',
      mode: 'ANALYST',
      user,
      recentCheckins: days,
    });
    await ctx.reply(reply);
  } catch (e) {
    log.error('ANALYZE_30 error:', e);
    await ctx.reply('Не удалось собрать анализ. Попробуй позже.');
  }
});
