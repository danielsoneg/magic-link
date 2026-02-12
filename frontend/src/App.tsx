import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Invite } from './pages/Invite';
import { Services } from './pages/Services';
import { ServiceLinks } from './pages/ServiceLinks';
import { Admin } from './pages/Admin';
import { getMe } from './api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

function App() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuth = async () => {
    try {
      const { user } = await getMe();
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, []);

  const handleLogin = () => {
    checkAuth();
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100vh',
        }}
      >
        Loading...
      </div>
    );
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Routes>
        <Route
          path="/login"
          element={user ? <Navigate to="/" /> : <Login onLogin={handleLogin} />}
        />
        <Route
          path="/register"
          element={user ? <Navigate to="/" /> : <Register onRegister={handleLogin} />}
        />
        <Route path="/invite/:token" element={<Invite onRegister={handleLogin} />} />
        <Route
          path="/"
          element={user ? <Services /> : <Navigate to="/login" />}
        />
        <Route
          path="/service/:slug"
          element={user ? <ServiceLinks /> : <Navigate to="/login" />}
        />
        <Route
          path="/admin"
          element={
            user?.isAdmin ? <Admin /> : <Navigate to="/" />
          }
        />
      </Routes>
    </Layout>
  );
}

export default App;
