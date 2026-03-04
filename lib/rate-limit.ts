// Simple in-memory rate limiter
// En producción, usar Redis o similar

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

export interface RateLimitOptions {
  windowMs: number; // Ventana de tiempo en milisegundos
  maxRequests: number; // Máximo de requests en la ventana
}

/**
 * Rate limiter simple en memoria
 * @param identifier - Identificador único (IP, userId, etc.)
 * @param options - Opciones de rate limiting
 * @returns true si se permite la request, false si se excede el límite
 */
export function checkRateLimit(
  identifier: string,
  options: RateLimitOptions
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  // Limpiar entradas expiradas periódicamente (cada 1000 requests)
  if (Math.random() < 0.001) {
    Object.keys(store).forEach((k) => {
      if (store[k].resetTime < now) {
        delete store[k];
      }
    });
  }

  const entry = store[key];

  if (!entry || entry.resetTime < now) {
    // Nueva ventana
    store[key] = {
      count: 1,
      resetTime: now + options.windowMs,
    };
    return {
      allowed: true,
      remaining: options.maxRequests - 1,
      resetTime: now + options.windowMs,
    };
  }

  if (entry.count >= options.maxRequests) {
    // Límite excedido
    return {
      allowed: false,
      remaining: 0,
      resetTime: entry.resetTime,
    };
  }

  // Incrementar contador
  entry.count++;
  return {
    allowed: true,
    remaining: options.maxRequests - entry.count,
    resetTime: entry.resetTime,
  };
}

/**
 * Obtiene el IP address de una request
 */
export function getClientIP(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  const realIP = headers.get('x-real-ip');
  const remoteAddr = headers.get('x-remote-addr');

  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  if (realIP) {
    return realIP;
  }
  if (remoteAddr) {
    return remoteAddr;
  }
  return 'unknown';
}

export default checkRateLimit;
