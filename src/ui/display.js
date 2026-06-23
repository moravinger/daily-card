import { hapticFeedback } from '../utils/telegram.js';

/**
 * Показать спиннер загрузки
 */
export function showLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'flex';
}

/**
 * Скрыть спиннер
 */
export function hideLoading() {
  const loadingEl = document.getElementById('loading');
  if (loadingEl) loadingEl.style.display = 'none';
}

/**
 * Отобразить карточку с анимацией
 * @param {string} imageUrl
 * @param {string} caption
 */
export function renderCard(imageUrl) {
  const cardContainer = document.getElementById('card-container');
  const cardImage = document.getElementById('card-image');
  const placeholderEl = document.getElementById('placeholder');

  if (placeholderEl) {
    placeholderEl.style.display = 'none';
  }

  if (cardImage && imageUrl) {
    const cacheBuster = `?t=${Date.now()}`
    cardImage.src = imageUrl + cacheBuster;
    cardImage.style.opacity = '0';

    cardImage.onload = () => {
      cardImage.style.transition = 'opacity 0.8s ease-in-out';
      cardImage.style.opacity = '1';
      hapticFeedback();
    };

    cardImage.onerror = () => {
      console.error('Image failed to load, showing fallback:', imageUrl);
      renderFallback();
    };
  }

  if (cardContainer) {
    cardContainer.style.display = 'block';
  }
}

/**
 * Показать заглушку (fallback)
 * @param {string} fallbackImageUrl
 */
export function renderFallback(fallbackImageUrl = null) {
  const cardContainer = document.getElementById('card-container');
  const placeholderEl = document.getElementById('placeholder');

  if (cardContainer) {
    cardContainer.style.display = 'none';
  }

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
export function renderError(message) {
  const errorEl = document.getElementById('error');
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.style.display = 'block';
  }
}

