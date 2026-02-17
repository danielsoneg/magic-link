import { Link } from 'react-router-dom';

interface Service {
  id: string;
  slug: string;
  displayName: string | null;
  iconUrl: string | null;
  serviceUrl: string | null;
  latestLink?: string | null;
  linkCount?: number;
}

interface ServiceCardProps {
  service: Service;
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    textDecoration: 'none',
    color: 'inherit',
    display: 'block',
    transition: 'transform 0.2s, box-shadow 0.2s',
  },
  icon: {
    width: '48px',
    height: '48px',
    borderRadius: '8px',
    background: '#f0f0f0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem',
    fontSize: '1.5rem',
  },
  name: {
    fontSize: '1.25rem',
    fontWeight: '600',
    marginBottom: '0.5rem',
  },
  siteLink: {
    fontSize: '0.8rem',
    color: '#666',
    textDecoration: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    marginBottom: '0.5rem',
  },
  meta: {
    color: '#666',
    fontSize: '0.875rem',
  },
};

function getInitial(name: string): string {
  return name.charAt(0).toUpperCase();
}

function formatRelativeTime(dateStr: string | null | undefined): string {
  if (!dateStr) return 'No links yet';

  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export function ServiceCard({ service }: ServiceCardProps) {
  const displayName = service.displayName || service.slug;

  return (
    <Link
      to={`/service/${service.slug}`}
      style={styles.card}
      onMouseOver={(e) => {
        e.currentTarget.style.transform = 'translateY(-2px)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.15)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.transform = 'none';
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      }}
    >
      <div style={styles.icon}>
        {service.iconUrl ? (
          <img
            src={service.iconUrl}
            alt={displayName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '8px' }}
          />
        ) : (
          getInitial(displayName)
        )}
      </div>
      <div style={styles.name}>{displayName}</div>
      {service.serviceUrl && (
        <a
          href={service.serviceUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.siteLink}
          onClick={(e) => e.stopPropagation()}
        >
          {new URL(service.serviceUrl).host} &#8599;
        </a>
      )}
      <div style={styles.meta}>
        {service.linkCount || 0} links · {formatRelativeTime(service.latestLink)}
      </div>
    </Link>
  );
}
