require('dotenv').config();
const Anthropic = require('@anthropic-ai/sdk');
const { getPrompt } = require('./prompts');

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Добавляет текущую дату первой строкой любого системного промпта
function withDate(systemPrompt) {
  const dateStr = new Date().toLocaleDateString('ru-RU', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  return `Сегодня: ${dateStr}.\n\n${systemPrompt}`;
}

/**
 * Ответ коуча после чек-ина (режим HEALTH).
 * @param {object}      checkin    — данные сегодняшнего чек-ина
 * @param {object[]}    recentDays — последние 7 дней из БД
 * @param {object|null} user       — профиль пользователя
 */
async function coachReply(checkin, recentDays, user = null) {
  const historyText = recentDays.length > 1
    ? recentDays
        .slice(0, -1)
        .map((d) => `  ${d.date}: сон ${d.sleep_hours}ч, энергия ${d.energy}/10`)
        .join('\n')
    : '  Это первый чек-ин.';

  const userMessage =
    `Чек-ин (${checkin.date}):\n` +
    `- Сон: ${checkin.sleep_hours} ч\n` +
    `- Пробуждение: ${checkin.wake_quality}/10\n` +
    `- Активность: ${checkin.activity}\n` +
    `- Энергия: ${checkin.energy}/10\n` +
    `- Рефлексия: "${checkin.reflection}"\n\n` +
    `История последних дней:\n${historyText}`;

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: withDate(getPrompt('CHECKIN', user)),
    messages: [{ role: 'user', content: userMessage }],
  });

  return response.content[0].text;
}

/**
 * Свободный диалог с коучем.
 * @param {object} opts
 * @param {string}      opts.message        — текст от пользователя
 * @param {string}      opts.mode           — режим агента
 * @param {object|null} opts.user           — профиль пользователя
 * @param {object[]}    opts.recentCheckins — последние чек-ины для контекста
 * @param {Array}       opts.history        — история диалога [{role, content}]
 */
async function chatReply({ message, mode, user = null, recentCheckins = [], history = [] }) {
  let system = getPrompt(mode, user);

  // Добавляем последние 3 чек-ина в системный контекст если есть
  if (recentCheckins.length) {
    const summary = recentCheckins
      .slice(-3)
      .map((d) => `  ${d.date}: сон ${d.sleep_hours}ч, энергия ${d.energy}/10`)
      .join('\n');
    system += `\n\nПоследние чек-ины пользователя:\n${summary}`;
  }

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 400,
    system: withDate(system),
    messages: [
      ...history,
      { role: 'user', content: message },
    ],
  });

  return response.content[0].text;
}

/**
 * Анализирует рефлексию на наличие шага к годовой цели.
 * @param {string} reflection — текст рефлексии из чек-ина
 * @param {string} goal       — годовая цель пользователя
 * @returns {Promise<{progress: boolean, comment: string}>}
 */
async function analyzeGoalProgress(reflection, goal) {
  if (!reflection || !goal) return { progress: false, comment: '' };

  const prompt =
    `Цель пользователя: ${goal}.\n` +
    `Рефлексия: ${reflection}.\n\n` +
    `Упомянул ли он конкретное действие в направлении этой цели? ` +
    `Ответь ТОЛЬКО JSON без markdown: {"progress": boolean, "comment": string}. ` +
    `comment — одно короткое предложение на русском языке (или пустая строка если progress false).`;

  try {
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 100,
      system: withDate('Ты — аналитик. Отвечай ТОЛЬКО валидным JSON без markdown.'),
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].text.trim()
      .replace(/^```json\s*/i, '').replace(/```\s*$/, '').trim();

    const parsed = JSON.parse(text);
    return {
      progress: Boolean(parsed.progress),
      comment: parsed.comment || '',
    };
  } catch (e) {
    console.error('analyzeGoalProgress error:', e.message);
    return { progress: false, comment: '' };
  }
}

/**
 * Даёт адресный совет после того как пользователь ответил на вопрос о паттерне.
 * @param {'energy'|'sleep'} pattern — тип паттерна
 * @param {string} patternCtx       — контекст (данные за дни)
 * @param {string} userReply        — ответ пользователя на вопрос
 * @param {object|null} user
 * @param {object[]} recentCheckins
 */
async function getPatternAdvice(pattern, patternCtx, userReply, user = null, recentCheckins = []) {
  const contextMap = {
    energy:
      `Паттерн: энергия пользователя снижается три дня подряд (${patternCtx}). ` +
      `Бот спросил что изменилось. Пользователь ответил: "${userReply}". ` +
      `Дай один конкретный адресный совет по восстановлению энергии с учётом этой причины. Коротко.`,
    sleep:
      `Паттерн: пользователь спит меньше 6 часов три дня подряд (${patternCtx}). ` +
      `Бот спросил о причине. Пользователь ответил: "${userReply}". ` +
      `Дай один конкретный совет по улучшению сна с учётом этой причины. Коротко.`,
  };

  const message = contextMap[pattern] || userReply;

  return chatReply({ message, mode: 'HEALTH', user, recentCheckins, history: [] });
}

module.exports = { coachReply, chatReply, analyzeGoalProgress, getPatternAdvice, withDate };
