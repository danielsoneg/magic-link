import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { logout } from '../api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

interface LayoutProps {
  children: React.ReactNode;
  user: User | null;
  onLogout: () => void;
}

const styles = {
  container: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column' as const,
  },
  header: {
    background: '#fff',
    borderBottom: '1px solid #e0e0e0',
    padding: '1rem 2rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logo: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    color: '#333',
    textDecoration: 'none',
  },
  nav: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  navLink: {
    color: '#666',
    textDecoration: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    transition: 'background 0.2s',
  },
  main: {
    flex: 1,
    padding: '2rem',
    maxWidth: '1200px',
    margin: '0 auto',
    width: '100%',
  },
  button: {
    background: '#333',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.9rem',
  },
  userInfo: {
    color: '#666',
    marginRight: '1rem',
  },
};

export function Layout({ children, user, onLogout }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      onLogout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <Link to="/" style={styles.logo}>
          Magic Link
        </Link>
        <nav style={styles.nav}>
          {user ? (
            <>
              <Link to="/" style={styles.navLink}>
                Services
              </Link>
              {user.isAdmin && (
                <Link to="/admin" style={styles.navLink}>
                  Admin
                </Link>
              )}
              <span style={styles.userInfo}>{user.displayName || user.email}</span>
              <button onClick={handleLogout} style={styles.button}>
                Logout
              </button>
            </>
          ) : (
            <Link to="/login" style={styles.navLink}>
              Login
            </Link>
          )}
        </nav>
      </header>
      <main style={styles.main}>{children}</main>
    </div>
  );
}
