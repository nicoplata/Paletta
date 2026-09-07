import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Toast from '../components/common/Toast';

describe('Toast', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('renders with correct message and type', () => {
    render(
      <Toast
        message="Test message"
        type="success"
        duration={3000}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
    expect(screen.getByText('✓')).toBeInTheDocument();
  });

  it('closes automatically after duration', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Test message"
        type="success"
        duration={3000}
        onClose={onClose}
      />
    );

    expect(screen.getByText('Test message')).toBeInTheDocument();
    
    jest.advanceTimersByTime(3000);
    
    expect(onClose).toHaveBeenCalled();
  });

  it('closes on close button click', () => {
    const onClose = jest.fn();
    render(
      <Toast
        message="Test message"
        type="success"
        duration={3000}
        onClose={onClose}
      />
    );

    const closeButton = screen.getByRole('button');
    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalled();
  });

  it('renders different icons for different types', () => {
    const { rerender } = render(
      <Toast message="Test" type="success" />
    );
    expect(screen.getByText('✓')).toBeInTheDocument();

    rerender(<Toast message="Test" type="error" />);
    expect(screen.getByText('✕')).toBeInTheDocument();

    rerender(<Toast message="Test" type="warning" />);
    expect(screen.getByText('⚠')).toBeInTheDocument();

    rerender(<Toast message="Test" type="info" />);
    expect(screen.getByText('ℹ')).toBeInTheDocument();
  });
});
