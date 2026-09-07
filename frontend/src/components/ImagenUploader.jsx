import { useState } from 'react';
import axios from 'axios';

const ImagenUploader = ({ tipoEntidad, entidadId, onUploadSuccess }) => {
  const [file, setFile] = useState(null);
  const [descripcion, setDescripcion] = useState('');
  const [loading, setLoading] = useState(false);
  const token = localStorage.getItem('token');

  const handleUpload = async () => {
    if (!file || !tipoEntidad || !entidadId) {
      alert('Faltan datos para subir la imagen');
      return;
    }

    const formData = new FormData();
    formData.append('imagen', file);
    formData.append('tipoEntidad', tipoEntidad);
    formData.append('entidadId', entidadId);
    formData.append('descripcion', descripcion);

    try {
      setLoading(true);
      const res = await axios.post('http://localhost:3000/api/imagenes', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          Authorization: `Bearer ${token}`,
        },
      });
      console.log('Imagen subida:', res.data);
      setFile(null);
      setDescripcion('');
      if (onUploadSuccess) onUploadSuccess(res.data);
    } catch (err) {
      console.error('Error al subir imagen:', err);
      alert('Error al subir imagen');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ marginTop: '1rem' }}>
      <h4>Subir imagen</h4>
      <input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <input
        type="text"
        placeholder="Descripción"
        value={descripcion}
        onChange={(e) => setDescripcion(e.target.value)}
        style={{ marginLeft: '1rem' }}
      />
      <button onClick={handleUpload} disabled={loading} style={{ marginLeft: '1rem' }}>
        {loading ? 'Subiendo...' : 'Subir'}
      </button>
    </div>
  );
};

export default ImagenUploader;
