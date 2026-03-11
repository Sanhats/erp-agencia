import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/mongoose';
import AdminUser from '@/models/AdminUser';
import PasswordResetToken from '@/models/PasswordResetToken';
import crypto from 'crypto';
import { logAction, AuditAction } from '@/lib/audit';
import { getRequestInfo } from '@/lib/audit';
import { checkRateLimit, getClientIP } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import { sendPasswordResetEmail } from '@/lib/email';

export async function POST(request: NextRequest) {
  try {
    // Rate limiting: 5 requests por hora por IP
    const ip = getClientIP(request);
    const rateLimit = checkRateLimit(`forgot-password:${ip}`, {
      windowMs: 60 * 60 * 1000, // 1 hora
      maxRequests: 5,
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
            'X-RateLimit-Limit': '5',
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': new Date(rateLimit.resetTime).toISOString(),
          },
        }
      );
    }

    await connectDB();

    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email es requerido' }, { status: 400 });
    }

    // Buscar usuario
    const emailNormalized = email.toLowerCase().trim();
    const user = await AdminUser.findOne({ email: emailNormalized });

    // Por seguridad, siempre retornar éxito aunque el usuario no exista
    // para evitar enumeración de emails
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log(`[forgot-password] El email "${emailNormalized}" no está registrado. El correo solo se envía si el email existe en AdminUser (ej. el de ADMIN_EMAIL usado en el seed).`);
      }
      return NextResponse.json({
        message: 'Si el email existe, se enviará un enlace de recuperación',
      });
    }

    if (process.env.NODE_ENV === 'development') {
      console.log(`[forgot-password] Usuario encontrado (${user.email}), generando token y enviando email...`);
    }

    // Generar token
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 1); // Válido por 1 hora

    // Eliminar tokens anteriores no usados del usuario
    await PasswordResetToken.updateMany(
      { userId: user._id, used: false },
      { used: true }
    );

    // Crear nuevo token
    await PasswordResetToken.create({
      userId: user._id,
      token,
      expiresAt,
    });

    // Log de auditoría
    const { ipAddress, userAgent } = getRequestInfo(request);
    await logAction({
      userId: user._id,
      action: AuditAction.OTHER,
      resourceType: 'password_reset',
      description: `Solicitud de reset de contraseña para ${email}`,
      ipAddress,
      userAgent,
    });

    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;

    const emailSent = await sendPasswordResetEmail(user.email, resetUrl);

    if (!emailSent) {
      logger.warn('No se pudo enviar el email de recuperación', {
        to: user.email,
        hint: 'Revisa RESEND_API_KEY, RESEND_FROM (entre comillas en .env.local) y resend.com/logs',
      });
    }

    if (process.env.NODE_ENV === 'development') {
      return NextResponse.json({
        message: emailSent
          ? 'Token generado y email enviado (solo en desarrollo)'
          : 'Token generado pero no se pudo enviar el email. Revisa la consola del servidor y RESEND_FROM en .env.local',
        resetUrl,
        token,
        emailSent,
      });
    }

    return NextResponse.json({
      message: 'Si el email existe, se enviará un enlace de recuperación',
      emailSent,
    });
  } catch (error: any) {
    logger.error('Error in forgot password', error, { endpoint: '/api/auth/forgot-password' });
    return NextResponse.json(
      { error: 'Error al procesar solicitud' },
      { status: 500 }
    );
  }
}
