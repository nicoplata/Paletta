import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { FaPlus } from 'react-icons/fa';
import ProductoCard from '../../components/ProductoCard';

const Container = styled.div`
  padding: 1rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h1`
  color: #2c3e50;
  margin: 0;
`;

const AddButton = styled.button`
  background: #e74c3c;
  color: white;
  border: none;
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: background 0.3s;

  &:hover {
    background: #c0392b;
  }
`;

const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 2rem;
`;

const ModeToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-right: 2rem;
`;

const Switch = styled.label`
  position: relative;
  display: inline-block;
  width: 60px;
  height: 34px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  span {
    position: absolute;
    cursor: pointer;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background-color: #e74c3c;
    transition: 0.4s;
    border-radius: 34px;

    &:before {
      position: absolute;
      content: '';
      height: 26px;
      width: 26px;
      left: 4px;
      bottom: 4px;
      background-color: white;
      transition: 0.4s;
      border-radius: 50%;
    }
  }

  input:checked + span {
    background-color: #2ecc71;
  }

  input:checked + span:before {
    transform: translateX(26px);
  }
`;

const ProductosAdmin = () => {
  const [productos, setProductos] = useState([]);
  const [showPrices, setShowPrices] = useState(true);
  const navigate = useNavigate();

  const cargarProductos = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/productos', {
        headers: { Authorization: `Bearer ${token}` }
      });
      console.log('Productos cargados:', response.data);
      setProductos(response.data);
    } catch (error) {
      console.error('Error al cargar productos:', error);
    }
  };

  useEffect(() => {
    cargarProductos();
  }, []);

  const handleEdit = (producto) => {
    navigate(`/admin/dashboard/productos/${producto.id}/editar`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/productos/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await cargarProductos();
      } catch (error) {
        console.error('Error al eliminar producto:', error);
      }
    }
  };

  return (
    <Container>
      <Header>
        <Title>Gestión de Productos</Title>
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <ModeToggle>
            <span>Modo Catálogo</span>
            <Switch>
              <input
                type="checkbox"
                checked={showPrices}
                onChange={(e) => setShowPrices(e.target.checked)}
              />
              <span></span>
            </Switch>
            <span>Modo E-commerce</span>
          </ModeToggle>
          <AddButton onClick={() => navigate('/admin/dashboard/productos/nuevo')}>
            <FaPlus /> Nuevo Producto
          </AddButton>
        </div>
      </Header>
      <Grid>
        {productos.map(producto => (
          <ProductoCard
            key={producto.id}
            producto={producto}
            onEdit={handleEdit}
            onDelete={handleDelete}
            showPrice={showPrices}
          />
        ))}
      </Grid>
    </Container>
  );
};

export default ProductosAdmin;
