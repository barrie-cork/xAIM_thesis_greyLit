import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Label } from './Label';

describe('Label', () => {
  it('renders children correctly', () => {
    render(<Label>Email Address</Label>);
    expect(screen.getByText('Email Address')).toBeInTheDocument();
  });

  it('shows required indicator when required prop is true', () => {
    render(<Label required>Password</Label>);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByText('*')).toHaveClass('text-red-500');
  });

  it('applies error styles when error prop is true', () => {
    render(<Label error>Username</Label>);
    expect(screen.getByText('Username')).toHaveClass('text-red-500');
  });

  it('applies custom className', () => {
    render(<Label className="custom-class">Custom Label</Label>);
    expect(screen.getByText('Custom Label')).toHaveClass('custom-class');
  });

  it('forwards additional HTML attributes', () => {
    render(
      <Label data-testid="test-label" htmlFor="test-input">
        Test Label
      </Label>
    );
    const label = screen.getByTestId('test-label');
    expect(label).toHaveAttribute('for', 'test-input');
  });
}); 