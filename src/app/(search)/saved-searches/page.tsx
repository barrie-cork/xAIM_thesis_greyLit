import { requireAuth } from '@/lib/auth/server';
import { SavedSearchesClient } from '@/components/search/SavedSearchesClient';

export const metadata = {
  title: 'Saved Searches | Grey Literature Search',
  description: 'View and manage your saved search strategies',
};

export default async function SavedSearchesPage() {
  const session = await requireAuth();
  
  return (
    <div className="container mx-auto py-8 px-4">
      <h1 className="text-3xl font-bold mb-6">Saved Searches</h1>
      <SavedSearchesClient userId={session.user.id} />
    </div>
  );
}
