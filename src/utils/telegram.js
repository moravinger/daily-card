import { CONFIG } from '../config.js'

/**
 * Инициализировать Telegram Web App
 */
export function initTelegramWebApp() {
  if (window.Telegram && window.Telegram.WebApp) {
    const tg = window.Telegram.WebApp;
    tg.ready();
    return tg;
  }
  console.warn('Telegram Web App SDK not available');
  return null;
}

/**
 * Получить User ID из Telegram
 * @returns {number|null}
 */
export function getUserId() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.initDataUnsafe) {
    return window.Telegram.WebApp.initDataUnsafe.user?.id || null;
  }
  return null;
}

/**
 * Проверить, является ли пользователь администратором
 * @returns {boolean}
 */
export function isAdmin() {
  const userId = getUserId();
  const adminId = CONFIG.ADMIN_ID || 0;
  return userId === adminId;
}

/**
 * Вибрация (haptic feedback)
 */
export function hapticFeedback() {
  if (window.Telegram && window.Telegram.WebApp && window.Telegram.WebApp.HapticFeedback) {
    window.Telegram.WebApp.HapticFeedback.impactOccurred('light');
  }
}

/**
 * Показать уведомление (alert)
 * @param {string} message
 */
export function showAlert(message) {
  if (window.Telegram && window.Telegram.WebApp) {
    window.Telegram.WebApp.showAlert(message);
  } else {
    alert(message);
  }
}

/**
 * Показать popup с кнопками
 * @param {string} message
 * @returns {Promise<boolean>}
 */
export function showConfirm(message) {
  return new Promise((resolve) => {
    if (window.Telegram && window.Telegram.WebApp) {
      window.Telegram.WebApp.showConfirm(message, (ok) => {
        resolve(ok);
      });
    } else {
      resolve(confirm(message));
    }
  });
}
