import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../auth';

interface LoginProps {
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
  },
  button: {
    background: '#333',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    marginTop: '0.5rem',
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
  divider: {
    textAlign: 'center' as const,
    color: '#999',
    margin: '1.5rem 0',
    position: 'relative' as const,
  },
  passkeyButton: {
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    padding: '0.75rem 1rem',
    borderRadius: '4px',
    fontSize: '1rem',
    cursor: 'pointer',
    width: '100%',
  },
};

export function Login({ onLogin }: LoginProps) {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handlePasskeyLogin = async () => {
    setLoading(true);
    setError('');

    try {
      // Use email if provided, otherwise let the browser show all available passkeys
      const success = await login(email || undefined);
      if (success) {
        onLogin();
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Welcome Back</h1>
      <p style={styles.subtitle}>Sign in with your passkey</p>

      {error && <div style={styles.error}>{error}</div>}

      <div style={styles.form}>
        <input
          type="email"
          placeholder="Email (optional)"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />

        <button
          onClick={handlePasskeyLogin}
          disabled={loading}
          style={{
            ...styles.passkeyButton,
            ...(loading ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? 'Authenticating...' : 'Sign in with Passkey'}
        </button>
      </div>
    </div>
  );
}
