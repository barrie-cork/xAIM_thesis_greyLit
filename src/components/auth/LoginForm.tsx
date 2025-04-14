"use client"

import React from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/utils/supabase/client'
import { Button } from '../ui'
import { Input } from '../Input/Input'
import { Label } from '../Label/Label'

export const LoginForm = () => {
  const [email, setEmail] = React.useState('')
  const [password, setPassword] = React.useState('')
  const [error, setError] = React.useState<string | null>(null)
  const [isLoading, setIsLoading] = React.useState(false)
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

    try {
      // First check if the session already exists
      const { data: sessionData } = await supabase.auth.getSession()

      // Log session check for debugging
      console.log('Current session check:', sessionData)

      // Try to sign in
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      // Store debug info
      setDebugInfo({
        sessionBefore: sessionData,
        loginAttempt: { data, error },
        email: email,
        // Don't include password in debug info for security
      })

      if (error) {
        throw error
      }

      // Clear any localStorage items that might be causing issues
      localStorage.removeItem('searchBuilderConcepts')
      localStorage.removeItem('searchBuilderOptions')
      localStorage.removeItem('editSearchData')

      // Redirect to home page instead of dashboard since dashboard doesn't exist yet
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Login error:', error)

      // Check for specific error types
      if (error instanceof Error) {
        if (error.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. If you just registered, please try again or register a new account.')
        } else {
          setError(error.message)
        }
      } else {
        setError('An error occurred during login')
      }
    } finally {
      setIsLoading(false)
    }
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
            placeholder="Enter your password"
            required
            autoComplete="current-password"
            error={error}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          />
        </div>
      </div>

      {error && (
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
        {isLoading ? 'Signing in...' : 'Sign In'}
      </Button>

      <div className="text-center mt-4">
        <Link
          href="/auth/register"
          className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
        >
          Don't have an account? Register
        </Link>
      </div>
    </form>
  )
}