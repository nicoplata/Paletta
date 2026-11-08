import { useSearchParams } from 'react-router-dom';
import { Button, Container, Header, Title } from '../adminUI';
import Modelos from './Modelos';
import Materiales from './Materiales';
import Compras from './Compras';

const PESTANAS = { modelos: 'Fichas técnicas', materiales: 'Materiales', compras: 'Lista de compras' };

// Producción de egresados: fichas técnicas, catálogo de materiales y compras
const ProduccionAdmin = () => {
  const [params, setParams] = useSearchParams();
  const tab = PESTANAS[params.get('tab')] ? params.get('tab') : 'modelos';

  return (
    <Container>
      <Header className="no-print">
        <Title>Producción</Title>
        <div role="tablist" aria-label="Secciones de producción" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {Object.entries(PESTANAS).map(([k, t]) => (
            <Button key={k} type="button" role="tab" aria-selected={tab === k} $primario={tab === k} onClick={() => setParams({ tab: k })} style={{ padding: '0.5rem 0.9rem' }}>{t}</Button>
          ))}
        </div>
      </Header>
      {tab === 'modelos' && <Modelos />}
      {tab === 'materiales' && <Materiales />}
      {tab === 'compras' && <Compras />}
    </Container>
  );
};

export default ProduccionAdmin;
