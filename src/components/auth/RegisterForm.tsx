"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/utils/supabase/client'
import { Button } from '../ui'
import { Input } from '../Input/Input'
import { Label } from '../Label/Label'

export const RegisterForm = () => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [registrationSuccess, setRegistrationSuccess] = React.useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Debug state to show detailed error information
  const [showDebug, setShowDebug] = React.useState(false)
  const [debugInfo, setDebugInfo] = React.useState<any>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setDebugInfo(null)
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      // First check if the session already exists
      const { data: sessionData } = await supabase.auth.getSession()

      // Log session check for debugging
      console.log('Current session check before registration:', sessionData)

      // Try to register
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          // Force auto-confirm for testing
          data: {
            email_confirm: true
          }
        },
      })

      // Store debug info
      setDebugInfo({
        sessionBefore: sessionData,
        registrationAttempt: { data, error },
        email: email,
        // Don't include password in debug info for security
      })

      if (error) {
        throw error
      }

      // With auto-confirm enabled, the user should be automatically confirmed
      setRegistrationSuccess(true)

      // If auto-confirm is enabled, we can redirect directly to login
      // Otherwise, we'll show a success message with instructions
    } catch (error) {
      console.error('Registration error:', error)
      if (error instanceof Error && error.message.includes('confirmation email')) {
        // Handle email sending error specifically
        setError('Your account was created, but there was an issue sending the confirmation email. You can still sign in.')
        setRegistrationSuccess(true)
      } else if (error instanceof Error && error.message.includes('User already registered')) {
        // Handle existing user error
        setError('An account with this email already exists. Please try logging in instead.')
      } else {
        setError(error instanceof Error ? error.message : 'An error occurred during registration')
      }
    } finally {
      setIsLoading(false)
    }
  }

  if (registrationSuccess) {
    return (
      <div className="space-y-4">
        <div className="p-6 bg-green-50 border border-green-200 rounded-lg shadow-sm">
          <div className="flex items-center justify-center mb-4 text-green-600">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-semibold text-center text-green-800">Account Created Successfully</h3>
          <p className="mt-2 text-center text-sm text-green-700">
            Your account has been created successfully and is ready to use.
          </p>
          {error && (
            <p className="mt-4 text-sm text-amber-600 text-center">
              {error}
            </p>
          )}
          <div className="mt-6 flex justify-center">
            <Button
              type="button"
              variant="default"
              size="lg"
              onClick={() => router.push('/auth/login')}
            >
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div>
          <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
            autoComplete="email"
            error={error}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Create a password"
            required
            autoComplete="new-password"
            error={error}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
        <div>
          <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm your password"
            required
            autoComplete="new-password"
            error={error}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && !registrationSuccess && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md" role="alert">
          <p className="text-sm text-red-600">
            {error}
            {' '}
            <button
              type="button"
              onClick={() => setShowDebug(!showDebug)}
              className="underline text-blue-600 hover:text-blue-800 font-medium"
            >
              {showDebug ? 'Hide Details' : 'Show Details'}
            </button>
          </p>

          {showDebug && debugInfo && (
            <div className="mt-2 p-2 bg-white rounded text-xs overflow-auto max-h-40 border border-gray-200">
              <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
            </div>
          )}
        </div>
      )}

      <Button
        type="submit"
        className="w-full"
        variant="default"
        size="lg"
        disabled={isLoading}
      >
        {isLoading ? 'Creating Account...' : 'Create Account'}
      </Button>
    </form>
  )
}