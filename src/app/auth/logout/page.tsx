"use client"

import React, { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'

export default function LogoutPage() {
  const [isLoggingOut, setIsLoggingOut] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const performLogout = async () => {
      try {
        await supabase.auth.signOut()
        
        // Clear any local storage items related to the session
        localStorage.removeItem('searchBuilderConcepts')
        localStorage.removeItem('searchBuilderOptions')
        localStorage.removeItem('editSearchData')
        
        setIsLoggingOut(false)
        
        // Redirect after a short delay to show the success message
        setTimeout(() => {
          router.push('/')
          router.refresh()
        }, 2000)
      } catch (error) {
        console.error('Logout error:', error)
        setError('An error occurred during logout. Please try again.')
        setIsLoggingOut(false)
      }
    }

    performLogout()
  }, [router, supabase.auth])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 text-center">
        {isLoggingOut ? (
          <>
            <h2 className="text-2xl font-bold">Logging out...</h2>
            <div className="flex justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
            </div>
          </>
        ) : error ? (
          <>
            <h2 className="text-2xl font-bold text-red-600">Logout Failed</h2>
            <p className="mt-2 text-gray-600">{error}</p>
            <div className="mt-4">
              <Link 
                href="/"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Home
              </Link>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-green-600">Successfully Logged Out</h2>
            <p className="mt-2 text-gray-600">You have been successfully logged out.</p>
            <p className="mt-1 text-gray-600">Redirecting to home page...</p>
          </>
        )}
      </div>
    </div>
  )
}
