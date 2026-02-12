import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getInviteInfo } from '../api';
import { register } from '../auth';

interface InviteProps {
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
    textAlign: 'center' as const,
  },
  loading: {
    textAlign: 'center' as const,
    color: '#666',
    padding: '2rem',
  },
  invalid: {
    textAlign: 'center' as const,
    color: '#d32f2f',
  },
};

export function Invite({ onRegister }: InviteProps) {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [registering, setRegistering] = useState(false);
  const [error, setError] = useState('');
  const [inviteStatus, setInviteStatus] = useState<{
    valid: boolean;
    used: boolean;
    alreadyLoggedIn: boolean;
  } | null>(null);

  useEffect(() => {
    if (!token) return;

    getInviteInfo(token)
      .then((status) => {
        setInviteStatus(status);
        if (status.alreadyLoggedIn) {
          navigate('/');
        }
      })
      .catch((err) => {
        setError(err instanceof Error ? err.message : 'Failed to load invite');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, navigate]);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setRegistering(true);
    setError('');

    try {
      const success = await register(email, token);
      if (success) {
        onRegister();
        navigate('/');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setRegistering(false);
    }
  };

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Loading invite...</p>
      </div>
    );
  }

  if (!inviteStatus || !inviteStatus.valid || inviteStatus.used) {
    return (
      <div style={styles.container}>
        <h1 style={styles.title}>Invalid Invite</h1>
        <p style={styles.invalid}>
          {inviteStatus?.used
            ? 'This invite has already been used.'
            : 'This invite link is invalid or has expired.'}
        </p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>You're Invited!</h1>
      <p style={styles.subtitle}>Create your account to access shared magic links</p>

      {error && <div style={styles.error}>{error}</div>}

      <form onSubmit={handleRegister} style={styles.form}>
        <input
          type="email"
          placeholder="Your email address"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          style={styles.input}
        />

        <button
          type="submit"
          disabled={registering || !email}
          style={{
            ...styles.button,
            ...(registering || !email ? styles.buttonDisabled : {}),
          }}
        >
          {registering ? 'Creating account...' : 'Create Account with Passkey'}
        </button>
      </form>
    </div>
  );
}
