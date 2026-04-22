import { NextResponse } from 'next/server';

export interface ApiErrorResponse {
  error: string;
  code: string;
  details?: any;
}

export const ApiErrors = {
  // 400 Bad Request
  badRequest(message = 'Geçersiz istek', code = 'BAD_REQUEST', details?: any) {
    return NextResponse.json({ error: message, code, details }, { status: 400 });
  },

  // 401 Unauthorized
  unauthorized(message = 'Yetkisiz erişim', code = 'UNAUTHORIZED') {
    return NextResponse.json({ error: message, code }, { status: 401 });
  },

  // 403 Forbidden
  forbidden(message = 'Bu işlem için yetkiniz yok', code = 'FORBIDDEN') {
    return NextResponse.json({ error: message, code }, { status: 403 });
  },

  // 404 Not Found
  notFound(message = 'Kaynak bulunamadı', code = 'NOT_FOUND') {
    return NextResponse.json({ error: message, code }, { status: 404 });
  },

  // 409 Conflict
  conflict(message = 'Çakışma oluştu', code = 'CONFLICT') {
    return NextResponse.json({ error: message, code }, { status: 409 });
  },

  // 429 Too Many Requests
  tooManyRequests(message = 'Çok fazla istek gönderildi', code = 'TOO_MANY_REQUESTS', retryAfter?: number) {
    const headers: Record<string, string> = {};
    if (retryAfter !== undefined) {
      headers['Retry-After'] = String(retryAfter);
    }
    return NextResponse.json({ error: message, code }, { status: 429, headers });
  },

  // 500 Internal Server Error
  internalError(message = 'Sunucu hatası oluştu', code = 'INTERNAL_SERVER_ERROR') {
    return NextResponse.json({ error: message, code }, { status: 500 });
  }
};
