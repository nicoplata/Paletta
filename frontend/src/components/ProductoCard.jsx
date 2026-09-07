import React from 'react';
import styled from 'styled-components';
import { FaEdit, FaTrash, FaImage } from 'react-icons/fa';

const Card = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-5px);
  }
`;

const ImageContainer = styled.div`
  height: 200px;
  overflow: hidden;
  position: relative;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Image = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PlaceholderIcon = styled(FaImage)`
  font-size: 3rem;
  color: #ccc;
`;

const Content = styled.div`
  padding: 1rem;
`;

const Title = styled.h3`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
  font-size: 1.1rem;
`;

const Price = styled.p`
  color: #e74c3c;
  font-weight: 600;
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-top: 1px solid #eee;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${props => props.delete ? '#e74c3c' : '#3498db'};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: ${props => props.delete ? '#fdf0ef' : '#edf6fd'};
  }
`;

const ProductoCard = ({ producto, onEdit, onDelete, showPrice }) => {
  const getImageUrl = () => {
    try {
      if (producto.imagenes && producto.imagenes.length > 0) {
        return `http://localhost:3000${producto.imagenes[0].url}`;
      }
      return null;
    } catch (error) {
      console.error('Error al obtener URL de imagen:', error);
      return null;
    }
  };

  return (
    <Card>
      <ImageContainer>
        {getImageUrl() ? (
          <Image 
            src={getImageUrl()} 
            alt={producto.nombre}
            onError={(e) => {
              console.log('Error loading image:', e);
              e.target.style.display = 'none';
            }}
          />
        ) : (
          <PlaceholderIcon />
        )}
      </ImageContainer>
      <Content>
        <Title>{producto.nombre}</Title>
        {showPrice && <Price>${producto.precio}</Price>}
      </Content>
      <Actions>
        <ActionButton onClick={() => onEdit(producto)}>
          <FaEdit />
        </ActionButton>
        <ActionButton delete onClick={() => onDelete(producto.id)}>
          <FaTrash />
        </ActionButton>
      </Actions>
    </Card>
  );
};

export default ProductoCard;