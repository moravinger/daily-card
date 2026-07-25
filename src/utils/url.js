export function withCacheBuster(value, timestamp = Date.now(), baseUrl) {
  const url = new URL(value, baseUrl)
  url.searchParams.set('t', String(timestamp))
  return url.toString()
}
