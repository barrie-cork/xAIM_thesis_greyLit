import { Providers } from '@/components/Providers';
import { getSession } from '@/lib/auth/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Authentication | Grey Literature Search',
  description: 'Login, register, and manage your account',
}

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Check if user is already authenticated
  const session = await getSession();
  
  // If already authenticated, redirect to home page
  if (session) {
    redirect('/');
  }
  
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {children}
      </div>
    </div>
  );
}
