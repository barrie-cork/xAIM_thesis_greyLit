import { requireAuth } from '@/lib/auth/server';
import { SearchBuilderClient } from '@/components/search/SearchBuilderClient';
import Link from 'next/link';

export const metadata = {
  title: 'Search Builder | Advanced Search Tool',
  description: 'Build advanced search queries with keyword filters, domain restrictions, and file type specifications',
};

export default async function SearchBuilderPage() {
  const session = await requireAuth();
  
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Advanced Search Builder</h1>
            <p className="mt-2 text-lg text-gray-600">
              Create powerful search queries with keywords, trusted domains, and file type filtering
            </p>
          </div>
          <div className="flex space-x-4">
            <Link href="/" className="inline-flex items-center justify-center rounded-md bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300">
              Home
            </Link>
          </div>
        </div>

        <SearchBuilderClient userId={session.user.id} />
      </div>
    </div>
  );
}
