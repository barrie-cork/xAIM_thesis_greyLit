import { type NextPage } from 'next';
import Head from 'next/head';
import Link from 'next/link';

const Home: NextPage = () => {
  return (
    <>
      <Head>
        <title>Grey Literature Search App</title>
        <meta name="description" content="Search and tag grey literature with AI assistance" />
      </Head>
      
      <main className="container mx-auto py-12 px-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-6">Grey Literature Search App</h1>
          <p className="text-lg text-gray-600 mb-8">
            Systematically search, screen, and extract insights from non-traditional sources using 
            structured strategies, automation, and transparency.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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
    </>
  );
};

export default Home; 