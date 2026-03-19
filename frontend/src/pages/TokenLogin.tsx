import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { tokenLogin } from '../api';

interface TokenLoginProps {
  onLogin: () => void;
}

const styles = {
  container: {
    maxWidth: '400px',
    margin: '4rem auto',
    padding: '2rem',
    background: '#fff',
    borderRadius: '8px',
    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
  },
  title: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
    textAlign: 'center' as const,
  },
  subtitle: {
    color: '#666',
    textAlign: 'center' as const,
    marginBottom: '2rem',
  },
  form: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '1rem',
  },
  input: {
    padding: '0.75rem 1rem',
    border: '1px solid #ddd',
    borderRadius: '4px',
    fontSize: '1rem',
    fontFamily: 'monospace',
  },
  button: {
    background: '#333',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
  },
  buttonDisabled: {
    background: '#999',
    cursor: 'not-allowed',
  },
  error: {
    color: '#d32f2f',
    background: '#ffebee',
    padding: '0.75rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
  link: {
    textAlign: 'center' as const,
    marginTop: '1.5rem',
    color: '#666',
    fontSize: '0.875rem',
  },
};

export function TokenLogin({ onLogin }: TokenLoginProps) {
  const navigate = useNavigate();
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) return;

    setLoading(true);
    setError('');

    try {
      await tokenLogin(token.trim());
      onLogin();
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Token Login</h1>
      <p style={styles.subtitle}>Sign in with an API key</p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleSubmit} style={styles.form}>
        <input
          type="password"
          placeholder="Paste your API key"
          value={token}
          onChange={(e) => setToken(e.target.value)}
          style={styles.input}
          autoComplete="off"
        />

        <button
          type="submit"
          disabled={loading || !token.trim()}
          style={{
            ...styles.button,
            ...(loading || !token.trim() ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? 'Signing in...' : 'Sign In'}
        </button>
      </form>

      <div style={styles.link}>
        <Link to="/login" style={{ color: '#0066cc' }}>Sign in with passkey instead</Link>
      </div>
    </div>
  );
}
