/**
 * Script para verificar que Resend está configurado y puede enviar emails.
 * Ejecutar: npx tsx scripts/test-resend.ts
 */
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(process.cwd(), '.env.local') });

async function testResend() {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM || 'ERP Agencia <onboarding@resend.dev>';
  const to = process.env.ADMIN_EMAIL || 'tu@email.com';

  if (!apiKey) {
    console.error('❌ RESEND_API_KEY no está definida en .env.local');
    process.exit(1);
  }

  console.log('Enviando email de prueba...');
  console.log('  From:', from);
  console.log('  To:', to);

  // Importar después de cargar env para que process.env esté disponible
  const { sendPasswordResetEmail } = await import('../lib/email');

  const testUrl = `${process.env.APP_BASE_URL || 'http://localhost:3000'}/reset-password?token=test`;
  const ok = await sendPasswordResetEmail(to, testUrl);

  if (ok) {
    console.log('✅ Email enviado correctamente. Revisa la bandeja de', to, '(y carpeta spam).');
  } else {
    console.log('❌ No se pudo enviar el email. Revisa RESEND_API_KEY y RESEND_FROM en .env.local');
    console.log('   En Resend (resend.com) verifica que el dominio "onboarding@resend.dev" esté permitido para pruebas.');
  }
  process.exit(ok ? 0 : 1);
}

testResend();
