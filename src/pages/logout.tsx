"use client"

import { type NextPage } from 'next';
import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { createClient } from '@/lib/supabase/client';
import Head from 'next/head';
import Link from 'next/link';

const LogoutPage: NextPage = () => {
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const logout = async () => {
      try {
        await supabase.auth.signOut();
        
        // Clear any local storage items related to the session
        localStorage.removeItem('searchBuilderConcepts');
        localStorage.removeItem('searchBuilderOptions');
        localStorage.removeItem('editSearchData');
        
        // Redirect to home page after a short delay
        setTimeout(() => {
          router.push('/');
        }, 1500);
      } catch (error) {
        console.error('Logout error:', error);
      }
    };

    logout();
  }, [router, supabase.auth]);

  return (
    <>
      <Head>
        <title>Logging Out | Grey Literature Search App</title>
        <meta name="description" content="Logging out of your account" />
      </Head>

      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 text-center p-8">
          <h1 className="text-3xl font-bold text-gray-900">Logging Out</h1>
          <div className="flex justify-center my-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
          <p className="text-gray-600">You are being logged out and will be redirected to the home page.</p>
          <div className="mt-6">
            <Link href="/" className="text-blue-600 hover:text-blue-800">
              Click here if you are not redirected automatically
            </Link>
          </div>
        </div>
      </div>
    </>
  );
};

export default LogoutPage;
