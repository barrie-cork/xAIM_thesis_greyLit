import { requireAuth } from '@/lib/auth/server';
import { LogoutButton } from '@/components/auth/LogoutButton';
import Link from 'next/link';

export const metadata = {
  title: 'Dashboard | Grey Literature Search',
  description: 'Manage your searches and results',
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Require authentication for all dashboard pages
  const session = await requireAuth();
  
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <Link href="/" className="text-xl font-bold text-gray-900">
            Grey Literature Search
          </Link>
          <nav className="flex items-center space-x-4">
            <Link href="/search-builder" className="text-gray-600 hover:text-gray-900">
              Search Builder
            </Link>
            <Link href="/saved-searches" className="text-gray-600 hover:text-gray-900">
              Saved Searches
            </Link>
            <LogoutButton />
          </nav>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}
