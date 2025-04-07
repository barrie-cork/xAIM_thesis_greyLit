import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { Input } from './Input';

describe('Input', () => {
  it('renders with default props', () => {
    render(<Input placeholder="Enter text" />);
    expect(screen.getByPlaceholderText('Enter text')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Input label="Email" placeholder="Enter email" />);
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
  });

  it('indicates required state', () => {
    render(<Input label="Email" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('textbox')).toBeRequired();
  });

  it('shows helper text', () => {
    render(
      <Input
        label="Password"
        helperText="Must be at least 8 characters"
        placeholder="Enter password"
      />
    );
    expect(screen.getByText('Must be at least 8 characters')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <Input
        label="Email"
        error="Invalid email address"
        placeholder="Enter email"
      />
    );
    const input = screen.getByPlaceholderText('Enter email');
    expect(input).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Invalid email address')).toHaveClass('text-red-500');
  });

  it('handles disabled state', () => {
    render(<Input label="Name" disabled placeholder="Enter name" />);
    expect(screen.getByPlaceholderText('Enter name')).toBeDisabled();
  });

  it('handles loading state', () => {
    render(<Input label="Name" isLoading placeholder="Enter name" />);
    expect(screen.getByPlaceholderText('Enter name')).toBeDisabled();
    expect(screen.getByRole('textbox')).toHaveClass('cursor-wait');
  });

  it('handles user input', async () => {
    const user = userEvent.setup();
    render(<Input placeholder="Enter text" />);
    const input = screen.getByPlaceholderText('Enter text');
    
    await user.type(input, 'Hello, World!');
    expect(input).toHaveValue('Hello, World!');
  });

  it('forwards additional props', () => {
    render(
      <Input
        data-testid="test-input"
        aria-label="Test Input"
        placeholder="Enter text"
      />
    );
    const input = screen.getByTestId('test-input');
    expect(input).toHaveAttribute('aria-label', 'Test Input');
  });
}); 