require('dotenv').config();
const crypto = require('crypto');
const jwt = require('jsonwebtoken');

// Секрет для JWT: отдельный JWT_SECRET, иначе используем токен бота (он тоже секретный)
const JWT_SECRET = process.env.JWT_SECRET || process.env.TELEGRAM_TOKEN;

/**
 * Проверяет подпись данных Telegram Login Widget.
 * https://core.telegram.org/widgets/login#checking-authorization
 * @param {object} data — объект от виджета: {id, first_name, username?, photo_url?, auth_date, hash}
 * @returns {boolean}
 */
function verifyTelegramAuth(data) {
  const { hash, ...fields } = data;
  if (!hash || !fields.id || !fields.auth_date) return false;

  const checkString = Object.keys(fields)
    .sort()
    .map((k) => `${k}=${fields[k]}`)
    .join('\n');

  const secretKey = crypto.createHash('sha256').update(process.env.TELEGRAM_TOKEN).digest();
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex');

  const hmacBuf = Buffer.from(hmac, 'hex');
  const hashBuf = Buffer.from(String(hash), 'hex');
  if (hmacBuf.length !== hashBuf.length || !crypto.timingSafeEqual(hmacBuf, hashBuf)) {
    return false;
  }

  // Данные авторизации не старше суток
  const ageSeconds = Math.floor(Date.now() / 1000) - Number(fields.auth_date);
  return ageSeconds < 86400;
}

function signToken(userId) {
  return jwt.sign({ user_id: String(userId) }, JWT_SECRET, { expiresIn: '30d' });
}

// Express middleware: достаёт user_id из Bearer-токена в req.userId
function authMiddleware(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });

  try {
    req.userId = jwt.verify(token, JWT_SECRET).user_id;
    next();
  } catch (_) {
    res.status(401).json({ error: 'invalid token' });
  }
}

module.exports = { verifyTelegramAuth, signToken, authMiddleware };
