"use client"

import { LoginForm } from '@/components/auth/LoginForm'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function LoginPage() {
  return (
    <AuthLayout
      title="Sign in to your account"
      subtitle={
        <>
          Or{' '}
          <Link
            href="/auth/register"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            create a new account
          </Link>
        </>
      }
    >
      <LoginForm />
    </AuthLayout>
  )
}