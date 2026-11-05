import { useRef, useState } from 'react';
import styled from 'styled-components';
import { FaImages, FaTrash, FaUpload } from 'react-icons/fa';
import api, { mensajeError } from '../../lib/api';
import { assetUrl } from '../../config';
import { useToast } from '../../context/ToastContext';
import { Button, Hint, Input } from '../../pages/admin/adminUI';

const Seccion = styled.section`
  margin-top: 1rem;
  padding: 1.5rem;
  background: #f8f9fa;
  border-radius: 8px;
`;

const Titulo = styled.h3`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: #2c3e50;
  margin: 0 0 1rem;
`;

const Grilla = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 1rem;
  margin-bottom: 1rem;
`;

const Preview = styled.div`
  position: relative;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  background: white;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
`;

const Borrar = styled.button`
  position: absolute;
  top: 8px;
  right: 8px;
  background: var(--color-primario);
  color: white;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const Subida = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
`;

const GestorImagenes = ({ tipoEntidad, entidadId, imagenes = [], onChange }) => {
  const { showToast } = useToast();
  const [archivo, setArchivo] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [subiendo, setSubiendo] = useState(false);
  const inputRef = useRef(null);

  if (!entidadId) {
    return (
      <Seccion>
        <Titulo><FaImages /> Imágenes</Titulo>
        <Hint>Guardá primero para poder cargar imágenes.</Hint>
      </Seccion>
    );
  }

  const subir = async () => {
    if (!archivo) return;
    const formData = new FormData();
    formData.append('imagen', archivo);
    formData.append('tipoEntidad', tipoEntidad);
    formData.append('entidadId', entidadId);
    if (descripcion) formData.append('descripcion', descripcion);

    setSubiendo(true);
    try {
      const { data } = await api.post('/imagenes', formData);
      onChange([...imagenes, data]);
      setArchivo(null);
      setDescripcion('');
      if (inputRef.current) inputRef.current.value = '';
      showToast('Imagen subida', 'success');
    } catch (err) {
      showToast(mensajeError(err, 'Error al subir la imagen'), 'error', 5000);
    } finally {
      setSubiendo(false);
    }
  };

  const eliminar = async (imagenId) => {
    if (!window.confirm('¿Eliminar esta imagen?')) return;
    try {
      await api.delete(`/imagenes/${imagenId}`);
      onChange(imagenes.filter((img) => img.id !== imagenId));
      showToast('Imagen eliminada', 'success');
    } catch (err) {
      showToast(mensajeError(err, 'Error al eliminar la imagen'), 'error', 5000);
    }
  };

  return (
    <Seccion>
      <Titulo><FaImages /> Imágenes</Titulo>
      {imagenes.length > 0 ? (
        <Grilla>
          {imagenes.map((imagen, i) => (
            <Preview key={imagen.id}>
              <img src={assetUrl(imagen.url)} alt={imagen.descripcion || `Imagen ${i + 1}`} />
              <Borrar type="button" onClick={() => eliminar(imagen.id)} title="Eliminar imagen" aria-label="Eliminar imagen">
                <FaTrash size={14} />
              </Borrar>
            </Preview>
          ))}
        </Grilla>
      ) : (
        <Hint style={{ marginBottom: '1rem' }}>Todavía no hay imágenes. La primera se usa como principal.</Hint>
      )}
      <Subida>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={(e) => setArchivo(e.target.files?.[0] || null)}
        />
        <Input
          type="text"
          placeholder="Descripción (opcional)"
          value={descripcion}
          onChange={(e) => setDescripcion(e.target.value)}
          style={{ flex: '1 1 180px' }}
        />
        <Button type="button" onClick={subir} disabled={!archivo || subiendo}>
          <FaUpload /> {subiendo ? 'Subiendo...' : 'Subir'}
        </Button>
      </Subida>
    </Seccion>
  );
};

export default GestorImagenes;
