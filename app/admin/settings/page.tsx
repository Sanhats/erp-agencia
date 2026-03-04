import connectDB from '@/lib/mongoose';
import Settings from '@/models/Settings';
import Link from 'next/link';

export default async function SettingsPage() {
  await connectDB();
  const settings = await Settings.findOne();

  const nextSequence = settings?.nextSequence ?? 1;
  const nextInvoiceNumber = `INV-${String(nextSequence).padStart(4, '0')}`;

  return (
    <div className="p-6">
      <h1 className="mb-6 text-2xl font-bold text-gray-900">Configuración</h1>

      <div className="space-y-6">
        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Numeración de facturas
          </h2>
          <p className="text-sm text-gray-600">
            El próximo número de factura que se generará en el ciclo de facturación
            es:
          </p>
          <p className="mt-2 font-mono text-xl font-medium text-gray-900">
            {nextInvoiceNumber}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            (Secuencia interna: {nextSequence})
          </p>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">
            Cuenta y seguridad
          </h2>
          <p className="mb-4 text-sm text-gray-600">
            Para cambiar tu contraseña, solicita un enlace de recuperación por
            correo.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block rounded-md bg-gray-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700"
          >
            Cambiar contraseña
          </Link>
        </section>

        <section className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Entorno</h2>
          <p className="text-sm text-gray-600">
            Entorno actual:{' '}
            <span className="font-medium">
              {process.env.NODE_ENV === 'production' ? 'Producción' : 'Desarrollo'}
            </span>
          </p>
        </section>
      </div>
    </div>
  );
}
