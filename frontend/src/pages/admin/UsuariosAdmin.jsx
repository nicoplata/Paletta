import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaUser } from 'react-icons/fa';

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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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

const UserCard = styled.div`
  background: white;
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  transition: transform 0.2s;
  display: flex;
  flex-direction: column;

  &:hover {
    transform: translateY(-5px);
  }
`;

const UserIcon = styled(FaUser)`
  color: #3498db;
  margin-bottom: 1rem;
`;

const UserName = styled.h3`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
`;

const UserEmail = styled.p`
  color: #7f8c8d;
  margin: 0 0 1rem 0;
`;

const RolBadge = styled.span`
  background: ${(props) =>
    props.rol === 'administrador'
      ? '#e74c3c'
      : props.rol === 'vendedor'
      ? '#f39c12'
      : '#3498db'};
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.85rem;
  align-self: flex-start;
`;

const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

const ActionButton = styled.button`
  background: none;
  border: none;
  color: ${(props) => (props.delete ? '#e74c3c' : '#3498db')};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: all 0.2s;

  &:hover {
    background: ${(props) => (props.delete ? '#fdf0ef' : '#edf6fd')};
  }
`;

const UsuariosAdmin = () => {
  const [usuarios, setUsuarios] = useState([]);
  const navigate = useNavigate();

  const cargarUsuarios = async () => {
    try {
      const token = localStorage.getItem('token');
      console.log('Cargando usuarios...');
      const response = await axios.get('http://localhost:3000/api/usuarios', {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Usuarios cargados:', response.data);
      setUsuarios(response.data);
    } catch (error) {
      console.error('Error al cargar usuarios:', error);
    }
  };

  useEffect(() => {
    cargarUsuarios();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este usuario?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/usuarios/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        await cargarUsuarios(); // Recargar la lista después de eliminar
      } catch (error) {
        console.error('Error al eliminar usuario:', error);
      }
    }
  };

  return (
    <Container>
      <Header>
        <Title>Gestión de Usuarios</Title>
        <AddButton onClick={() => navigate('/admin/dashboard/usuarios/nuevo')}>
          <FaPlus /> Nuevo Usuario
        </AddButton>
      </Header>
      <Grid>
        {usuarios.length > 0 ? (
          usuarios.map((usuario) => (
            <UserCard key={usuario.id}>
              <FaUser
                size={24}
                color="#3498db"
                style={{ marginBottom: '1rem' }}
              />
              <h3 style={{ margin: '0 0 0.5rem 0' }}>{usuario.nombre}</h3>
              <p style={{ margin: '0 0 1rem 0', color: '#666' }}>
                {usuario.email}
              </p>
              <span
                style={{
                  background:
                    usuario.rol === 'administrador'
                      ? '#e74c3c'
                      : '#3498db',
                  color: 'white',
                  padding: '0.25rem 0.75rem',
                  borderRadius: '15px',
                  fontSize: '0.85rem',
                  alignSelf: 'flex-start',
                }}
              >
                {usuario.rol}
              </span>
              <Actions>
                <ActionButton
                  onClick={() =>
                    navigate(`/admin/dashboard/usuarios/${usuario.id}/editar`)
                  }
                >
                  <FaEdit size={18} />
                </ActionButton>
                <ActionButton
                  delete
                  onClick={() => handleDelete(usuario.id)}
                >
                  <FaTrash size={18} />
                </ActionButton>
              </Actions>
            </UserCard>
          ))
        ) : (
          <p
            style={{
              gridColumn: '1 / -1',
              textAlign: 'center',
              color: '#666',
            }}
          >
            No hay usuarios registrados
          </p>
        )}
      </Grid>
    </Container>
  );
};

export default UsuariosAdmin;
