import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getService } from '../api';
import { LinkCard } from '../components/LinkCard';

interface Service {
  id: string;
  slug: string;
  displayName: string | null;
  iconUrl: string | null;
}

interface MagicLink {
  id: string;
  serviceId: string;
  linkUrl: string;
  subject: string | null;
  receivedAt: string;
}

const styles = {
  container: {
    maxWidth: '700px',
    margin: '0 auto',
  },
  backLink: {
    color: '#666',
    textDecoration: 'none',
    display: 'inline-block',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    marginBottom: '2rem',
  },
  icon: {
    width: '64px',
    height: '64px',
    borderRadius: '12px',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '2rem',
  },
  title: {
    fontSize: '1.75rem',
    fontWeight: 'bold',
  },
  subtitle: {
    color: '#666',
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

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

export function ServiceLinks() {
  const { slug } = useParams<{ slug: string }>();
  const [service, setService] = useState<Service | null>(null);
  const [links, setLinks] = useState<MagicLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    let mounted = true;

    const fetchService = () => {
      getService(slug)
        .then((data) => {
          if (mounted) {
            setService(data.service);
            setLinks(data.links);
          }
        })
        .catch((err) => {
          if (mounted) setError(err instanceof Error ? err.message : 'Failed to load service');
        })
        .finally(() => {
          if (mounted) setLoading(false);
        });
    };

    fetchService();
    const interval = setInterval(fetchService, 10000);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [slug]);

  if (loading) {
    return (
      <div style={styles.container}>
        <p style={styles.loading}>Loading...</p>
      </div>
    );
  }

  if (!service) {
    return (
      <div style={styles.container}>
        <Link to="/" style={styles.backLink}>
          &larr; Back to services
        </Link>
        <div style={styles.error}>Service not found</div>
      </div>
    );
  }

  const displayName = service.displayName || service.slug;

  return (
    <div style={styles.container}>
      <Link to="/" style={styles.backLink}>
        &larr; Back to services
      </Link>

      <div style={styles.header}>
        <div style={styles.icon}>
          {service.iconUrl ? (
            <img
              src={service.iconUrl}
              alt={displayName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '12px' }}
            />
          ) : (
            getInitial(displayName)
          )}
        </div>
        <div>
          <h1 style={styles.title}>{displayName}</h1>
          <p style={styles.subtitle}>{links.length} magic link(s)</p>
        </div>
      </div>

      {error && <div style={styles.error}>{error}</div>}

      {links.length === 0 ? (
        <div style={styles.empty}>
          <p>No magic links yet for this service.</p>
        </div>
      ) : (
        links.map((link) => <LinkCard key={link.id} link={link} />)
      )}
    </div>
  );
}
