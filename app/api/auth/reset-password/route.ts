import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import AdminUser from '@/models/AdminUser';
import PasswordResetToken from '@/models/PasswordResetToken';
import bcrypt from 'bcryptjs';
import { logAction, AuditAction } from '@/lib/audit';
import { getRequestInfo } from '@/lib/audit';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 10 requests por hora por IP
    const ip = getClientIP(request);
    const rateLimit = checkRateLimit(`reset-password:${ip}`, {
      windowMs: 60 * 60 * 1000, // 1 hora
      maxRequests: 10,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: 'Demasiadas solicitudes. Por favor, intenta más tarde.',
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimit.resetTime - Date.now()) / 1000).toString(),
            'X-RateLimit-Limit': '10',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    await connectDB();

    const body = await request.json();
    const { token, newPassword } = body;

    if (!token || !newPassword) {
      return NextResponse.json(
        { error: 'Token y nueva contraseña son requeridos' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'La contraseña debe tener al menos 6 caracteres' },
        { status: 400 }
      );
    }

    // Buscar token válido
    const resetToken = await PasswordResetToken.findOne({
      token,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!resetToken) {
      return NextResponse.json(
        { error: 'Token inválido o expirado' },
        { status: 400 }
      );
    }

    // Buscar usuario
    const user = await AdminUser.findById(resetToken.userId);
    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña
    await AdminUser.findByIdAndUpdate(user._id, {
      password: hashedPassword,
    });

    // Marcar token como usado
    await PasswordResetToken.findByIdAndUpdate(resetToken._id, {
      used: true,
    });

    // Log de auditoría
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: user._id,
      action: AuditAction.OTHER,
      resourceType: 'password_reset',
      description: 'Contraseña restablecida exitosamente',
      ipAddress,
      userAgent,
    });

    return NextResponse.json({
      message: 'Contraseña restablecida exitosamente',
    });
  } catch (error: any) {
    logger.error('Error in reset password', error, { endpoint: '/api/auth/reset-password' });
    return NextResponse.json(
      { error: 'Error al restablecer contraseña' },
      { status: 500 }
    );
  }
}
