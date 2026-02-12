import { useState, useEffect } from 'react';
import { getServices } from '../api';
import { ServiceCard } from '../components/ServiceCard';

interface Service {
  id: string;
  slug: string;
  displayName: string | null;
  iconUrl: string | null;
  createdAt: string;
  latestLink?: string | null;
  linkCount?: number;
}

const styles = {
  container: {
    maxWidth: '900px',
    margin: '0 auto',
  },
  header: {
    marginBottom: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem',
  },
  subtitle: {
    color: '#666',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))',
    gap: '1.5rem',
  },
  empty: {
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    background: '#fff',
    borderRadius: '8px',
    color: '#666',
  },
  loading: {
    textAlign: 'center' as const,
    padding: '4rem 2rem',
    color: '#666',
  },
  error: {
    color: '#d32f2f',
    background: '#ffebee',
    padding: '1rem',
    borderRadius: '4px',
    marginBottom: '1rem',
  },
};

export function Services() {
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let mounted = true;

    const fetchServices = () => {
      getServices()
        .then((data) => {
          if (mounted) setServices(data.services);
        })
        .catch((err) => {
          if (mounted) setError(err instanceof Error ? err.message : 'Failed to load services');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    };

    fetchServices();
    const interval = setInterval(fetchServices, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, []);

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Loading services...</p>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.title}>Services</h1>
        <p style={styles.subtitle}>
          Magic links from your connected services
        </p>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {services.length === 0 ? (
        <div style={styles.empty}>
          <p>No services yet.</p>
          <p>Magic links will appear here when emails arrive.</p>
        </div>
      ) : (
        <div style={styles.grid}>
          {services.map((service) => (
            <ServiceCard key={service.id} service={service} />
          ))}
        </div>
      )}
    </div>
  );
}
