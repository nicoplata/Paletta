import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { mensajeError } from '../../lib/api';
import styles from '../../styles/LoginAdmin.module.css';
import logoBlack from '../../assets/img/isotipo.png';

const LoginAdmin = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login, logout, usuario } = useAuth();

  const PUEDEN = ['administrador', 'encargado'];
  if (PUEDEN.includes(usuario?.rol)) {
    return <Navigate to="/admin/dashboard" replace />;
  }

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const usuarioLogueado = await login(email, password);
      if (!PUEDEN.includes(usuarioLogueado.rol)) {
        logout();
        setError('Tu usuario no tiene acceso al panel de administración');
        return;
      }
      navigate('/admin/dashboard', { replace: true });
    } catch (err) {
      setError(mensajeError(err, 'No se pudo iniciar sesión'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.loginContainer}>
      <div className={styles.loginBox}>
        <img src={logoBlack} alt="Logo Paletta" className={styles.logo} />
        <h1 className={styles.title}>Panel de Administración</h1>
        
        <form onSubmit={handleLogin} className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email" className={styles.label}>Correo electrónico</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className={styles.input}
              placeholder="usuario@paletta.com.ar"
              autoComplete="username"
            />
          </div>

          <div className={styles.inputGroup}>
            <label htmlFor="password" className={styles.label}>Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className={styles.input}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </div>

          {error && <div className={styles.error}>{error}</div>}

          <button 
            type="submit" 
            className={styles.button}
            disabled={loading}
          >
            {loading ? 'Iniciando sesión...' : 'Iniciar sesión'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default LoginAdmin;