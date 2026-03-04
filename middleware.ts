import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

/**
 * Protege las rutas API exigiendo sesión JWT válida.
 * Rutas públicas: /api/auth/*, /api/seed
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplicar a rutas bajo /api/
  if (!pathname.startsWith('/api/')) {
    return NextResponse.next();
  }

  // Excluir rutas públicas y overdue (esta última valida CRON_SECRET o sesión en el route)
  if (
    pathname.startsWith('/api/auth/') ||
    pathname === '/api/seed' ||
    pathname === '/api/billing/overdue'
  ) {
    return NextResponse.next();
  }

  const secret = process.env.NEXTAUTH_SECRET;
  if (!secret) {
    console.error('NEXTAUTH_SECRET is not set');
    return NextResponse.json(
      { error: 'Configuración de autenticación incorrecta' },
      { status: 500 }
    );
  }

  const token = await getToken({
    req: request,
    secret,
  });

  if (!token) {
    return NextResponse.json(
      { error: 'No autorizado' },
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/api/:path*'],
};
