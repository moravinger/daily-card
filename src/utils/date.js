export function getTodayUTC(now = new Date()) {
  const year = now.getUTCFullYear()
  const month = String(now.getUTCMonth() + 1).padStart(2, '0')
  const date = String(now.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${date}`
}

export function getTodayLocal(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000)
  return local.toISOString().split('T')[0]
}

export function formatCardDate(value, locale = 'ru-RU') {
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(Date.UTC(year, month - 1, day))
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'UTC',
  }).format(date)
}
