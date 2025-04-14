import { RegisterForm } from '@/components/auth/RegisterForm';
import { getSession } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export const metadata = {
  title: 'Register | Grey Literature Search',
  description: 'Create a new Grey Literature Search account',
};

export default async function RegisterPage() {
  // Check if the user is already logged in
  const session = await getSession();
  
  // If the user is already logged in, redirect to the home page
  if (session) {
    redirect('/');
  }
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900">
            Create a new account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Or{' '}
            <a
              href="/auth/login"
              className="font-medium text-indigo-600 hover:text-indigo-500"
            >
              login to your existing account
            </a>
          </p>
        </div>
        
        <RegisterForm />
      </div>
    </div>
  );
}
