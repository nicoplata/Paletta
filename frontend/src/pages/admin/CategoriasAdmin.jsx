import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash } from 'react-icons/fa';

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

const Card = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.2s;

  &:hover {
    transform: translateY(-5px);
  }
`;

const CategoryName = styled.h3`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
`;

const CategoryDescription = styled.p`
  color: #7f8c8d;
  margin: 0;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
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

const CategoriasAdmin = () => {
  const [categorias, setCategorias] = useState([]);
  const navigate = useNavigate();

  const cargarCategorias = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('http://localhost:3000/api/categorias', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategorias(response.data);
    } catch (error) {
      console.error('Error al cargar categorías:', error);
    }
  };

  useEffect(() => {
    cargarCategorias();
  }, []);

  const handleEdit = (categoria) => {
    navigate(`/admin/dashboard/categorias/${categoria.id}/editar`);
  };

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar esta categoría?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/categorias/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await cargarCategorias();
      } catch (error) {
        console.error('Error al eliminar categoría:', error);
      }
    }
  };

  return (
    <Container>
      <Header>
        <Title>Gestión de Categorías</Title>
        <AddButton onClick={() => navigate('/admin/dashboard/categorias/nuevo')}>
          <FaPlus /> Nueva Categoría
        </AddButton>
      </Header>
      <Grid>
        {categorias.map(categoria => (
          <Card key={categoria.id}>
            <CategoryName>{categoria.nombre}</CategoryName>
            <CategoryDescription>{categoria.descripcion}</CategoryDescription>
            <Actions>
              <ActionButton onClick={() => handleEdit(categoria)}>
                <FaEdit />
              </ActionButton>
              <ActionButton delete onClick={() => handleDelete(categoria.id)}>
                <FaTrash />
              </ActionButton>
            </Actions>
          </Card>
        ))}
      </Grid>
    </Container>
  );
};

export default CategoriasAdmin;
