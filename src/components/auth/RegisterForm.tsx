"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Input } from '../Input/Input'
import { Label } from '../Label/Label'
import { Button } from '../Button/Button'

export const RegisterForm = () => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [confirmPassword, setConfirmPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
  const [registrationSuccess, setRegistrationSuccess] = React.useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      setIsLoading(false)
      return
    }

    try {
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
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
        <div className="p-4 bg-green-50 border border-green-200 rounded-md">
          <h3 className="text-lg font-medium text-green-800">Account Created Successfully</h3>
          <p className="mt-2 text-sm text-green-700">
            Your account has been created successfully and is ready to use.
          </p>
          {error && (
            <p className="mt-2 text-sm text-amber-600">
              {error}
            </p>
          )}
          <div className="mt-4">
            <Button
              type="button"
              className="mr-2"
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
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          autoComplete="email"
          error={error}
        />
      </div>
      <div>
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Create a password"
          required
          autoComplete="new-password"
          error={error}
        />
      </div>
      <div>
        <Label htmlFor="confirmPassword">Confirm Password</Label>
        <Input
          id="confirmPassword"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
          required
          autoComplete="new-password"
          error={error}
        />
      </div>
      {error && !registrationSuccess && (
        <p className="text-sm text-red-500" role="alert">
          {error}
        </p>
      )}
      <Button
        type="submit"
        className="w-full"
        isLoading={isLoading}
      >
        Create Account
      </Button>
    </form>
  )
}