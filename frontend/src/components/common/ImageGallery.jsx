import React, { useState } from 'react';
import PropTypes from 'prop-types';
import '../../styles/ImageGallery.css';

const ImageGallery = ({ images, alt }) => {
  const [selectedImage, setSelectedImage] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleImageClick = () => {
    setIsZoomed(!isZoomed);
  };

  const handleThumbnailClick = (index) => {
    setSelectedImage(index);
    setIsZoomed(false);
  };

  if (!images || images.length === 0) {
    return null;
  }

  return (
    <div className="image-gallery">
      <div 
        className={`main-image-container ${isZoomed ? 'zoomed' : ''}`}
        onClick={handleImageClick}
      >
        <img 
          src={images[selectedImage]} 
          alt={`${alt || 'Producto'} - Vista ${selectedImage + 1}`}
          className="main-image"
        />
      </div>
      
      {images.length > 1 && (
        <div className="thumbnails">
          {images.map((img, idx) => (
            <button
              key={idx}
              className={`thumbnail-button ${idx === selectedImage ? 'active' : ''}`}
              onClick={() => handleThumbnailClick(idx)}
              aria-label={`Ver imagen ${idx + 1}`}
            >
              <img 
                src={img} 
                alt={`${alt || 'Producto'} - Miniatura ${idx + 1}`}
                className="thumbnail"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

ImageGallery.propTypes = {
  images: PropTypes.arrayOf(PropTypes.string).isRequired,
  alt: PropTypes.string
};

export default ImageGallery;
