import { Resend } from 'resend';
import logger from '@/lib/logger';

const resendApiKey = process.env.RESEND_API_KEY;
const rawFrom = process.env.RESEND_FROM || '';
const resendFrom =
  rawFrom.includes('@') ? rawFrom.trim() : 'ERP Agencia <onboarding@resend.dev>';

/**
 * Envía un email con el enlace para restablecer la contraseña.
 * Si RESEND_API_KEY no está definida, no envía y devuelve false (sin lanzar error).
 */
export async function sendPasswordResetEmail(
  to: string,
  resetUrl: string
): Promise<boolean> {
  if (!resendApiKey) {
    logger.warn('RESEND_API_KEY no configurada; no se envía email de recuperación');
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Resend] ⚠️ RESEND_API_KEY no está definida en .env.local');
    }
    return false;
  }

  try {
    const resend = new Resend(resendApiKey);
    const { data, error } = await resend.emails.send({
      from: resendFrom,
      to: [to],
      subject: 'Restablecer contraseña - ERP Agencia',
      html: `
        <p>Has solicitado restablecer tu contraseña.</p>
        <p>Haz clic en el siguiente enlace (válido durante 1 hora):</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      `,
    });

    if (error) {
      logger.error('Error al enviar email de recuperación', new Error(error.message), {
        to,
        from: resendFrom,
        resendError: error,
      });
      if (process.env.NODE_ENV === 'development') {
        console.error('[Resend] ❌ Error:', error.message, error);
      }
      return false;
    }

    const emailId = (data as { id?: string })?.id;
    logger.info('Email de recuperación enviado', { to, resendId: emailId });
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Resend] ✅ Email enviado a ${to} | Asunto: "Restablecer contraseña - ERP Agencia" | ID en Resend: ${emailId ?? 'N/A'}`);
    }
    return true;
  } catch (err) {
    logger.error(
      'Error al enviar email de recuperación',
      err instanceof Error ? err : new Error(String(err)),
      { to }
    );
    return false;
  }
}
