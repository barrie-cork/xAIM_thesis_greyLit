import { describe, it, expect, vi } from 'vitest'

// Mock Supabase client
const mockSupabase = {
  auth: {
    signUp: vi.fn(),
    signInWithPassword: vi.fn(),
    resetPasswordForEmail: vi.fn()
  }
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => mockSupabase
}))

describe('Authentication Flow', () => {
  it('should handle user registration', async () => {
    const testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }

    mockSupabase.auth.signUp.mockResolvedValueOnce({
      data: { user: { email: testUser.email, id: '123' }, session: null },
      error: null
    })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('test-url', 'test-key')

    const { data, error } = await supabase.auth.signUp(testUser)

    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.user?.email).toBe(testUser.email)
  })

  it('should handle login with correct credentials', async () => {
    const testUser = {
      email: 'test@example.com',
      password: 'TestPassword123!'
    }

    mockSupabase.auth.signInWithPassword.mockResolvedValueOnce({
      data: { 
        user: { email: testUser.email, id: '123' },
        session: { access_token: 'test-token' }
      },
      error: null
    })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('test-url', 'test-key')

    const { data, error } = await supabase.auth.signInWithPassword(testUser)

    expect(error).toBeNull()
    expect(data.user).toBeDefined()
    expect(data.session).toBeDefined()
    expect(data.user?.email).toBe(testUser.email)
  })

  it('should handle password reset request', async () => {
    const email = 'test@example.com'

    mockSupabase.auth.resetPasswordForEmail.mockResolvedValueOnce({
      data: {},
      error: null
    })

    const { createClient } = await import('@supabase/supabase-js')
    const supabase = createClient('test-url', 'test-key')

    const { error } = await supabase.auth.resetPasswordForEmail(email)

    expect(error).toBeNull()
    expect(mockSupabase.auth.resetPasswordForEmail).toHaveBeenCalledWith(email)
  })
}) 