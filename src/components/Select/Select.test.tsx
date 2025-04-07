import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Select } from './Select';

const defaultOptions = [
  { value: 'react', label: 'React' },
  { value: 'vue', label: 'Vue' },
  { value: 'angular', label: 'Angular' },
];

describe('Select', () => {
  it('renders with default props', () => {
    render(<Select options={defaultOptions} />);
    expect(screen.getByRole('combobox')).toBeInTheDocument();
  });

  it('renders with placeholder', () => {
    render(<Select options={defaultOptions} placeholder="Select framework" />);
    expect(screen.getByText('Select framework')).toBeInTheDocument();
  });

  it('renders with label', () => {
    render(<Select options={defaultOptions} label="Framework" />);
    expect(screen.getByLabelText('Framework')).toBeInTheDocument();
  });

  it('indicates required state', () => {
    render(<Select options={defaultOptions} label="Framework" required />);
    expect(screen.getByText('*')).toBeInTheDocument();
    expect(screen.getByRole('combobox')).toBeRequired();
  });

  it('shows helper text', () => {
    render(
      <Select
        options={defaultOptions}
        label="Framework"
        helperText="Choose your framework"
      />
    );
    expect(screen.getByText('Choose your framework')).toBeInTheDocument();
  });

  it('shows error state', () => {
    render(
      <Select
        options={defaultOptions}
        label="Framework"
        error="Please select a framework"
      />
    );
    const select = screen.getByRole('combobox');
    expect(select).toHaveAttribute('aria-invalid', 'true');
    expect(screen.getByText('Please select a framework')).toHaveClass('text-red-500');
  });

  it('handles disabled state', () => {
    render(<Select options={defaultOptions} label="Framework" disabled />);
    expect(screen.getByRole('combobox')).toBeDisabled();
  });

  it('handles loading state', () => {
    render(<Select options={defaultOptions} label="Framework" isLoading />);
    expect(screen.getByRole('combobox')).toBeDisabled();
    expect(document.querySelector('.animate-spin')).toBeInTheDocument();
  });

  it('handles value change', () => {
    const handleChange = vi.fn();
    render(
      <Select
        options={defaultOptions}
        label="Framework"
        value="react"
        onChange={handleChange}
      />
    );
    
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'vue' } });
    
    expect(handleChange).toHaveBeenCalledWith('vue');
  });

  it('renders disabled options', () => {
    const optionsWithDisabled = [
      { value: 'react', label: 'React' },
      { value: 'vue', label: 'Vue', disabled: true },
      { value: 'angular', label: 'Angular' },
    ];

    render(<Select options={optionsWithDisabled} label="Framework" />);
    
    const options = screen.getAllByRole('option');
    expect(options[1]).toBeDisabled();
    expect(options[0]).not.toBeDisabled();
    expect(options[2]).not.toBeDisabled();
  });

  it('associates helper text with select using aria-describedby', () => {
    render(
      <Select
        options={defaultOptions}
        label="Framework"
        helperText="Choose your framework"
      />
    );
    
    const select = screen.getByRole('combobox');
    const helperId = select.getAttribute('aria-describedby');
    expect(helperId).toBeTruthy();
    expect(screen.getByText('Choose your framework').id).toBe(helperId);
  });

  it('associates error message with select using aria-describedby', () => {
    render(
      <Select
        options={defaultOptions}
        label="Framework"
        error="Please select a framework"
      />
    );
    
    const select = screen.getByRole('combobox');
    const errorId = select.getAttribute('aria-describedby');
    expect(errorId).toBeTruthy();
    expect(screen.getByText('Please select a framework').id).toBe(errorId);
  });
}); 