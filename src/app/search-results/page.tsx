import { requireAuth } from '@/lib/auth/server';
import { SearchResultsClient } from '@/components/search/SearchResultsClient';

export const metadata = {
  title: 'Search Results | Grey Literature Search',
  description: 'View and manage your search results',
};

export default async function SearchResultsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await requireAuth();
  const searchId = searchParams.id as string;
  
  if (!searchId) {
    return (
      <div className="container mx-auto py-8 px-4">
        <h1 className="text-3xl font-bold mb-6">Search Results</h1>
        <p>No search ID provided. Please start a new search.</p>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Search Results</h1>
      <SearchResultsClient searchId={searchId} userId={session.user.id} />
    </div>
  );
}
