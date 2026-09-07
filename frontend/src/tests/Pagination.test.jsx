import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import Pagination from '../components/common/Pagination';

describe('Pagination', () => {
  const defaultProps = {
    currentPage: 1,
    totalPages: 5,
    onPageChange: jest.fn(),
  };

  it('renders correct number of page buttons', () => {
    render(<Pagination {...defaultProps} />);
    
    // Debería mostrar números del 1 al 5 y dos botones de navegación
    expect(screen.getAllByRole('button')).toHaveLength(7);
  });

  it('disables previous button on first page', () => {
    render(<Pagination {...defaultProps} currentPage={1} />);
    
    const prevButton = screen.getByLabelText('Página anterior');
    expect(prevButton).toBeDisabled();
  });

  it('disables next button on last page', () => {
    render(<Pagination {...defaultProps} currentPage={5} />);
    
    const nextButton = screen.getByLabelText('Página siguiente');
    expect(nextButton).toBeDisabled();
  });

  it('calls onPageChange with correct page number when clicking a page button', () => {
    const onPageChange = jest.fn();
    render(<Pagination {...defaultProps} onPageChange={onPageChange} />);
    
    fireEvent.click(screen.getByText('3'));
    
    expect(onPageChange).toHaveBeenCalledWith(3);
  });

  it('shows correct range of pages with many pages', () => {
    render(
      <Pagination
        {...defaultProps}
        currentPage={5}
        totalPages={10}
        siblingCount={1}
      />
    );
    
    // Debería mostrar 1 ... 4 5 6 ... 10
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('...')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('5')).toBeInTheDocument();
    expect(screen.getByText('6')).toBeInTheDocument();
    expect(screen.getByText('10')).toBeInTheDocument();
  });
});
