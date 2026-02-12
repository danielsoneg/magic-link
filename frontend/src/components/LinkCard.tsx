import React from 'react';

interface MagicLink {
  id: string;
  linkUrl: string;
  subject: string | null;
  receivedAt: string;
}

interface LinkCardProps {
  link: MagicLink;
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '1rem',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '0.75rem',
  },
  subject: {
    fontSize: '1rem',
    fontWeight: '500',
    color: '#333',
    flex: 1,
    marginRight: '1rem',
  },
  time: {
    color: '#666',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap' as const,
  },
  linkContainer: {
    display: 'flex',
    gap: '1rem',
    alignItems: 'center',
  },
  link: {
    color: '#0066cc',
    textDecoration: 'none',
    fontSize: '0.875rem',
    wordBreak: 'break-all' as const,
    flex: 1,
  },
  button: {
    background: '#0066cc',
    color: '#fff',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap' as const,
  },
};

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleString();
}

function truncateUrl(url: string, maxLength = 60): string {
  if (url.length <= maxLength) return url;
  return url.substring(0, maxLength) + '...';
}

export function LinkCard({ link }: LinkCardProps) {
  const handleOpen = () => {
    window.open(link.linkUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={styles.card}>
      <div style={styles.header}>
        <div style={styles.subject}>{link.subject || '(No subject)'}</div>
        <div style={styles.time}>{formatTime(link.receivedAt)}</div>
      </div>
      <div style={styles.linkContainer}>
        <a
          href={link.linkUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={styles.link}
          title={link.linkUrl}
        >
          {truncateUrl(link.linkUrl)}
        </a>
        <button onClick={handleOpen} style={styles.button}>
          Open Link
        </button>
      </div>
    </div>
  );
}
