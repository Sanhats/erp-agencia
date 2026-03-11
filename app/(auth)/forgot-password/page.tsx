'use client';

import { useState } from 'react';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [resetUrl, setResetUrl] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState<boolean | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Error al procesar solicitud');
      }

      setSuccess(true);
      if (data.resetUrl) setResetUrl(data.resetUrl);
      setEmailSent(data.emailSent ?? null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error al procesar solicitud');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
          <h1 className="text-2xl font-bold text-green-600 mb-4">Solicitud Enviada</h1>
          <p className="text-gray-600 mb-4">
            Si el email existe en nuestro sistema, recibirás un enlace para restablecer tu
            contraseña.
          </p>
          {emailSent === false && (
            <div className="mb-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
              <strong>No se pudo enviar el correo.</strong> Revisa la terminal del servidor para ver el error. En <code className="bg-amber-100 px-1">.env.local</code> usa comillas: <code className="bg-amber-100 px-1">RESEND_FROM=&quot;ERP Agencia &lt;onboarding@resend.dev&gt;&quot;</code>
            </div>
          )}
          <div className="mt-4 text-center">
            <a href="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">
              Volver al login
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Recuperar Contraseña</h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Enviando...' : 'Enviar Enlace de Recuperación'}
          </button>
        </form>

        <div className="mt-4 text-center">
          <a href="/login" className="text-sm text-indigo-600 hover:text-indigo-800">
            Volver al login
          </a>
        </div>
      </div>
    </div>
  );
}
