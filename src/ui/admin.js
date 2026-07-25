import { showAlert } from '../utils/telegram.js';
import { supabase } from '../config.js';
import { getTodayLocal } from '../utils/date.js';

function getInitData() {
  return window.Telegram?.WebApp?.initData || ''
}

function getFileValidationError(file) {
  if (file.size > 5 * 1024 * 1024) return 'Файл слишком большой (максимум 5 МБ)'
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    return 'Поддерживаются только JPEG, PNG и WebP'
  }
  return null
}

export function initAdminPanel() {
  const uploadForm = document.getElementById('upload-form')
  if (!uploadForm) return
  uploadForm.addEventListener('submit', handleFormSubmit)
}

async function handleFormSubmit(e) {
  e.preventDefault()

  const fileInput = document.getElementById('file-input')
  const dateInput = document.getElementById('date-input')
  const statusEl = document.getElementById('upload-status')
  const submitButton = e.submitter

  if (!fileInput || !dateInput || !statusEl) return

  if (!fileInput.files?.[0]) {
    showAlert('Выбери картинку')
    return
  }

  if (!dateInput.value) {
    showAlert('Выбери дату')
    return
  }

  const file = fileInput.files[0]
  const validationError = getFileValidationError(file)
  if (validationError) {
    showAlert(validationError)
    return
  }

  const date = dateInput.value
  const initData = getInitData()

  if (!initData) {
    showAlert('Ошибка: нет данных авторизации Telegram')
    return
  }

  statusEl.textContent = 'Загружаю...'
  statusEl.style.display = 'block'
  statusEl.style.color = '#999'
  if (submitButton) submitButton.disabled = true

  try {
    const formData = new FormData()
    formData.set('file', file)
    formData.set('date', date)
    formData.set('initData', initData)

    const { error } = await supabase.functions.invoke('upload-card', {
      body: formData,
    })
    if (error) throw error

    statusEl.textContent = '✅ Карточка загружена!'
    statusEl.style.color = '#4CAF50'

    fileInput.value = ''
    dateInput.value = ''

    setTimeout(() => { window.location.reload() }, 1000)
  } catch (error) {
    console.error('Upload error:', error)
    statusEl.textContent = '❌ Не удалось загрузить карточку. Попробуйте ещё раз.'
    statusEl.style.color = '#f44336'
  } finally {
    if (submitButton) submitButton.disabled = false
  }
}

export function setMinDate() {
  const dateInput = document.getElementById('date-input')
  if (!dateInput) return
  dateInput.min = getTodayLocal()
}
