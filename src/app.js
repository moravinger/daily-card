import { initTelegramWebApp, isAdmin, tgVersionAtLeast } from './utils/telegram.js';
import { getCardByDate } from './api/supabase.js';
import { supabase } from './config.js';
import {
  showLoading,
  hideLoading,
  hideError,
  renderCard,
  renderFallback,
  renderError,
} from './ui/display.js';
import { initAdminPanel, setMinDate } from './ui/admin.js';
import { getTodayUTC } from './utils/date.js';

/**
 * Загрузить и отобразить карточку
 */
export async function loadCard() {
  try {
    hideError();
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
    renderError('Не удалось загрузить карточку. Проверьте соединение и попробуйте ещё раз.');
    renderFallback();
  } finally {
    hideLoading();
  }
}

/**
 * Подписать пользователя на уведомления
 */
async function subscribeUser() {
  try {
    const initData = window.Telegram?.WebApp?.initData
    if (!initData) return

    const { error } = await supabase.functions.invoke('subscribe-user', {
      body: { initData },
    })

    if (error) console.warn('Subscribe failed:', error)
  } catch (error) {
    console.warn('Subscribe failed:', error)
  }
}

/**
 * Инициализировать приложение
 */
function initApp() {
  const tg = initTelegramWebApp();
  if (tg && tgVersionAtLeast('6.1')) {
    tg.setHeaderColor('#0d0d0d');
  }

  void subscribeUser();

  void loadCard();

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
  setInterval(() => void loadCard(), 60 * 60 * 1000);
}

// Запускаем при готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
