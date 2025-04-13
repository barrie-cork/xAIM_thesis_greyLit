"use client"

import { RegisterForm } from '@/components/auth/RegisterForm'
import Link from 'next/link'
import { AuthLayout } from '@/components/auth/AuthLayout'

export default function RegisterPage() {
  return (
    <AuthLayout
      title="Create a new account"
      subtitle={
        <>
          Or{' '}
          <Link
            href="/auth/login"
            className="font-medium text-blue-600 hover:text-blue-500 transition-colors"
          >
            sign in to your account
          </Link>
        </>
      }
    >
      <RegisterForm />
    </AuthLayout>
  )
}