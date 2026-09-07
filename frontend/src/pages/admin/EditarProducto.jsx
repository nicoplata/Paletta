import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import axios from 'axios';
import { FaSave, FaArrowLeft, FaImages, FaTrash } from 'react-icons/fa';
import ImagenUploader from '../../components/ImagenUploader';

const Container = styled.div`
  padding: 2rem;
`;

const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
`;

const Title = styled.h2`
  color: #2c3e50;
  margin: 0;
`;

const Form = styled.form`
  display: grid;
  gap: 1.5rem;
  max-width: 800px;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
`;

const Label = styled.label`
  color: #2c3e50;
  font-weight: 500;
`;

const Input = styled.input`
  padding: 0.75rem;
  border: 2px solid #eee;
  border-radius: 8px;
  font-size: 1rem;

  &:focus {
    outline: none;
    border-color: #e74c3c;
  }
`;

const TextArea = styled.textarea`
  padding: 0.75rem;
  border: 2px solid #eee;
  border-radius: 8px;
  font-size: 1rem;
  min-height: 100px;

  &:focus {
    outline: none;
    border-color: #e74c3c;
  }
`;

const Button = styled.button`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: all 0.3s;
  
  ${props => props.primary ? `
    background: #e74c3c;
    color: white;
    &:hover {
      background: #c0392b;
    }
  ` : `
    background: #eee;
    color: #2c3e50;
    &:hover {
      background: #ddd;
    }
  `}
`;

const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const ImageSection = styled.div`
  margin-top: 2rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const ImagesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 1rem;
  margin-top: 1rem;
`;

const ImagePreview = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
  
  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const DeleteImageButton = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: rgba(231, 76, 60, 0.9);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s;

  &:hover {
    background: #c0392b;
    transform: scale(1.1);
  }
`;

const SectionTitle = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2c3e50;
  margin-bottom: 1rem;
`;

const EditarProducto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [producto, setProducto] = useState({
    nombre: '',
    descripcion: '',
    precio: '',
    stock: '',
    imagenes: []
  });

  useEffect(() => {
    if (id) {
      cargarProducto();
    }
  }, [id]);

  const cargarProducto = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/api/productos/${id}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Producto cargado:', response.data);
      setProducto(response.data);
    } catch (error) {
      console.error('Error al cargar el producto:', error);
      // Opcional: Mostrar mensaje al usuario
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      if (id) {
        await axios.put(
          `http://localhost:3000/api/productos/${id}`, 
          producto,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        // Solo navegamos cuando el usuario hace click en Guardar
        navigate('/admin/dashboard/productos');
      } else {
        const response = await axios.post(
          'http://localhost:3000/api/productos', 
          producto,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        navigate(`/admin/dashboard/productos/${response.data.id}/editar`);
      }
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      if (error.response?.status === 401) {
        navigate('/admin/login');
      }
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setProducto(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImagenesUpdate = (nuevasImagenes) => {
    setProducto(prev => ({
      ...prev,
      imagenes: nuevasImagenes
    }));
  };

  const handleDeleteImage = async (imagenId) => {
    if (window.confirm('¿Estás seguro de eliminar esta imagen?')) {
      try {
        const token = localStorage.getItem('token');
        const response = await axios.delete(
          `http://localhost:3000/api/imagenes/${imagenId}`,
          {
            headers: { 
              Authorization: `Bearer ${token}`,
              Accept: 'application/json'
            }
          }
        );

        if (response.data.success) {
          setProducto(prev => ({
            ...prev,
            imagenes: prev.imagenes.filter(img => img.id !== imagenId)
          }));
        } else {
          throw new Error(response.data.error || 'Error al eliminar la imagen');
        }
      } catch (error) {
        const errorMessage = error.response?.data?.error || 
                            error.response?.data?.message || 
                            error.message || 
                            'Error al eliminar la imagen';
        
        alert(errorMessage);
        console.error('Error detallado:', error.response || error);
      }
    }
  };

  return (
    <Container>
      <Header>
        <Title>{id ? 'Editar Producto' : 'Nuevo Producto'}</Title>
      </Header>

      <Form onSubmit={handleSubmit}>
        <FormGroup>
          <Label>Nombre</Label>
          <Input
            name="nombre"
            value={producto.nombre}
            onChange={handleChange}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Descripción</Label>
          <TextArea
            name="descripcion"
            value={producto.descripcion}
            onChange={handleChange}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Precio</Label>
          <Input
            type="number"
            name="precio"
            value={producto.precio}
            onChange={handleChange}
            required
          />
        </FormGroup>

        <FormGroup>
          <Label>Stock</Label>
          <Input
            type="number"
            name="stock"
            value={producto.stock}
            onChange={handleChange}
            required
          />
        </FormGroup>

        <ImageSection>
          <SectionTitle>
            <FaImages />
            Imágenes del Producto
          </SectionTitle>
          
          <ImagesGrid>
            {producto.imagenes.map((imagen) => (
              <ImagePreview key={imagen.id}>
                <img 
                  src={`http://localhost:3000${imagen.url}`} 
                  alt="Preview" 
                />
                <DeleteImageButton
                  onClick={() => handleDeleteImage(imagen.id)}
                  title="Eliminar imagen"
                >
                  <FaTrash size={14} />
                </DeleteImageButton>
              </ImagePreview>
            ))}
          </ImagesGrid>

          <ImagenUploader
            tipoEntidad="producto"
            entidadId={id}
            onImagenesUpdate={handleImagenesUpdate}
          />
        </ImageSection>

        <ButtonGroup>
          <Button type="button" onClick={() => navigate('/admin/dashboard/productos')}>
            <FaArrowLeft /> Cancelar
          </Button>
          <Button type="submit" primary>
            <FaSave /> Guardar
          </Button>
        </ButtonGroup>
      </Form>
    </Container>
  );
};

export default EditarProducto;