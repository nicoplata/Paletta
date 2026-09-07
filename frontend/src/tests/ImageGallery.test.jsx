import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import ImageGallery from '../components/common/ImageGallery';

describe('ImageGallery', () => {
  const mockImages = [
    '/img/product1.jpg',
    '/img/product2.jpg',
    '/img/product3.jpg'
  ];

  it('renders main image and thumbnails', () => {
    render(<ImageGallery images={mockImages} alt="Test product" />);
    
    // Debería mostrar la imagen principal
    const mainImage = screen.getByAltText('Test product - Vista 1');
    expect(mainImage).toBeInTheDocument();
    
    // Debería mostrar las miniaturas
    const thumbnails = screen.getAllByRole('button');
    expect(thumbnails).toHaveLength(mockImages.length);
  });

  it('changes main image when clicking thumbnails', () => {
    render(<ImageGallery images={mockImages} alt="Test product" />);
    
    const thumbnails = screen.getAllByRole('button');
    fireEvent.click(thumbnails[1]);
    
    const mainImage = screen.getByAltText('Test product - Vista 2');
    expect(mainImage).toBeInTheDocument();
  });

  it('toggles zoom on main image click', () => {
    render(<ImageGallery images={mockImages} alt="Test product" />);
    
    const mainImageContainer = screen.getByRole('img', { name: /Test product - Vista 1/i }).parentElement;
    
    fireEvent.click(mainImageContainer);
    expect(mainImageContainer).toHaveClass('zoomed');
    
    fireEvent.click(mainImageContainer);
    expect(mainImageContainer).not.toHaveClass('zoomed');
  });

  it('handles empty or invalid image arrays', () => {
    const { container } = render(<ImageGallery images={[]} alt="Test product" />);
    expect(container.firstChild).toBeNull();
  });
});
