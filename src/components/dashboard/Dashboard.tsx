'use client';

import Link from 'next/link';
import { LogoutButton } from '@/components/auth/LogoutButton';

interface DashboardProps {
  userId: string;
}

export function Dashboard({ userId }: DashboardProps) {
  return (
    <main className="container mx-auto py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-4xl font-bold">Grey Literature Search App</h1>
          <div className="flex space-x-4">
            <LogoutButton />
          </div>
        </div>
        <p className="text-lg text-gray-600 mb-8">
          Systematically search, screen, and extract insights from non-traditional sources using
          structured strategies, automation, and transparency.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">Advanced Search Builder</h2>
            <p className="text-gray-600 mb-4">
              Create powerful search strategies with keywords, file type filters, and
              domain-specific constraints for more effective literature searches.
            </p>
            <Link href="/search-builder" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              Open Builder
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">Saved Searches</h2>
            <p className="text-gray-600 mb-4">
              View, manage, and execute your saved search strategies. Access your search history
              and reuse effective queries.
            </p>
            <Link href="/saved-searches" className="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">
              View Saved Searches
            </Link>
          </div>

          <div className="bg-white p-6 rounded-lg border shadow-sm hover:shadow-md transition-shadow">
            <h2 className="text-xl font-semibold mb-3">Document Review</h2>
            <p className="text-gray-600 mb-4">
              Review search results, tag documents, and extract key information from
              grey literature sources.
            </p>
            <button disabled className="inline-flex items-center justify-center rounded-md bg-gray-300 px-4 py-2 text-sm font-medium text-gray-600 cursor-not-allowed">
              Coming Soon
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
