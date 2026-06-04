import './app.css';
import { initTelegramWebApp, getUserId, isAdmin } from './utils/telegram.js';
import { getCardByDate } from './api/supabase.js';
import { showLoading, hideLoading, renderCard, renderFallback, renderError, clearUI } from './ui/display.js';
import { initAdminPanel, setMinDate } from './ui/admin.js';

/**
 * Получить текущую дату в UTC
 * @returns {string} - YYYY-MM-DD
 */
function getTodayUTC() {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const date = String(now.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${date}`;
}

/**
 * Загрузить и отобразить карточку
 */
async function loadCard() {
  try {
    showLoading();
    clearUI();

    const today = getTodayUTC();
    const card = await getCardByDate(today);

    if (card && card.image_url) {
      renderCard(card.image_url, card.caption);
    } else {
      renderFallback();
    }
  } catch (error) {
    console.error('Error loading card:', error);
    renderError(`Ошибка: ${error.message}`);
    renderFallback();
  } finally {
    hideLoading();
  }
}

/**
 * Инициализировать приложение
 */
function initApp() {
  // Инициализируем Telegram Web App
  const tg = initTelegramWebApp();
  if (tg) {
    tg.setHeaderColor('#0d0d0d');
  }

  // Загружаем карточку
  loadCard();

  // Показываем админ-панель, если пользователь админ
  if (isAdmin()) {
    const adminPanel = document.getElementById('admin-panel');
    if (adminPanel) {
      adminPanel.classList.add('visible');
      initAdminPanel();
      setMinDate();
    }
  }

  // Обновляем карточку каждый час
  setInterval(loadCard, 60 * 60 * 1000);
}

// Запускаем при готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
