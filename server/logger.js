// Простой структурированный логгер: [время] [уровень] [модуль] сообщение
function ts() {
  return new Date().toISOString();
}

function make(scope) {
  return {
    info: (...args) => console.log(`[${ts()}] [INFO] [${scope}]`, ...args),
    warn: (...args) => console.warn(`[${ts()}] [WARN] [${scope}]`, ...args),
    error: (...args) => console.error(`[${ts()}] [ERROR] [${scope}]`, ...args),
  };
}

module.exports = { make };
