"use client"

import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function VerifyEmailPage() {
  const router = useRouter()

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Check your email
          </h2>
          <div className="mt-4 text-center text-gray-600">
            <p className="mb-4">
              We've sent you an email with a verification link. Please check your inbox and click the link to verify your account.
            </p>

            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-md text-left">
              <h3 className="text-md font-medium text-blue-800">Important Note</h3>
              <p className="mt-2 text-sm text-blue-700">
                You can sign in to your account even if you haven't verified your email yet. Email verification is recommended but not required.
              </p>
              <button
                onClick={() => router.push('/auth/login')}
                className="mt-3 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Sign in now
              </button>
            </div>

            <p className="mt-6 text-sm">
              Didn't receive an email?{' '}
              <Link
                href="/auth/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Try registering again
              </Link>
              {' '}or{' '}
              <Link
                href="/auth/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                return to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}