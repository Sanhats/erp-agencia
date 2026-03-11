import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SidebarWrapper from '@/components/admin/SidebarWrapper';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let session;
  try {
    session = await getServerSession(authOptions);
  } catch (error) {
    console.error('Error getting session:', error);
    redirect('/login');
  }

  if (!session) {
    redirect('/login');
  }

  return (
    <div className="flex h-screen">
      <SidebarWrapper />
      <main className="flex-1 overflow-y-auto bg-gray-50">
        {children}
      </main>
    </div>
  );
}
