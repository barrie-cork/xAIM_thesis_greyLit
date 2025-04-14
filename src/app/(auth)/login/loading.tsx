import { Spinner } from '@/components/ui';

export default function LoginLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <Spinner size="lg" className="mb-4" />
      <h2 className="text-2xl font-semibold mb-2">Loading Login</h2>
      <p className="text-gray-600">Please wait...</p>
    </div>
  );
}
