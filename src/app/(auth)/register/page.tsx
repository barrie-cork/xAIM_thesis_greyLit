"use client"

import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'

export default function RegisterPage() {
  return (
    <>
      <div className="text-center">
        <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
          Create a new account
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          Or{' '}
          <Link
            href="/login"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            sign in to your account
          </Link>
        </p>
      </div>
      <div className="mt-8">
        <RegisterForm />
      </div>
    </>
  )
}
