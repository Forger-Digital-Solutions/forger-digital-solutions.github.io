export interface CorsOptions {
  allowedOrigins: string[];
  allowedMethods: string[];
  allowedHeaders: string[];
  maxAge: number;
}

export const DEFAULT_CORS_OPTIONS: CorsOptions = {
  allowedOrigins: [],
  allowedMethods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400
};

export function buildCorsHeaders(origin: string | null, options: CorsOptions): Record<string, string> {
  const headers: Record<string, string> = {};
  if (origin && options.allowedOrigins.includes(origin) && origin !== '*') {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Vary'] = 'Origin';
  }

  headers['Access-Control-Allow-Methods'] = options.allowedMethods.join(', ');
  headers['Access-Control-Allow-Headers'] = options.allowedHeaders.join(', ');
  headers['Access-Control-Max-Age'] = String(options.maxAge);

  return headers;
}

export function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) return true; // Explicitly permit non-browser/server clients; browsers send Origin.
  if (allowedOrigins.length === 0 || allowedOrigins.includes('*')) return false;
  return allowedOrigins.includes(origin);
}

export function corsResponse(body: unknown, origin: string | null, options: CorsOptions, status = 200): Response {
  const headers = buildCorsHeaders(origin, options);
  headers['Content-Type'] = 'application/json';
  return new Response(JSON.stringify(body), { status, headers });
}

export function corsPreflightResponse(origin: string | null, options: CorsOptions): Response {
  const headers = buildCorsHeaders(origin, options);
  return new Response(null, { status: 204, headers });
}
