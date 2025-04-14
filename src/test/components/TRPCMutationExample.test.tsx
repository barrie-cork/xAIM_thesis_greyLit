import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { TRPCMutationExample } from '@/components/utils/TRPCMutationExample';
import { trpc } from '@/utils/trpc';

// Mock the trpc hooks
vi.mock('@/utils/trpc', () => ({
  trpc: {
    search: {
      execute: {
        useMutation: vi.fn().mockReturnValue({
          mutate: vi.fn(),
          isLoading: false,
          isSuccess: false,
          error: null,
        }),
      },
    },
  },
}));

describe('TRPCMutationExample', () => {
  it('renders correctly', () => {
    render(<TRPCMutationExample />);
    expect(screen.getByText('tRPC Mutation Example')).toBeInTheDocument();
    expect(screen.getByText('Execute Search')).toBeInTheDocument();
  });

  it('calls the mutation when the button is clicked', () => {
    const mockMutate = vi.fn();
    
    // Update the mock to include our mock mutate function
    (trpc.search.execute.useMutation as any).mockReturnValue({
      mutate: mockMutate,
      isLoading: false,
      isSuccess: false,
      error: null,
    });

    render(<TRPCMutationExample />);
    
    // Click the button
    fireEvent.click(screen.getByText('Execute Search'));
    
    // Verify the mutation was called
    expect(mockMutate).toHaveBeenCalledWith({
      query: 'example search',
      providers: ['SERPER'],
      maxResults: 10
    });
  });

  it('shows loading state when mutation is loading', () => {
    // Update the mock to show loading state
    (trpc.search.execute.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isLoading: true,
      isSuccess: false,
      error: null,
    });

    render(<TRPCMutationExample />);
    
    // Verify loading state is shown
    expect(screen.getByText('Processing request...')).toBeInTheDocument();
  });

  it('shows error state when mutation fails', () => {
    // Update the mock to show error state
    (trpc.search.execute.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isSuccess: false,
      error: new Error('Test error message'),
    });

    render(<TRPCMutationExample />);
    
    // Verify error state is shown
    expect(screen.getByText('Error')).toBeInTheDocument();
    expect(screen.getByText('Test error message')).toBeInTheDocument();
  });

  it('shows success state when mutation succeeds', () => {
    // Update the mock to show success state
    (trpc.search.execute.useMutation as any).mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
      isSuccess: true,
      error: null,
      data: { searchRequestId: '123' },
    });

    render(<TRPCMutationExample />);
    
    // Verify success state is shown
    expect(screen.getByText('Success')).toBeInTheDocument();
    expect(screen.getByText(/Search request created with ID/)).toBeInTheDocument();
  });
});
