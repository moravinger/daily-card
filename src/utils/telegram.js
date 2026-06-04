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
 * Получить User ID из Telegram. В режиме разработки имитирует админа.
 * @returns {number|null}
 */
export function getUserId() {
  // В настоящем приложении Telegram
  if (window.Telegram?.WebApp?.initDataUnsafe?.user?.id) {
    return window.Telegram.WebApp.initDataUnsafe.user.id;
  }

  // Для локальной разработки в браузере, если VITE_ADMIN_ID задан.
  // Vite заменяет import.meta.env.DEV на `true` в режиме `npm run dev`
  if (import.meta.env.DEV && import.meta.env.VITE_ADMIN_ID) {
    console.warn('DEV MODE: Имитируем ID администратора. Админ-панель должна быть видна.');
    return parseInt(import.meta.env.VITE_ADMIN_ID, 10);
  }

  return null;
}

/**
 * Проверить, является ли пользователь администратором
 * @returns {boolean}
 */
export function isAdmin() {
  const userId = getUserId();
  const adminId = parseInt(import.meta.env.VITE_ADMIN_ID, 10);
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
 * Показать уведомление (toast)
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
