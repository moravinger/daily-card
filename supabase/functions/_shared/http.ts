export function corsHeaders(request: Request) {
  const allowedOrigin = Deno.env.get('ALLOWED_ORIGIN') || '*'
  const requestOrigin = request.headers.get('origin')
  const origin = allowedOrigin === '*' || requestOrigin === allowedOrigin
    ? (requestOrigin || allowedOrigin)
    : allowedOrigin

  return {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  }
}

export function jsonResponse(
  request: Request,
  body: unknown,
  status = 200,
  extraHeaders: Record<string, string> = {},
) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(request),
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      ...extraHeaders,
    },
  })
}
