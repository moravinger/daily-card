import { showAlert } from '../utils/telegram.js';
import { supabase } from '../config.js';

function getInitData() {
  return window.Telegram?.WebApp?.initData || ''
}

function getFileValidationError(file) {
  if (file.size > 5 * 1024 * 1024) return 'Файл слишком большой (максимум 5 МБ)'
  if (!file.type.startsWith('image/')) return 'Это не изображение'
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
  const captionInput = document.getElementById('caption-input')
  const statusEl = document.getElementById('upload-status')

  if (!fileInput.files[0]) {
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
  const caption = captionInput?.value || ''
  const initData = getInitData()

  if (!initData) {
    showAlert('Ошибка: нет данных авторизации Telegram')
    return
  }

  statusEl.textContent = 'Загружаю...'
  statusEl.style.display = 'block'
  statusEl.style.color = '#999'

  try {
    statusEl.textContent = '⏳ Загружаю картинку в Storage...'
    statusEl.style.color = '#999'

    const ext = file.name.split('.').pop() || 'jpg'
    const fileName = `card_${date}.${ext}`

    const { error: uploadErr } = await supabase.storage
      .from('card-images')
      .upload(fileName, file, { upsert: true })
    if (uploadErr) throw new Error(`Storage: ${uploadErr.message}`)

    statusEl.textContent = '⏳ Получаю ссылку...'

    const { data: { publicUrl } } = supabase.storage
      .from('card-images')
      .getPublicUrl(fileName)

    statusEl.textContent = '⏳ Вызываю Edge Function...'

    const res = await fetch(
      'https://pibalfitreacyjfamhnq.supabase.co/functions/v1/upload-card',
      {
        method: 'POST',
        headers: { 'apikey': window.CONFIG?.SUPABASE_ANON_KEY || '' },
        body: JSON.stringify({ date, caption, imageUrl: publicUrl, initData }),
      },
    )

    statusEl.textContent = `⏳ Ответ: ${res.status} ${res.statusText}...`

    const text = await res.text()
    let result
    try { result = JSON.parse(text) } catch { throw new Error(`Сервер: ${text.substring(0, 200)}`) }

    if (!res.ok) throw new Error(result.error || 'Ошибка загрузки')

    statusEl.textContent = '✅ Карточка загружена!'
    statusEl.style.color = '#4CAF50'

    fileInput.value = ''
    dateInput.value = ''
    if (captionInput) captionInput.value = ''

    setTimeout(() => { statusEl.style.display = 'none' }, 3000)
  } catch (error) {
    console.error('Upload error:', error)
    statusEl.textContent = `❌ Ошибка: ${error.message}`
    statusEl.style.color = '#f44336'
  }
}

export function setMinDate() {
  const dateInput = document.getElementById('date-input')
  if (!dateInput) return
  const today = new Date()
  dateInput.min = new Date(today.getTime() - today.getTimezoneOffset() * 6e4).toISOString().split('T')[0]
}
