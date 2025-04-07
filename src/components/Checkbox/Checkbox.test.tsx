import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from './Checkbox';

describe('Checkbox', () => {
  it('renders with label', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByLabelText('Accept terms')).toBeInTheDocument();
  });

  it('renders in unchecked state by default', () => {
    render(<Checkbox label="Accept terms" />);
    expect(screen.getByRole('checkbox')).not.toBeChecked();
  });

  it('renders in checked state when specified', () => {
    render(<Checkbox label="Accept terms" checked />);
    expect(screen.getByRole('checkbox')).toBeChecked();
  });

  it('handles change events', () => {
    const handleChange = vi.fn();
    render(<Checkbox label="Accept terms" onChange={handleChange} />);
    
    const checkbox = screen.getByRole('checkbox');
    fireEvent.click(checkbox);
    
    expect(handleChange).toHaveBeenCalledWith(true);
  });

  it('shows helper text', () => {
    render(
      <Checkbox
        label="Subscribe"
        helperText="Receive weekly updates"
      />
    );
    expect(screen.getByText('Receive weekly updates')).toBeInTheDocument();
  });

  it('shows error message', () => {
    render(
      <Checkbox
        label="Accept terms"
        error="You must accept the terms"
      />
    );
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('You must accept the terms')).toHaveClass('text-red-500');
  });

  it('handles disabled state', () => {
    render(<Checkbox label="Accept terms" disabled />);
    expect(screen.getByRole('checkbox')).toBeDisabled();
  });

  it('handles required state', () => {
    render(<Checkbox label="Accept terms" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('checkbox')).toBeRequired();
  });

  it('handles indeterminate state', () => {
    render(<Checkbox label="Select all" indeterminate />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toHaveProperty('indeterminate', true);
  });

  it('associates helper text with checkbox using aria-describedby', () => {
    render(
      <Checkbox
        label="Subscribe"
        helperText="Receive weekly updates"
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    const helperId = checkbox.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();
    expect(screen.getByText('Receive weekly updates').id).toBe(helperId);
  });

  it('associates error message with checkbox using aria-describedby', () => {
    render(
      <Checkbox
        label="Accept terms"
        error="You must accept the terms"
      />
    );
    
    const checkbox = screen.getByRole('checkbox');
    const errorId = checkbox.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(screen.getByText('You must accept the terms').id).toBe(errorId);
  });

  it('applies custom className', () => {
    render(<Checkbox label="Accept terms" className="custom-class" />);
    expect(screen.getByRole('checkbox').parentElement?.parentElement?.parentElement)
      .toHaveClass('custom-class');
  });

  it('maintains checked state when disabled', () => {
    render(<Checkbox label="Accept terms" checked disabled />);
    const checkbox = screen.getByRole('checkbox');
    expect(checkbox).toBeChecked();
    expect(checkbox).toBeDisabled();
  });

  it('handles long labels properly', () => {
    const longLabel = 'This is a very long label that should still be properly formatted and aligned with the checkbox input while maintaining proper spacing and wrapping behavior';
    render(<Checkbox label={longLabel} />);
    expect(screen.getByText(longLabel)).toBeInTheDocument();
  });
}); 