import styled from 'styled-components';

// Componentes de UI compartidos por las pantallas del panel de administración.

export const Container = styled.div`
  padding: 1rem;
`;

export const Header = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
  margin-bottom: 2rem;
`;

export const Title = styled.h1`
  color: #2c3e50;
  margin: 0;
  font-size: 1.6rem;
`;

export const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.5rem;
`;

export const Card = styled.div`
  background: var(--color-superficie);
  border-radius: 10px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  opacity: ${({ $inactivo }) => ($inactivo ? 0.6 : 1)};
`;

export const CardTitle = styled.h3`
  color: #2c3e50;
  margin: 0 0 0.5rem 0;
`;

export const CardText = styled.p`
  color: #7f8c8d;
  margin: 0 0 0.25rem 0;
`;

export const Tag = styled.span`
  display: inline-block;
  background: ${({ $color }) => $color || '#3498db'};
  color: white;
  padding: 0.2rem 0.7rem;
  border-radius: 15px;
  font-size: 0.8rem;
  margin: 0 0.35rem 0.35rem 0;
`;

export const Actions = styled.div`
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: auto;
  padding-top: 1rem;
  border-top: 1px solid #eee;
`;

export const IconButton = styled.button`
  background: none;
  border: none;
  color: ${({ $peligro }) => ($peligro ? 'var(--color-primario)' : '#3498db')};
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 4px;
  transition: background 0.2s;

  &:hover {
    background: ${({ $peligro }) => ($peligro ? 'var(--color-primario-suave)' : '#edf6fd')};
  }
`;

export const Button = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  cursor: pointer;
  transition: background 0.2s;
  background: ${({ $primario }) => ($primario ? 'var(--color-primario)' : '#eee')};
  color: ${({ $primario }) => ($primario ? 'white' : '#2c3e50')};

  &:hover:not(:disabled) {
    background: ${({ $primario }) => ($primario ? 'var(--color-primario-oscuro)' : '#ddd')};
  }

  &:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }
`;

export const Form = styled.form`
  display: grid;
  gap: 1.25rem;
  max-width: 800px;
`;

export const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
`;

export const Row = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.25rem;
`;

export const Label = styled.label`
  color: #2c3e50;
  font-weight: 500;
`;

const campo = `
  padding: 0.7rem;
  border: 2px solid #eee;
  border-radius: 8px;
  font-size: 1rem;
  font-family: inherit;
  background: var(--color-superficie);

  &:focus {
    outline: none;
    border-color: var(--color-primario);
  }
`;

export const Input = styled.input`${campo}`;
export const Select = styled.select`${campo}`;
export const TextArea = styled.textarea`
  ${campo}
  min-height: 110px;
  resize: vertical;
`;

export const CheckLabel = styled.label`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: #2c3e50;
  margin-right: 1.25rem;
  cursor: pointer;
`;

export const ErrorBox = styled.div`
  background: #ffebee;
  color: #c62828;
  padding: 0.75rem 1rem;
  border-radius: 8px;
`;

export const Hint = styled.p`
  color: #7f8c8d;
  margin: 0;
  font-size: 0.9rem;
`;

export const Empty = styled.p`
  grid-column: 1 / -1;
  text-align: center;
  color: #666;
`;

export const ButtonGroup = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 0.5rem;
`;
