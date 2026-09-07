import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import SearchBar from '../components/common/SearchBar';

describe('SearchBar', () => {
  it('renders with placeholder text', () => {
    const placeholder = 'Buscar productos...';
    render(<SearchBar onSearch={() => {}} placeholder={placeholder} />);
    
    expect(screen.getByPlaceholderText(placeholder)).toBeInTheDocument();
  });

  it('calls onSearch when form is submitted', () => {
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} />);
    
    const input = screen.getByRole('textbox');
    const form = screen.getByRole('form');
    
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.submit(form);
    
    expect(onSearch).toHaveBeenCalledWith('test');
  });

  it('debounces search while typing', () => {
    jest.useFakeTimers();
    const onSearch = jest.fn();
    render(<SearchBar onSearch={onSearch} searchDelay={300} />);
    
    const input = screen.getByRole('textbox');
    
    fireEvent.change(input, { target: { value: 't' } });
    fireEvent.change(input, { target: { value: 'te' } });
    fireEvent.change(input, { target: { value: 'test' } });
    
    expect(onSearch).not.toHaveBeenCalled();
    
    jest.advanceTimersByTime(300);
    
    expect(onSearch).toHaveBeenCalledTimes(1);
    expect(onSearch).toHaveBeenCalledWith('test');
    
    jest.useRealTimers();
  });
});
