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
  setCardRevealed,
  setOfflineState,
  showToast,
} from './ui/display.js';
import { initAdminPanel, setMinDate } from './ui/admin.js';
import { formatCardDate, getTodayUTC } from './utils/date.js';

const REFRESH_INTERVAL_MS = 60 * 60 * 1000;
const LAST_CARD_KEY = 'daily-card:last-card:v1';
const REVEAL_KEY_PREFIX = 'daily-card:revealed:v1:';

let refreshTimer = null;
let activeLoad = null;
let displayedCardVersion = null;
let displayedCardUrl = null;
let displayedCardDate = null;

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

function hasRevealedCard(date) {
  try {
    return window.localStorage.getItem(`${REVEAL_KEY_PREFIX}${date}`) === '1';
  } catch {
    return false;
  }
}

function rememberCardReveal(date) {
  if (!date) return;
  try {
    window.localStorage.setItem(`${REVEAL_KEY_PREFIX}${date}`, '1');
  } catch {
    // The reveal still works when storage is unavailable.
  }
}

function updateCardDate(date) {
  const dateEl = document.getElementById('card-date-label');
  if (dateEl) dateEl.textContent = `Сегодня · ${formatCardDate(date)}`;
}

async function showCachedCard() {
  const cachedCard = readLastCard();
  if (!cachedCard) return false;

  try {
    await renderCard(cachedCard.imageUrl);
    displayedCardVersion = cachedCard.version || cachedCard.imageUrl;
    displayedCardUrl = cachedCard.imageUrl;
    displayedCardDate = cachedCard.date;
    updateCardDate(cachedCard.date);
    setCardRevealed(hasRevealedCard(cachedCard.date));
    setOfflineState(true);
    return true;
  } catch {
    return false;
  }
}

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

    if (card?.image_url) {
      const version = card.updated_at || card.image_url;
      if (version !== displayedCardVersion) {
        await renderCard(card.image_url);
        displayedCardVersion = version;
        displayedCardUrl = card.image_url;
        displayedCardDate = today;
        writeLastCard({
          date: today,
          imageUrl: card.image_url,
          version,
        });
      }
      setCardRevealed(hasRevealedCard(today));
      setOfflineState(false);
    } else if (isInitialLoad) {
      renderFallback();
      renderError('Сегодняшняя карточка ещё в пути. Загляните немного позже.', {
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

function revealCard() {
  if (!displayedCardDate) return;
  rememberCardReveal(displayedCardDate);
  setCardRevealed(true, { animate: true });
}

function openCardPreview() {
  if (!displayedCardUrl) return;
  const preview = document.getElementById('card-preview');
  const previewImage = document.getElementById('preview-image');
  if (!preview || !previewImage) return;
  previewImage.src = displayedCardUrl;
  preview.classList.add('visible');
  preview.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeCardPreview() {
  const preview = document.getElementById('card-preview');
  if (!preview) return;
  preview.classList.remove('visible');
  preview.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function openAdminPanel() {
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return;
  overlay.classList.add('visible');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

function closeAdminPanel() {
  const overlay = document.getElementById('admin-overlay');
  if (!overlay) return;
  overlay.classList.remove('visible');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

async function shareCard() {
  if (!displayedCardUrl) return;
  const shareData = {
    title: 'Карточка дня',
    text: 'Моя карточка дня',
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
    link.download = `daily-card-${displayedCardDate || getTodayUTC()}.jpg`;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    showToast('Карточка сохранена');
  } catch {
    window.open(displayedCardUrl, '_blank', 'noopener');
    showToast('Открыли карточку для сохранения');
  }
}

async function handleCardUploaded({ date }) {
  showToast('Карточка опубликована');
  if (date === getTodayUTC()) {
    displayedCardVersion = null;
    await loadCard();
  }
  window.setTimeout(closeAdminPanel, 700);
}

function initCardControls() {
  document.getElementById('retry-button')?.addEventListener('click', () => void loadCard());
  document.getElementById('reveal-button')?.addEventListener('click', revealCard);
  document.getElementById('card-open-button')?.addEventListener('click', openCardPreview);
  document.getElementById('preview-close-button')?.addEventListener('click', closeCardPreview);
  document.getElementById('preview-backdrop')?.addEventListener('click', closeCardPreview);
  document.getElementById('share-button')?.addEventListener('click', () => void shareCard());
  document.getElementById('save-button')?.addEventListener('click', () => void saveCard());
  document.getElementById('admin-toggle-button')?.addEventListener('click', openAdminPanel);
  document.getElementById('admin-close-button')?.addEventListener('click', closeAdminPanel);
  document.getElementById('admin-backdrop')?.addEventListener('click', closeAdminPanel);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
      closeCardPreview();
      closeAdminPanel();
    }
  });
}

async function subscribeUser() {
  try {
    const initData = window.Telegram?.WebApp?.initData;
    if (!initData) return;

    const userId = getUserId();
    const storageKey = userId ? `daily-card:subscribed:v1:${userId}` : null;
    if (readSubscriptionFlag(storageKey)) return;

    const { error } = await supabase.functions.invoke('subscribe-user', {
      body: { initData },
    });

    if (error) {
      console.warn('Subscribe failed:', error);
      return;
    }

    writeSubscriptionFlag(storageKey);
  } catch (error) {
    console.warn('Subscribe failed:', error);
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

function initApp() {
  const tg = initTelegramWebApp();
  if (tg && tgVersionAtLeast('6.1')) {
    tg.setHeaderColor('#0b0b0d');
  }

  void subscribeUser();
  initCardControls();
  void loadCard();
  startAutoRefresh();
  document.addEventListener('visibilitychange', handleVisibilityChange);

  const isAdminPreview = import.meta.env.DEV
    && new window.URLSearchParams(window.location.search).has('admin-preview');

  if (isAdmin() || isAdminPreview) {
    const toggleButton = document.getElementById('admin-toggle-button');
    if (toggleButton) {
      toggleButton.style.display = 'inline-flex';
      initAdminPanel({ onUploaded: handleCardUploaded });
      setMinDate();
    }
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
