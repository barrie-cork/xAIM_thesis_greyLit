import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Textarea } from './Textarea';

describe('Textarea', () => {
  it('renders with default props', () => {
    render(<Textarea />);
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Textarea placeholder="Enter message" />);
    expect(screen.getByPlaceholderText('Enter message')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Textarea label="Message" />);
    expect(screen.getByLabelText('Message')).toBeInTheDocument();
  });

  it('indicates required state', () => {
    render(<Textarea label="Message" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('shows helper text', () => {
    render(
      <Textarea
        label="Message"
        helperText="Please provide details"
      />
    );
    expect(screen.getByText('Please provide details')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <Textarea
        label="Message"
        error="Message is required"
      />
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Message is required')).toHaveClass('text-red-500');
  });

  it('handles disabled state', () => {
    render(<Textarea label="Message" disabled />);
    expect(screen.getByRole('textbox')).toBeDisabled();
  });

  it('handles value change', () => {
    const handleChange = vi.fn();
    render(
      <Textarea
        label="Message"
        value="Hello"
        onChange={handleChange}
      />
    );
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Hello, World!' } });
    
    expect(handleChange).toHaveBeenCalledWith('Hello, World!');
  });

  it('shows character count when showCharacterCount is true', () => {
    render(
      <Textarea
        label="Message"
        value="Hello"
        showCharacterCount
      />
    );
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('shows character count with maxLength', () => {
    render(
      <Textarea
        label="Message"
        value="Hello"
        maxLength={10}
      />
    );
    expect(screen.getByText('5 / 10')).toBeInTheDocument();
  });

  it('shows error state when over maxLength', () => {
    render(
      <Textarea
        label="Message"
        value="Hello, World!"
        maxLength={5}
      />
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('12 / 5')).toHaveClass('text-red-500');
  });

  it('applies custom number of rows', () => {
    render(<Textarea rows={6} />);
    expect(screen.getByRole('textbox')).toHaveAttribute('rows', '6');
  });

  it('applies resize style based on prop', () => {
    const { rerender } = render(<Textarea resize="none" />);
    expect(screen.getByRole('textbox')).toHaveClass('resize-none');

    rerender(<Textarea resize="horizontal" />);
    expect(screen.getByRole('textbox')).toHaveClass('resize-x');

    rerender(<Textarea resize="both" />);
    expect(screen.getByRole('textbox')).toHaveClass('resize');
  });

  it('associates helper text with textarea using aria-describedby', () => {
    render(
      <Textarea
        label="Message"
        helperText="Please provide details"
      />
    );
    
    const textarea = screen.getByRole('textbox');
    const helperId = textarea.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();
    expect(screen.getByText('Please provide details').id).toBe(helperId);
  });

  it('associates error message with textarea using aria-describedby', () => {
    render(
      <Textarea
        label="Message"
        error="Message is required"
      />
    );
    
    const textarea = screen.getByRole('textbox');
    const errorId = textarea.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(screen.getByText('Message is required').id).toBe(errorId);
  });

  it('associates character counter with textarea using aria-describedby', () => {
    render(
      <Textarea
        label="Message"
        value="Hello"
        showCharacterCount
      />
    );
    
    const textarea = screen.getByRole('textbox');
    const counterId = textarea.getAttribute('aria-describedby');
    expect(counterId).toBeTruthy();
    expect(screen.getByText('5').id).toBe(counterId);
  });
}); 