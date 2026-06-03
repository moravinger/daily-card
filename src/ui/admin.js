import { uploadCardImage, saveCard } from '../api/supabase.js';
import { showAlert } from '../utils/telegram.js';

/**
 * Инициализировать админ-панель
 */
export function initAdminPanel() {
  const adminPanel = document.getElementById('admin-panel');
  if (!adminPanel) return;

  const uploadForm = document.getElementById('upload-form');
  if (!uploadForm) return;

  uploadForm.addEventListener('submit', handleFormSubmit);
}

/**
 * Обработчик отправки формы
 */
async function handleFormSubmit(e) {
  e.preventDefault();

  const fileInput = document.getElementById('file-input');
  const dateInput = document.getElementById('date-input');
  const captionInput = document.getElementById('caption-input');
  const statusEl = document.getElementById('upload-status');

  if (!fileInput.files[0]) {
    showAlert('Выбери картинку');
    return;
  }

  if (!dateInput.value) {
    showAlert('Выбери дату');
    return;
  }

  const file = fileInput.files[0];
  const date = dateInput.value;
  const caption = captionInput?.value || '';

  // Показываем статус
  if (statusEl) {
    statusEl.textContent = 'Загружаю...';
    statusEl.style.display = 'block';
    statusEl.style.color = '#999';
  }

  try {
    // 1. Загружаем картинку
    const imageUrl = await uploadCardImage(file, date);

    // 2. Сохраняем в БД
    await saveCard(date, imageUrl, caption);

    // Успех!
    if (statusEl) {
      statusEl.textContent = '✅ Карточка загружена!';
      statusEl.style.color = '#4CAF50';
    }

    // Очищаем форму
    fileInput.value = '';
    dateInput.value = '';
    if (captionInput) captionInput.value = '';

    // Скрываем статус через 3 секунды
    setTimeout(() => {
      if (statusEl) statusEl.style.display = 'none';
    }, 3000);
  } catch (error) {
    console.error('Upload error:', error);
    if (statusEl) {
      statusEl.textContent = `❌ Ошибка: ${error.message}`;
      statusEl.style.color = '#f44336';
    }
  }
}

/**
 * Установить минимальную дату (сегодня в UTC)
 */
export function setMinDate() {
  const dateInput = document.getElementById('date-input');
  if (!dateInput) return;

  const today = new Date();
  const utcDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000);
  const dateString = utcDate.toISOString().split('T')[0];
  dateInput.min = dateString;
}
