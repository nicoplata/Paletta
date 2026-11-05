import styled from 'styled-components';
import { FaArrowDown, FaArrowUp, FaPlus, FaTrash } from 'react-icons/fa';
import { Button, Hint, IconButton, Input } from '../../pages/admin/adminUI';

const TALLES_RAPIDOS = {
  Adulto: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
  Niños: ['4', '6', '8', '10', '12', '14', '16'],
};

const Tabla = styled.table`
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 0.75rem;

  th { text-align: left; font-size: 0.85rem; color: #7f8c8d; font-weight: 600; padding: 0.25rem 0.4rem; }
  td { padding: 0.3rem 0.4rem; vertical-align: middle; }
  input[type='number'], input[type='text'] { width: 100%; box-sizing: border-box; }
`;

const Atajos = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.5rem;
`;

// Editor de talles (variantes) de un producto con su stock.
const EditorVariantes = ({ variantes, onChange }) => {
  const actualizar = (i, campo, valor) => onChange(variantes.map((v, j) => (j === i ? { ...v, [campo]: valor } : v)));
  const quitar = (i) => onChange(variantes.filter((_, j) => j !== i));
  const mover = (i, delta) => {
    const copia = [...variantes];
    const [v] = copia.splice(i, 1);
    copia.splice(i + delta, 0, v);
    onChange(copia);
  };
  const agregar = (talle = '') => onChange([...variantes, { talle, stock: '0', activo: true }]);
  const agregarSerie = (talles) => {
    const existentes = new Set(variantes.map((v) => v.talle.trim().toLowerCase()));
    const nuevos = talles.filter((t) => !existentes.has(t.toLowerCase())).map((talle) => ({ talle, stock: '0', activo: true }));
    // Si solo había un talle "Único" vacío, se reemplaza por la serie
    const base = variantes.length === 1 && !variantes[0].id && !variantes[0].talle ? [] : variantes;
    onChange([...base, ...nuevos]);
  };

  const total = variantes.filter((v) => v.activo).reduce((acc, v) => acc + (Number(v.stock) || 0), 0);

  return (
    <div>
      <Tabla>
        <thead>
          <tr><th>Talle</th><th style={{ width: 110 }}>Stock</th><th style={{ width: 70 }}>Visible</th><th style={{ width: 110 }} aria-label="Acciones" /></tr>
        </thead>
        <tbody>
          {variantes.map((v, i) => (
            <tr key={v.id || `nuevo-${i}`}>
              <td>
                <Input
                  type="text"
                  value={v.talle}
                  onChange={(e) => actualizar(i, 'talle', e.target.value)}
                  required
                  maxLength={30}
                  aria-label={`Talle ${i + 1}`}
                />
              </td>
              <td>
                <Input
                  type="number"
                  min="0"
                  step="1"
                  value={v.stock}
                  onChange={(e) => actualizar(i, 'stock', e.target.value)}
                  required
                  aria-label={`Stock del talle ${v.talle || i + 1}`}
                />
              </td>
              <td style={{ textAlign: 'center' }}>
                <input type="checkbox" checked={v.activo} onChange={(e) => actualizar(i, 'activo', e.target.checked)} aria-label={`Talle ${v.talle} visible`} />
              </td>
              <td style={{ whiteSpace: 'nowrap' }}>
                <IconButton type="button" onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir"><FaArrowUp /></IconButton>
                <IconButton type="button" onClick={() => mover(i, 1)} disabled={i === variantes.length - 1} aria-label="Bajar"><FaArrowDown /></IconButton>
                <IconButton type="button" $peligro onClick={() => quitar(i)} disabled={variantes.length === 1} aria-label={`Quitar talle ${v.talle}`}><FaTrash /></IconButton>
              </td>
            </tr>
          ))}
        </tbody>
      </Tabla>
      <Atajos>
        <Button type="button" onClick={() => agregar()}><FaPlus /> Agregar talle</Button>
        {Object.entries(TALLES_RAPIDOS).map(([nombre, talles]) => (
          <Button key={nombre} type="button" onClick={() => agregarSerie(talles)}>+ Serie {nombre} ({talles[0]}–{talles.at(-1)})</Button>
        ))}
      </Atajos>
      <Hint style={{ marginTop: '0.5rem' }}>Stock total visible: {total}. Si el producto no tiene talles, usá uno solo (por ejemplo "Único").</Hint>
    </div>
  );
};

export default EditorVariantes;
