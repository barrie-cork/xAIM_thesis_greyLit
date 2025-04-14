import { describe, it, expect, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react-hooks';
import { useTRPCMutation } from '@/hooks/useTRPCMutation';
import { trpc } from '@/utils/trpc';

// Mock the trpc hooks
vi.mock('@/utils/trpc', () => ({
  trpc: {
    search: {
      execute: {
        useMutation: vi.fn().mockImplementation((options) => ({
          mutate: vi.fn().mockImplementation((input) => {
            // Simulate successful mutation
            options?.onSuccess?.({ searchRequestId: '123' } as any);
          }),
          mutateAsync: vi.fn().mockImplementation(async (input) => {
            // Simulate successful mutation
            options?.onSuccess?.({ searchRequestId: '123' } as any);
            return { searchRequestId: '123' };
          }),
          isLoading: false,
          isSuccess: true,
          error: null,
        })),
      },
    },
  },
}));

describe('useTRPCMutation', () => {
  it('returns the mutation and helper functions', () => {
    const { result } = renderHook(() => useTRPCMutation('search.execute'));
    
    expect(result.current.mutation).toBeDefined();
    expect(result.current.error).toBeNull();
    expect(result.current.isSuccess).toBe(false);
    expect(typeof result.current.reset).toBe('function');
    expect(typeof result.current.mutate).toBe('function');
    expect(typeof result.current.mutateAsync).toBe('function');
  });

  it('calls the mutation when mutate is called', () => {
    const { result } = renderHook(() => useTRPCMutation('search.execute'));
    
    const input = { query: 'test query' };
    act(() => {
      result.current.mutate(input as any);
    });
    
    expect(result.current.isSuccess).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it('calls onSuccess callback when mutation succeeds', () => {
    const onSuccess = vi.fn();
    const { result } = renderHook(() => 
      useTRPCMutation('search.execute', { onSuccess })
    );
    
    const input = { query: 'test query' };
    act(() => {
      result.current.mutate(input as any);
    });
    
    expect(onSuccess).toHaveBeenCalledWith({ searchRequestId: '123' });
  });

  it('resets the state when reset is called', () => {
    const { result } = renderHook(() => useTRPCMutation('search.execute'));
    
    // First trigger a successful mutation
    act(() => {
      result.current.mutate({ query: 'test query' } as any);
    });
    
    expect(result.current.isSuccess).toBe(true);
    
    // Then reset the state
    act(() => {
      result.current.reset();
    });
    
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('handles errors correctly', () => {
    // Mock the useMutation hook to simulate an error
    (trpc.search.execute.useMutation as any).mockImplementation((options) => ({
      mutate: vi.fn().mockImplementation((input) => {
        // Simulate error
        options?.onError?.(new Error('Test error message'));
      }),
      isLoading: false,
      isSuccess: false,
      error: new Error('Test error message'),
    }));
    
    const onError = vi.fn();
    const { result } = renderHook(() => 
      useTRPCMutation('search.execute', { onError })
    );
    
    act(() => {
      result.current.mutate({ query: 'test query' } as any);
    });
    
    expect(result.current.isSuccess).toBe(false);
    expect(result.current.error).toBe('Test error message');
    expect(onError).toHaveBeenCalled();
  });
});
