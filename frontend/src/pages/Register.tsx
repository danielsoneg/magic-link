import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { register } from '../auth';

interface RegisterProps {
  onRegister: () => void;
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
  note: {
    color: '#666',
    fontSize: '0.875rem',
    textAlign: 'center' as const,
    marginTop: '1rem',
  },
};

export function Register({ onRegister }: RegisterProps) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const inviteToken = searchParams.get('invite') || undefined;

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await register(email, inviteToken);
      if (success) {
        onRegister();
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Create Account</h1>
      <p style={styles.subtitle}>Register with a passkey for secure, passwordless login</p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleRegister} style={styles.form}>
        <input
          type="email"
          placeholder="Email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <button
          type="submit"
          disabled={loading || !email}
          style={{
            ...styles.button,
            ...(loading || !email ? styles.buttonDisabled : {}),
          }}
        >
          {loading ? 'Creating passkey...' : 'Register with Passkey'}
        </button>
      </form>

      <p style={styles.note}>
        Your passkey will be stored securely on your device.
        <br />
        You can use Face ID, Touch ID, or your device PIN.
      </p>
    </div>
  );
}
