import { requireAuth } from '@/lib/auth/server';
import { SearchBuilderClient } from '@/components/search/SearchBuilderClient';

export const metadata = {
  title: 'Search Builder | Advanced Search Tool',
  description: 'Build advanced search queries with keyword filters, domain restrictions, and file type specifications',
};

export default async function SearchBuilderPage() {
  const session = await requireAuth();
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Advanced Search Builder</h1>
        <p className="mt-2 text-lg text-gray-600">
          Create powerful search queries with keywords, trusted domains, and file type filtering
        </p>
      </div>

      <SearchBuilderClient userId={session.user.id} />
    </div>
  );
}
