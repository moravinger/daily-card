import { showAlert } from '../utils/telegram.js';
import { supabase } from '../config.js';
import { getTodayLocal } from '../utils/date.js';

let previewUrl = null;
let uploadSuccessHandler = null;

function getInitData() {
  return window.Telegram?.WebApp?.initData || '';
}

function getFileValidationError(file) {
  if (file.size > 5 * 1024 * 1024) return 'Файл слишком большой (максимум 5 МБ)';
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Поддерживаются только JPEG, PNG и WebP';
  }
  return null;
}

function formatFileSize(bytes) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} КБ`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} МБ`;
}

function clearPreview() {
  const previewImage = document.getElementById('admin-preview-image');
  const previewEmpty = document.getElementById('admin-preview-empty');
  const fileMeta = document.getElementById('file-meta');

  if (previewUrl) {
    URL.revokeObjectURL(previewUrl);
    previewUrl = null;
  }
  if (previewImage) {
    previewImage.removeAttribute('src');
    previewImage.style.display = 'none';
  }
  if (previewEmpty) previewEmpty.style.display = 'block';
  if (fileMeta) fileMeta.textContent = 'JPEG, PNG или WebP · до 5 МБ';
}

function handleFileChange(event) {
  const file = event.target.files?.[0];
  if (!file) {
    clearPreview();
    return;
  }

  const validationError = getFileValidationError(file);
  if (validationError) {
    event.target.value = '';
    clearPreview();
    showAlert(validationError);
    return;
  }

  clearPreview();
  const previewImage = document.getElementById('admin-preview-image');
  const previewEmpty = document.getElementById('admin-preview-empty');
  const fileMeta = document.getElementById('file-meta');
  previewUrl = URL.createObjectURL(file);

  if (previewImage) {
    previewImage.src = previewUrl;
    previewImage.style.display = 'block';
  }
  if (previewEmpty) previewEmpty.style.display = 'none';
  if (fileMeta) fileMeta.textContent = `${file.name} · ${formatFileSize(file.size)}`;
}

function setUploadStatus(message, state = '') {
  const status = document.getElementById('upload-status');
  if (!status) return;
  status.textContent = message;
  status.className = state;
  status.style.display = message ? 'block' : 'none';
}

function resetAdminForm() {
  const fileInput = document.getElementById('file-input');
  const dateInput = document.getElementById('date-input');
  if (fileInput) fileInput.value = '';
  if (dateInput) dateInput.value = getTodayLocal();
  clearPreview();
}

export function initAdminPanel({ onUploaded } = {}) {
  const uploadForm = document.getElementById('upload-form');
  const fileInput = document.getElementById('file-input');
  if (!uploadForm || !fileInput) return;

  uploadSuccessHandler = onUploaded || null;
  uploadForm.addEventListener('submit', handleFormSubmit);
  fileInput.addEventListener('change', handleFileChange);
}

async function handleFormSubmit(event) {
  event.preventDefault();

  const fileInput = document.getElementById('file-input');
  const dateInput = document.getElementById('date-input');
  const submitButton = event.submitter;

  if (!fileInput || !dateInput) return;

  const file = fileInput.files?.[0];
  if (!file) {
    showAlert('Выбери картинку');
    return;
  }

  if (!dateInput.value) {
    showAlert('Выбери дату');
    return;
  }

  const validationError = getFileValidationError(file);
  if (validationError) {
    showAlert(validationError);
    return;
  }

  const date = dateInput.value;
  const initData = getInitData();
  if (!initData) {
    showAlert('Ошибка: нет данных авторизации Telegram');
    return;
  }

  setUploadStatus('Загружаю карточку…');
  if (submitButton) submitButton.disabled = true;

  try {
    const formData = new FormData();
    formData.set('file', file);
    formData.set('date', date);
    formData.set('initData', initData);

    const { data, error } = await supabase.functions.invoke('upload-card', {
      body: formData,
    });
    if (error) throw error;

    setUploadStatus('Карточка опубликована', 'success');
    resetAdminForm();
    if (uploadSuccessHandler) {
      await uploadSuccessHandler({ date, imageUrl: data?.imageUrl || null });
    }
  } catch (error) {
    console.error('Upload error:', error);
    setUploadStatus('Не удалось загрузить карточку. Попробуйте ещё раз.', 'error');
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
}

export function setMinDate() {
  const dateInput = document.getElementById('date-input');
  if (!dateInput) return;
  const today = getTodayLocal();
  dateInput.min = today;
  if (!dateInput.value) dateInput.value = today;
}
