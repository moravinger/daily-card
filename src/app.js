import { initTelegramWebApp, getUserId, isAdmin, tgVersionAtLeast } from './utils/telegram.js';
import { getCardByDate } from './api/supabase.js';
import { showLoading, hideLoading, renderCard, renderFallback, renderError } from './ui/display.js';
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
export async function loadCard() {
  try {
    showLoading();

    const today = getTodayUTC();
    const card = await getCardByDate(today);

    if (card && card.image_url) {
      renderCard(card.image_url);
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
  if (tg && tgVersionAtLeast('6.1')) {
    tg.setHeaderColor('#0d0d0d');
  }

  // Загружаем карточку
  loadCard();

  // Показываем админ-панель, если пользователь админ
  if (isAdmin()) {
    const adminPanel = document.getElementById('admin-panel');
    const toggleContainer = document.getElementById('admin-toggle-container');
    const toggleButton = document.getElementById('admin-toggle-button');

    if (adminPanel && toggleContainer && toggleButton) {
      // Показываем кнопку для открытия админки
      toggleContainer.style.display = 'block';

      // Добавляем обработчик клика
      toggleButton.addEventListener('click', () => {
        adminPanel.classList.toggle('visible');
      });

      // Инициализируем логику формы внутри панели
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
