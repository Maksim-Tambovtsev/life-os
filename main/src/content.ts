export type Lang = 'ru' | 'en';

export const content = {
  ru: {
    nav: {
      links: [
        { label: 'Возможности', href: '#features' },
        { label: 'Как работает', href: '#how' },
        { label: 'Архитектура', href: '#arch' },
        { label: 'Стек', href: '#stack' },
      ],
      github: 'GitHub',
    },
    hero: {
      badge: 'Твой AI-коуч в Telegram',
      title1: 'Система управления',
      title2: 'жизнью',
      subtitle:
        'Два вопроса в день — и ты видишь, как сон, энергия и настроение связаны между собой. AI-коуч анализирует твои паттерны и даёт персональные рекомендации.',
      cta1: 'Смотреть превью',
      cta2: 'Открыть GitHub',
      ctaTg: 'Начать бесплатно',
    },
    features: {
      kicker: 'возможности',
      title: 'Что умеет Life OS',
      sub: 'Всё, что нужно для осознанной работы с энергией',
      cards: [
        {
          icon: '💬',
          title: 'Чекин в Telegram',
          desc: 'Бот сам напоминает утром и вечером. Два вопроса — энергия и сон. Занимает меньше двух минут, не требует открывать приложение.',
        },
        {
          icon: '📊',
          title: 'Дашборд сна и энергии',
          desc: 'Видишь динамику за неделю и месяц. Сразу понятно, в какие дни ты эффективнее и что на это влияет.',
        },
        {
          icon: '🤖',
          title: 'Персональные AI-рекомендации',
          desc: 'Claude анализирует твои данные за 7 дней и даёт конкретный совет — не общие фразы, а вывод на основе твоих паттернов.',
        },
      ],
    },
    howItWorks: {
      kicker: 'процесс',
      title: 'Как это работает',
      sub: 'Три шага от первого чекина до персонального инсайта',
      steps: [
        {
          n: '01',
          title: 'Заполни чекин в Telegram',
          desc: 'Бот задаёт два вопроса: уровень энергии и часы сна. Никакой регистрации — просто отвечай на сообщения.',
        },
        {
          n: '02',
          title: 'Система строит картину',
          desc: 'Данные копятся в базе, дашборд показывает тренды: когда ты продуктивнее, как сон влияет на энергию.',
        },
        {
          n: '03',
          title: 'AI даёт конкретный совет',
          desc: 'Claude анализирует 7 дней и объясняет, что изменить. Не «спи больше», а «в среду при сне меньше 7 часов твоя энергия падает на 30%».',
        },
      ],
    },
    intro: {
      badge: 'В двух словах',
      title: 'Что такое Life OS',
      sub: 'Трекер, который работает на тебя, а не ты на него',
      lines: [
        'Заполняй чекин утром и вечером — всего 2 минуты.',
        'Система собирает данные о сне, энергии и настроении.',
        'AI-коуч анализирует паттерны и даёт конкретные советы.',
      ],
    },
    preview: {
      kicker: 'интерфейс',
      title: 'Превью продукта',
      sub: 'Три части системы в одном интерфейсе',
      tabs: [
        { key: 'dash', label: 'Дашборд' },
        { key: 'tg', label: 'Telegram-бот' },
        { key: 'ai', label: 'AI-коуч' },
      ],
    },
    arch: {
      kicker: 'архитектура',
      title: 'Под капотом',
      sub: 'Поток данных от пользователя до AI и обратно',
    },
    stack: {
      kicker: 'стек',
      title: 'Технологии',
      sub: 'Надёжный стек для production-продукта',
    },
    testimonial: {
      quote: 'За две недели я впервые увидел связь между сном и своей продуктивностью. Бот не просто записывает — он думает вместе со мной.',
      author: 'Максим',
      role: 'разработчик',
    },
    footer: {
      tgLabel: 'Начать → t.me/CoreOS_ai_bot',
      tgLink: 'https://t.me/CoreOS_ai_bot',
      copy: '© 2025 Life OS',
    },
    heroMock: {
      greeting: 'Доброе утро, Максим 👋',
      streak: '🔥 7 дней подряд',
      energy: 'Энергия',
      sleep: 'Сон',
      energyVal: '82%',
      sleepVal: '7.5ч',
      chart: 'Неделя в графике',
    },
    dashTab: {
      title: 'Дашборд',
      greeting: 'Доброе утро, Максим',
      date: 'Четверг, 26 июня',
      metrics: [
        { label: 'Энергия', value: '82%', color: '#4D9FFF' },
        { label: 'Сон', value: '7.5ч', color: '#29B6F6' },
        { label: 'Настроение', value: '8/10', color: '#7FBBFF' },
        { label: 'Стрик', value: '7 дней', color: '#5BA7FF' },
      ],
      chartLabel: 'Энергия за неделю',
    },
    tgTab: {
      messages: [
        { from: 'bot', text: '🌅 Доброе утро! Готов к чекину?' },
        { from: 'user', text: 'Да, поехали' },
        { from: 'bot', text: '⚡ На сколько оцениваешь энергию? (1–10)' },
        { from: 'user', text: '8' },
        { from: 'bot', text: '😴 Сколько часов спал?' },
        { from: 'user', text: '7.5' },
        { from: 'bot', text: '✅ Записано! Твой стрик: 7 дней 🔥' },
      ],
    },
    aiTab: {
      prompt: 'Анализ моей недели',
      response:
        'За последние 7 дней средняя энергия — 7.4/10. Пик в среду (9/10), спад в пятницу (5/10). Паттерн: когда сон < 7ч, энергия падает на 30%. Рекомендация: поставь напоминание на 23:00 для отхода ко сну.',
      label: 'AI-коуч',
    },
  },
  en: {
    nav: {
      links: [
        { label: 'Features', href: '#features' },
        { label: 'How it works', href: '#how' },
        { label: 'Architecture', href: '#arch' },
        { label: 'Stack', href: '#stack' },
      ],
      github: 'GitHub',
    },
    hero: {
      badge: 'Your AI coach in Telegram',
      title1: 'Life management',
      title2: 'system',
      subtitle:
        'Two questions a day — and you see how sleep, energy and mood connect. The AI coach analyses your patterns and gives personalised recommendations.',
      cta1: 'See preview',
      cta2: 'Open GitHub',
      ctaTg: 'Start free',
    },
    features: {
      kicker: 'features',
      title: 'What Life OS can do',
      sub: 'Everything you need to work intentionally with your energy',
      cards: [
        {
          icon: '💬',
          title: 'Check-in via Telegram',
          desc: 'The bot reminds you morning and evening. Two questions — energy and sleep. Under two minutes, no app to open.',
        },
        {
          icon: '📊',
          title: 'Sleep & energy dashboard',
          desc: 'See weekly and monthly trends. Instantly know which days you perform best and what drives it.',
        },
        {
          icon: '🤖',
          title: 'Personal AI recommendations',
          desc: 'Claude analyses your 7-day data and gives a concrete tip — not generic advice, but a conclusion from your own patterns.',
        },
      ],
    },
    howItWorks: {
      kicker: 'process',
      title: 'How it works',
      sub: 'Three steps from first check-in to personal insight',
      steps: [
        {
          n: '01',
          title: 'Fill in a check-in via Telegram',
          desc: 'The bot asks two questions: energy level and hours of sleep. No registration — just reply to the messages.',
        },
        {
          n: '02',
          title: 'The system builds a picture',
          desc: 'Data accumulates in the database; the dashboard shows trends — when you are most productive and how sleep affects energy.',
        },
        {
          n: '03',
          title: 'AI gives a concrete tip',
          desc: 'Claude analyses 7 days and explains what to change. Not "sleep more", but "on Wednesdays with less than 7 h of sleep your energy drops by 30%".',
        },
      ],
    },
    intro: {
      badge: 'In a nutshell',
      title: 'What is Life OS',
      sub: 'A tracker that works for you, not the other way around',
      lines: [
        'Fill a check-in morning and evening — just 2 minutes.',
        'The system collects data on sleep, energy and mood.',
        'AI coach analyses patterns and gives concrete advice.',
      ],
    },
    preview: {
      kicker: 'interface',
      title: 'Product preview',
      sub: 'Three parts of the system in one interface',
      tabs: [
        { key: 'dash', label: 'Dashboard' },
        { key: 'tg', label: 'Telegram bot' },
        { key: 'ai', label: 'AI coach' },
      ],
    },
    arch: {
      kicker: 'architecture',
      title: 'Under the hood',
      sub: 'Data flow from user to AI and back',
    },
    stack: {
      kicker: 'stack',
      title: 'Technologies',
      sub: 'Reliable stack for a production product',
    },
    testimonial: {
      quote: 'In two weeks I saw for the first time how sleep and my productivity are connected. The bot doesn\'t just record — it thinks alongside me.',
      author: 'Maksim',
      role: 'developer',
    },
    footer: {
      tgLabel: 'Start → t.me/CoreOS_ai_bot',
      tgLink: 'https://t.me/CoreOS_ai_bot',
      copy: '© 2025 Life OS',
    },
    heroMock: {
      greeting: 'Good morning, Maksym 👋',
      streak: '🔥 7 days in a row',
      energy: 'Energy',
      sleep: 'Sleep',
      energyVal: '82%',
      sleepVal: '7.5h',
      chart: 'Week at a glance',
    },
    dashTab: {
      title: 'Dashboard',
      greeting: 'Good morning, Maksym',
      date: 'Thursday, June 26',
      metrics: [
        { label: 'Energy', value: '82%', color: '#4D9FFF' },
        { label: 'Sleep', value: '7.5h', color: '#29B6F6' },
        { label: 'Mood', value: '8/10', color: '#7FBBFF' },
        { label: 'Streak', value: '7 days', color: '#5BA7FF' },
      ],
      chartLabel: 'Energy this week',
    },
    tgTab: {
      messages: [
        { from: 'bot', text: '🌅 Good morning! Ready for check-in?' },
        { from: 'user', text: "Yes, let's go" },
        { from: 'bot', text: '⚡ Rate your energy level (1–10)' },
        { from: 'user', text: '8' },
        { from: 'bot', text: '😴 How many hours did you sleep?' },
        { from: 'user', text: '7.5' },
        { from: 'bot', text: '✅ Saved! Your streak: 7 days 🔥' },
      ],
    },
    aiTab: {
      prompt: 'Analyse my week',
      response:
        'Over the last 7 days, average energy was 7.4/10. Peak on Wednesday (9/10), dip on Friday (5/10). Pattern: when sleep < 7h, energy drops by 30%. Recommendation: set a reminder at 23:00 for bedtime.',
      label: 'AI coach',
    },
  },
};

export const stackGroups = [
  {
    name: 'Frontend',
    items: ['React 18', 'TypeScript', 'Vite', 'CSS Modules'],
  },
  {
    name: 'Backend',
    items: ['Node.js', 'Express', 'SQLite', 'Anthropic API'],
  },
  {
    name: 'Деплой',
    items: ['Vercel', 'GitHub Actions', 'Docker'],
  },
  {
    name: 'Инструменты',
    items: ['VS Code', 'Git', 'Figma', 'Postman'],
  },
];

export const archNodes = [
  { id: 'tg', label: 'Telegram', sub: 'Пользователь' },
  { id: 'react', label: 'React', sub: 'Дашборд' },
  { id: 'api', label: 'Express API', sub: 'Бэкенд' },
  { id: 'ai', label: 'Anthropic', sub: 'AI-коуч' },
  { id: 'db', label: 'SQLite / JSON', sub: 'Хранилище' },
];
