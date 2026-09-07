import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { FaPlus, FaEdit, FaTrash, FaSchool } from 'react-icons/fa';

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

const ColegioIcon = styled(FaSchool)`
  color: #e74c3c;
  margin-bottom: 1rem;
`;

const ColegioName = styled.h3`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
`;

const ColegioInfo = styled.p`
  color: #7f8c8d;
  margin: 0 0 1rem 0;
`;

const NivelesList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin: 1rem 0;
`;

const NivelTag = styled.span`
  background: #3498db;
  color: white;
  padding: 0.25rem 0.75rem;
  border-radius: 15px;
  font-size: 0.85rem;
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

const ColegiosAdmin = () => {
  const [colegios, setColegios] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const cargarColegios = async () => {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.get('http://localhost:3000/api/colegios', {
          headers: { Authorization: `Bearer ${token}` },
        });
        setColegios(response.data);
      } catch (error) {
        console.error('Error al cargar colegios:', error);
      }
    };

    cargarColegios();
  }, []);

  const handleDelete = async (id) => {
    if (window.confirm('¿Estás seguro de eliminar este colegio?')) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(`http://localhost:3000/api/colegios/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setColegios(colegios.filter((colegio) => colegio.id !== id));
      } catch (error) {
        console.error('Error al eliminar colegio:', error);
      }
    }
  };

  return (
    <Container>
      <Header>
        <Title>Gestión de Colegios</Title>
        <AddButton onClick={() => navigate('/admin/dashboard/colegios/nuevo')}>
          <FaPlus /> Nuevo Colegio
        </AddButton>
      </Header>
      <Grid>
        {colegios.map((colegio) => (
          <Card key={colegio.id}>
            <ColegioIcon size={24} />
            <ColegioName>{colegio.nombre}</ColegioName>
            <ColegioInfo>{colegio.ciudad}</ColegioInfo>
            <NivelesList>
              {colegio.nivel?.map((nivel, index) => (
                <NivelTag key={index}>{nivel}</NivelTag>
              ))}
            </NivelesList>
            <Actions>
              <ActionButton
                onClick={() =>
                  navigate(`/admin/dashboard/colegios/${colegio.id}/editar`)
                }
              >
                <FaEdit size={18} />
              </ActionButton>
              <ActionButton
                delete
                onClick={() => handleDelete(colegio.id)}
              >
                <FaTrash size={18} />
              </ActionButton>
            </Actions>
          </Card>
        ))}
      </Grid>
    </Container>
  );
};

export default ColegiosAdmin;
