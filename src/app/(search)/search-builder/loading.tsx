import { Spinner } from '@/components/ui';

export default function SearchBuilderLoading() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12">
      <Spinner size="lg" className="mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Loading Search Builder</h2>
      <p className="text-gray-600">Please wait while we prepare the search builder...</p>
    </div>
  );
}
