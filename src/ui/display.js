import { hapticFeedback } from '../utils/telegram.js';

let hasRenderedCard = false;

/**
 * Показать спиннер загрузки
 */
export function showLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'block';
}

/**
 * Скрыть спиннер
 */
export function hideLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';
}

/**
 * Скрыть предыдущее сообщение об ошибке
 */
export function hideError() {
  const errorEl = document.getElementById('error');
  if (errorEl) {
    errorEl.style.display = 'none';
  }
}

export function isCardRendered() {
  return hasRenderedCard;
}

async function preloadImage(imageUrl) {
  const image = new Image();
  image.decoding = 'async';
  image.src = imageUrl;

  if (typeof image.decode === 'function') {
    await image.decode();
    return;
  }

  await new Promise((resolve, reject) => {
    image.onload = resolve;
    image.onerror = reject;
  });
}

/**
 * Отобразить карточку с анимацией
 * @param {string} imageUrl
 */
export async function renderCard(imageUrl) {
  const cardContainer = document.getElementById('card-container');
  const cardImage = document.getElementById('card-image');
  const placeholderEl = document.getElementById('placeholder');
  const ambientEl = document.getElementById('ambient-background');

  if (!cardImage || !imageUrl) return;

  await preloadImage(imageUrl);

  const isFirstRender = !hasRenderedCard;
  if (isFirstRender) cardImage.style.opacity = '0';

  cardImage.src = imageUrl;
  cardImage.style.opacity = '1';
  if (ambientEl) ambientEl.style.backgroundImage = `url("${imageUrl}")`;
  hasRenderedCard = true;

  if (cardContainer) {
    cardContainer.style.display = 'block';
  }

  if (placeholderEl) {
    placeholderEl.style.display = 'none';
  }

  hideError();
}

export function setCardRevealed(revealed, { animate = false } = {}) {
  const cardContainer = document.getElementById('card-container');
  const revealCover = document.getElementById('reveal-cover');
  const revealedContent = document.getElementById('revealed-content');
  const revealButton = document.getElementById('reveal-button');
  const title = document.getElementById('screen-title');
  const footer = document.getElementById('app-footer');

  if (!cardContainer || !revealCover || !revealedContent) return;

  if (revealed) {
    if (revealButton) revealButton.disabled = true;
    if (animate) {
      cardContainer.classList.add('revealing');
      window.setTimeout(() => {
        revealCover.style.display = 'none';
        revealedContent.style.display = 'block';
        cardContainer.classList.add('reveal-entering');
      }, 430);
      window.setTimeout(() => {
        cardContainer.classList.remove('revealing', 'reveal-entering');
      }, 1000);
    } else {
      revealCover.style.display = 'none';
      revealedContent.style.display = 'block';
    }
    if (title) title.textContent = 'Карточка дня';
    if (footer) footer.textContent = 'Нажми на карточку, чтобы открыть полностью';
    if (animate) hapticFeedback();
    return;
  }

  cardContainer.classList.remove('revealing', 'reveal-entering');
  if (revealButton) revealButton.disabled = false;
  revealCover.style.display = 'block';
  revealedContent.style.display = 'none';
  if (title) title.textContent = 'Твоя карточка на сегодня';
  if (footer) footer.textContent = 'Новая карточка каждый день';
}

/**
 * Показать заглушку (fallback)
 * @param {string} fallbackImageUrl
 */
export function renderFallback(fallbackImageUrl = null) {
  const cardContainer = document.getElementById('card-container');
  const placeholderEl = document.getElementById('placeholder');
  const ambientEl = document.getElementById('ambient-background');

  if (cardContainer) {
    cardContainer.style.display = 'none';
  }
  hasRenderedCard = false;
  if (ambientEl) ambientEl.style.backgroundImage = '';

  if (placeholderEl) {
    placeholderEl.style.display = 'flex';
  }

  if (fallbackImageUrl) {
    const fallbackImg = document.getElementById('fallback-image');
    if (fallbackImg) {
      fallbackImg.src = fallbackImageUrl;
    }
  }
}

/**
 * Показать ошибку
 * @param {string} message
 */
export function renderError(message, { retry = true } = {}) {
  const errorEl = document.getElementById('error');
  const messageEl = document.getElementById('error-message');
  const retryButton = document.getElementById('retry-button');
  if (errorEl) {
    errorEl.style.display = 'block';
  }
  if (messageEl) messageEl.textContent = message;
  if (retryButton) retryButton.style.display = retry ? 'inline-flex' : 'none';
}

export function setOfflineState(isOffline) {
  const badge = document.getElementById('offline-badge');
  if (badge) badge.style.display = isOffline ? 'inline-flex' : 'none';
}

export function showToast(message) {
  const toast = document.getElementById('toast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('visible');
  window.setTimeout(() => toast.classList.remove('visible'), 2200);
}
