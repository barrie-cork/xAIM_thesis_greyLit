import type { NextPage } from 'next';
import Head from 'next/head';
import SearchBuilder from '@/components/search/SearchBuilder';

const SearchBuilderPage: NextPage = () => {
  return (
    <>
      <Head>
        <title>Search Builder | Advanced Search Tool</title>
        <meta name="description" content="Build advanced search queries with keyword filters, domain restrictions, and file type specifications" />
      </Head>
      
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Advanced Search Builder</h1>
            <p className="mt-2 text-lg text-gray-600">
              Create powerful search queries with keywords, trusted domains, and file type filtering
            </p>
          </div>
          
          <SearchBuilder />
        </div>
      </div>
    </>
  );
};

export default SearchBuilderPage; 