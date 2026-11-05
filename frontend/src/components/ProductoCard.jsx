import styled from 'styled-components';
import { FaEdit, FaImage, FaTrash } from 'react-icons/fa';
import { assetUrl, formatearPrecio, IMAGEN_PRODUCTO_DEFAULT } from '../config';
import { Actions, IconButton, Tag } from '../pages/admin/adminUI';

const Card = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  opacity: ${({ $inactivo }) => ($inactivo ? 0.6 : 1)};
`;

const ImageContainer = styled.div`
  height: 180px;
  background: #f5f5f5;
  display: flex;
  align-items: center;
  justify-content: center;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Content = styled.div`
  padding: 1rem 1rem 0;
  flex: 1;
  display: flex;
  flex-direction: column;
`;

const Title = styled.h3`
  color: #2c3e50;
  margin: 0 0 0.25rem;
  font-size: 1.05rem;
`;

const Meta = styled.p`
  color: #7f8c8d;
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
`;

const Price = styled.p`
  color: #e74c3c;
  font-weight: 600;
  margin: 0 0 0.5rem;
`;

// Tarjeta de producto del panel de administración.
const ProductoCard = ({ producto, onEdit, onDelete }) => {
  const imagen = producto.imagenes?.[0]?.url;

  return (
    <Card $inactivo={!producto.activo}>
      <ImageContainer>
        {imagen ? <img
            src={assetUrl(imagen)}
            alt={producto.nombre}
            loading="lazy"
            onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = IMAGEN_PRODUCTO_DEFAULT; }}
          /> : <FaImage size={48} color="#ccc" />}
      </ImageContainer>
      <Content>
        <Title>{producto.nombre}</Title>
        <Meta>{producto.colegio?.nombre || 'Sin colegio'} · {producto.categoria?.nombre || 'Sin categoría'}</Meta>
        <Price>{formatearPrecio(producto.precio)} · Stock: {producto.stock}</Price>
        <div>{!producto.activo && <Tag $color="#7f8c8d">Oculto</Tag>}</div>
        <Actions>
          <IconButton onClick={() => onEdit(producto)} aria-label="Editar">
            <FaEdit />
          </IconButton>
          <IconButton $peligro onClick={() => onDelete(producto.id)} aria-label="Eliminar">
            <FaTrash />
          </IconButton>
        </Actions>
      </Content>
      <div style={{ height: '0.5rem' }} />
    </Card>
  );
};

export default ProductoCard;
