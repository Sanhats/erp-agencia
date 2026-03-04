'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { signOut, useSession } from 'next-auth/react';

const navigation = [
  { name: 'Dashboard', href: '/admin/dashboard' },
  { name: 'Clientes', href: '/admin/clients' },
  { name: 'Servicios', href: '/admin/services' },
  { name: 'Facturación', href: '/admin/billing' },
  { name: 'Escalamientos', href: '/admin/scope-changes' },
  { name: 'Reportes', href: '/admin/reports' },
  { name: 'Configuración', href: '/admin/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <div className="flex h-screen w-64 flex-col bg-gray-900 text-white">
      <div className="flex h-16 items-center justify-center border-b border-gray-800">
        <h1 className="text-xl font-bold">ERP Agencia</h1>
      </div>
      
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`block rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-gray-800 p-4">
        <div className="mb-2 text-sm text-gray-400">
          <p className="font-medium text-white">{session?.user?.name}</p>
          <p className="text-xs">{session?.user?.email}</p>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: '/login' })}
          className="w-full rounded-md bg-red-600 px-3 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors"
        >
          Cerrar Sesión
        </button>
      </div>
    </div>
  );
}
