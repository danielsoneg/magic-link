import { useState } from 'react';
import { markLinkUsed } from '../api';

interface MagicLink {
  id: string;
  linkUrl: string;
  subject: string | null;
  receivedAt: string;
  usedAt?: string | null;
  usedBy?: string | null;
}

interface LinkCardProps {
  link: MagicLink;
  onUsed?: (id: string) => void;
}

const styles = {
  card: {
    background: '#fff',
    borderRadius: '8px',
    padding: '1rem 1.5rem',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    marginBottom: '1rem',
  },
  cardUsed: {
    opacity: 0.5,
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
    gap: '0.5rem',
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
  copyButton: {
    background: '#fff',
    color: '#0066cc',
    border: '1px solid #0066cc',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap' as const,
  },
  usedButton: {
    background: '#fff',
    color: '#666',
    border: '1px solid #ccc',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '0.875rem',
    whiteSpace: 'nowrap' as const,
  },
  usedBadge: {
    color: '#666',
    fontSize: '0.875rem',
    fontStyle: 'italic' as const,
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

export function LinkCard({ link, onUsed }: LinkCardProps) {
  const [copied, setCopied] = useState(false);
  const [used, setUsed] = useState(!!link.usedAt);

  const handleOpen = () => {
    window.open(link.linkUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(link.linkUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleMarkUsed = async () => {
    try {
      await markLinkUsed(link.id);
      setUsed(true);
      onUsed?.(link.id);
    } catch {
      // ignore
    }
  };

  return (
    <div style={{ ...styles.card, ...(used ? styles.cardUsed : {}) }}>
      <div style={styles.header}>
        <div style={styles.subject}>{link.subject || '(No subject)'}</div>
        <div style={styles.time}>
          {used && <span style={styles.usedBadge}>Used · </span>}
          {formatTime(link.receivedAt)}
        </div>
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
        {!used && (
          <button onClick={handleMarkUsed} style={styles.usedButton}>
            Mark Used
          </button>
        )}
        <button onClick={handleCopy} style={styles.copyButton}>
          {copied ? 'Copied!' : 'Copy'}
        </button>
        <button onClick={handleOpen} style={styles.button}>
          Open
        </button>
      </div>
    </div>
  );
}
