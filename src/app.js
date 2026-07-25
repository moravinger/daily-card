import {
  getUserId,
  initTelegramWebApp,
  isAdmin,
  tgVersionAtLeast,
} from './utils/telegram.js';
import { getCardByDate } from './api/supabase.js';
import { supabase } from './config.js';
import {
  showLoading,
  hideLoading,
  hideError,
  isCardRendered,
  renderCard,
  renderFallback,
  renderError,
  setOfflineState,
  showToast,
} from './ui/display.js';
import { initAdminPanel, setMinDate } from './ui/admin.js';
import { formatCardDate, getTodayUTC } from './utils/date.js';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
let refreshTimer = null;
let activeLoad = null;
let displayedCardVersion = null;
let displayedCardUrl = null;

const LAST_CARD_KEY = 'daily-card:last-card:v1';

function readSubscriptionFlag(storageKey) {
  if (!storageKey) return false;
  try {
    return window.localStorage.getItem(storageKey) === '1';
  } catch {
    return false;
  }
}

function writeSubscriptionFlag(storageKey) {
  if (!storageKey) return;
  try {
    window.localStorage.setItem(storageKey, '1');
  } catch {
    // Registration still succeeded when storage is unavailable.
  }
}

function readLastCard() {
  try {
    const value = JSON.parse(window.localStorage.getItem(LAST_CARD_KEY));
    if (!value?.imageUrl || !value?.date) return null;
    return value;
  } catch {
    return null;
  }
}

function writeLastCard(card) {
  try {
    window.localStorage.setItem(LAST_CARD_KEY, JSON.stringify(card));
  } catch {
    // The network card remains available when storage is unavailable.
  }
}

function updateCardDate(date) {
  const dateEl = document.getElementById('card-date');
  if (dateEl) dateEl.textContent = formatCardDate(date);
}

async function showCachedCard() {
  const cachedCard = readLastCard();
  if (!cachedCard) return false;

  try {
    await renderCard(cachedCard.imageUrl);
    displayedCardVersion = cachedCard.version || cachedCard.imageUrl;
    displayedCardUrl = cachedCard.imageUrl;
    updateCardDate(cachedCard.date);
    setOfflineState(true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Загрузить и отобразить карточку
 */
export async function loadCard() {
  if (activeLoad) return activeLoad;

  activeLoad = loadCardInternal();
  try {
    await activeLoad;
  } finally {
    activeLoad = null;
  }
}

async function loadCardInternal() {
  const isInitialLoad = !isCardRendered();

  try {
    hideError();
    if (isInitialLoad) showLoading();

    const today = getTodayUTC();
    updateCardDate(today);
    const card = await getCardByDate(today);

    if (card && card.image_url) {
      const version = card.updated_at || card.image_url;
      if (version !== displayedCardVersion) {
        await renderCard(card.image_url);
        displayedCardVersion = version;
        displayedCardUrl = card.image_url;
        writeLastCard({
          date: today,
          imageUrl: card.image_url,
          version,
        });
      }
      setOfflineState(false);
    } else if (isInitialLoad) {
      renderFallback();
      renderError('Сегодняшняя карточка ещё готовится. Загляните немного позже.', {
        retry: false,
      });
    }
  } catch (error) {
    console.error('Error loading card:', error);
    if (isInitialLoad) {
      const restored = await showCachedCard();
      if (!restored) {
        renderFallback();
        renderError('Не удалось загрузить карточку. Проверьте соединение и попробуйте ещё раз.');
      }
    }
  } finally {
    if (isInitialLoad) hideLoading();
  }
}

function openCardPreview() {
  if (!displayedCardUrl) return;
  const preview = document.getElementById('card-preview');
  const previewImage = document.getElementById('preview-image');
  if (!preview || !previewImage) return;
  previewImage.src = displayedCardUrl;
  preview.classList.add('visible');
  preview.setAttribute('aria-hidden', 'false');
  document.body.classList.add('preview-open');
}

function closeCardPreview() {
  const preview = document.getElementById('card-preview');
  if (!preview) return;
  preview.classList.remove('visible');
  preview.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('preview-open');
}

async function shareCard() {
  if (!displayedCardUrl) return;
  const shareData = {
    title: 'Карточка дня',
    text: 'Карточка дня',
    url: displayedCardUrl,
  };

  try {
    if (navigator.share) {
      await navigator.share(shareData);
      return;
    }
    await navigator.clipboard.writeText(displayedCardUrl);
    showToast('Ссылка скопирована');
  } catch (error) {
    if (error?.name !== 'AbortError') showToast('Не удалось поделиться');
  }
}

async function saveCard() {
  if (!displayedCardUrl) return;

  try {
    const response = await fetch(displayedCardUrl);
    if (!response.ok) throw new Error('Image download failed');
    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = objectUrl;
    link.download = `daily-card-${getTodayUTC()}.jpg`;
    link.click();
    URL.revokeObjectURL(objectUrl);
    showToast('Карточка сохранена');
  } catch {
    window.open(displayedCardUrl, '_blank', 'noopener');
    showToast('Открыли карточку для сохранения');
  }
}

function initCardControls() {
  document.getElementById('retry-button')?.addEventListener('click', () => void loadCard());
  document.getElementById('card-open-button')?.addEventListener('click', openCardPreview);
  document.getElementById('preview-close-button')?.addEventListener('click', closeCardPreview);
  document.getElementById('share-button')?.addEventListener('click', () => void shareCard());
  document.getElementById('save-button')?.addEventListener('click', () => void saveCard());
  document.getElementById('preview-backdrop')?.addEventListener('click', closeCardPreview);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeCardPreview();
  });
}

/**
 * Подписать пользователя на уведомления
 */
async function subscribeUser() {
  try {
    const initData = window.Telegram?.WebApp?.initData
    if (!initData) return

    const userId = getUserId()
    const storageKey = userId ? `daily-card:subscribed:v1:${userId}` : null
    if (readSubscriptionFlag(storageKey)) return

    const { error } = await supabase.functions.invoke('subscribe-user', {
      body: { initData },
    })

    if (error) {
      console.warn('Subscribe failed:', error)
      return
    }

    writeSubscriptionFlag(storageKey)
  } catch (error) {
    console.warn('Subscribe failed:', error)
  }
}

function stopAutoRefresh() {
  if (refreshTimer === null) return;
  clearInterval(refreshTimer);
  refreshTimer = null;
}

function startAutoRefresh() {
  stopAutoRefresh();
  if (document.hidden) return;
  refreshTimer = setInterval(() => void loadCard(), REFRESH_INTERVAL_MS);
}

function handleVisibilityChange() {
  if (document.hidden) {
    stopAutoRefresh();
    return;
  }

  void loadCard();
  startAutoRefresh();
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

  initCardControls();
  void loadCard();
  startAutoRefresh();
  document.addEventListener('visibilitychange', handleVisibilityChange);

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

}

// Запускаем при готовности DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
