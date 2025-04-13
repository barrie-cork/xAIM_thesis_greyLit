"use client"

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '../ui'
import { LogOut, Loader2 } from 'lucide-react'

export const LogoutButton = () => {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const handleLogout = async () => {
    setIsLoading(true)

    try {
      await supabase.auth.signOut()

      // Clear any local storage items related to the session
      localStorage.removeItem('searchBuilderConcepts')
      localStorage.removeItem('searchBuilderOptions')
      localStorage.removeItem('editSearchData')

      // Redirect to home page
      router.push('/')
      router.refresh()
    } catch (error) {
      console.error('Logout error:', error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Button
      onClick={handleLogout}
      variant="outline"
      size="default"
      className="flex items-center gap-2"
      disabled={isLoading}
    >
      {isLoading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogOut className="h-4 w-4" />
      )}
      Sign Out
    </Button>
  )
}
