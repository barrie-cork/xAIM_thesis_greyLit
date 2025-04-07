import Link from 'next/link'

export default function AuthErrorPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-bold tracking-tight text-gray-900">
            Authentication Error
          </h2>
          <div className="mt-4 text-center text-gray-600">
            <p className="mb-4">
              There was a problem authenticating your account. This could be because:
            </p>
            <ul className="list-disc text-left pl-8 mb-4">
              <li>The verification link has expired</li>
              <li>The link has already been used</li>
              <li>There was a technical problem</li>
            </ul>
            <p className="text-sm">
              Please try{' '}
              <Link
                href="/auth/login"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                logging in
              </Link>
              {' '}or{' '}
              <Link
                href="/auth/register"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                register a new account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  )
} 