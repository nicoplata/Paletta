# Paletta - Documentación

## Estructura del Proyecto

El proyecto está dividido en dos partes principales:

### Frontend (React + Vite)

```
frontend/
├── src/
│   ├── components/        # Componentes reutilizables
│   │   ├── common/       # Componentes base (Button, Input, etc.)
│   │   └── layout/       # Componentes de estructura
│   ├── context/          # Contextos de React (Auth, Cart, etc.)
│   ├── hooks/            # Hooks personalizados
│   ├── pages/           # Componentes de página
│   ├── styles/          # Estilos CSS
│   └── utils/           # Funciones utilitarias
└── tests/               # Tests unitarios y de integración

### Backend (Node.js + Express)

```
backend/
├── src/
│   ├── controllers/     # Controladores de rutas
│   ├── models/         # Modelos de datos
│   ├── middleware/     # Middleware personalizado
│   ├── routes/         # Definiciones de rutas
│   ├── services/       # Lógica de negocio
│   └── utils/          # Funciones utilitarias
└── tests/             # Tests del backend
```

## Configuración del Proyecto

1. Instalar dependencias:
```bash
# Frontend
cd frontend
npm install

# Backend
cd backend
npm install
```

2. Variables de entorno:
- Crear archivo `.env` en la raíz del backend:
```
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_USER=usuario
DB_PASS=contraseña
DB_NAME=paletta
JWT_SECRET=tu_secreto
```

3. Base de datos:
```bash
# Crear base de datos
npx prisma migrate dev
```

## Características Principales

### Frontend
- Autenticación y autorización
- Carrito de compras
- Gestión de productos
- Panel de administración
- Sistema de notificaciones
- Búsqueda y filtrado
- Paginación
- Optimización de rendimiento
- Accesibilidad

### Backend
- API RESTful
- Autenticación JWT
- Validación de datos
- Manejo de archivos
- Rate limiting
- Logging
- Caché
- Tests

## Testing

```bash
# Ejecutar tests del frontend
cd frontend
npm test

# Ejecutar tests del backend
cd backend
npm test
```

## Despliegue

1. Frontend:
```bash
cd frontend
npm run build
```

2. Backend:
```bash
cd backend
npm run build
```

## Mantenimiento

- Logs: Los logs se encuentran en `/var/log/paletta/`
- Monitoreo: Integrado con Sentry
- Backups: Programados diariamente
- Actualizaciones: Usar `npm audit` regularmente

## API Documentation

La documentación completa de la API está disponible en:
`http://localhost:3000/api-docs`

## Contribución

1. Fork el repositorio
2. Crear rama (`git checkout -b feature/AmazingFeature`)
3. Commit cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push a la rama (`git push origin feature/AmazingFeature`)
5. Abrir Pull Request

## Licencia

Distribuido bajo la licencia MIT. Ver `LICENSE` para más información.
