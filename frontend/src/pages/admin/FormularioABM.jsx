import React from 'react';

const FormularioABM = ({
  campos,
  valores,
  setValores,
  onSubmit,
  textoBoton = 'Guardar',
}) => {
  const handleChange = (e) => {
    const { name, value } = e.target;
    setValores((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <form onSubmit={onSubmit} style={{ marginBottom: '2rem' }}>
      {campos.map((campo) => (
        <div key={campo.name} style={{ marginBottom: '1rem' }}>
          <label>{campo.label}</label>
          <input
            type={campo.type || 'text'}
            name={campo.name}
            value={valores[campo.name] || ''}
            onChange={handleChange}
            placeholder={campo.placeholder || ''}
            required={campo.required || false}
          />
        </div>
      ))}
      <button type="submit">{textoBoton}</button>
    </form>
  );
};

export default FormularioABM;
