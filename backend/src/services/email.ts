import { config } from '../config.js';
import { db, schema } from '../db/index.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { extractMagicLink, isLoginEmail } from './linkExtractor.js';

interface JmapSession {
  apiUrl: string;
  accountId: string;
  eventSourceUrl: string;
}

interface JmapEmail {
  id: string;
  subject: string;
  from: { email: string }[] | null;
  to: { email: string }[] | null;
  receivedAt: string;
  bodyValues?: Record<string, { value: string }>;
  htmlBody?: { partId: string }[];
  textBody?: { partId: string }[];
}

let session: JmapSession | null = null;
let eventSourceAbort: AbortController | null = null;
let fallbackInterval: ReturnType<typeof setInterval> | null = null;

async function getSession(): Promise<JmapSession> {
  if (session) return session;

  const response = await fetch('https://api.fastmail.com/jmap/session', {
    headers: {
      Authorization: `Bearer ${config.fastmail.appPassword}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to get JMAP session: ${response.statusText}`);
  }

  const data = await response.json() as {
    apiUrl: string;
    primaryAccounts: { 'urn:ietf:params:jmap:mail': string };
    eventSourceUrl: string;
  };

  session = {
    apiUrl: data.apiUrl,
    accountId: data.primaryAccounts['urn:ietf:params:jmap:mail'],
    eventSourceUrl: data.eventSourceUrl,
  };

  return session;
}

async function jmapRequest(methodCalls: unknown[][]): Promise<unknown[][]> {
  const sess = await getSession();
  const response = await fetch(sess.apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${config.fastmail.appPassword}`,
    },
    body: JSON.stringify({
      using: ['urn:ietf:params:jmap:core', 'urn:ietf:params:jmap:mail'],
      methodCalls,
    }),
  });

  if (!response.ok) {
    throw new Error(`JMAP request failed: ${response.statusText}`);
  }

  const data = await response.json() as { methodResponses: unknown[][] };
  return data.methodResponses;
}

async function getInboxId(): Promise<string> {
  const sess = await getSession();
  const responses = await jmapRequest([
    [
      'Mailbox/query',
      {
        accountId: sess.accountId,
        filter: { role: 'inbox' },
      },
      '0',
    ],
  ]);

  const result = responses[0][1] as { ids: string[] };
  return result.ids[0];
}

async function getOrCreateProcessedMailbox(): Promise<string> {
  const sess = await getSession();

  // Try to find existing "Processed" mailbox
  const queryResponses = await jmapRequest([
    [
      'Mailbox/query',
      {
        accountId: sess.accountId,
        filter: { name: 'Magic Link Processed' },
      },
      '0',
    ],
  ]);

  const queryResult = queryResponses[0][1] as { ids: string[] };
  if (queryResult.ids.length > 0) {
    return queryResult.ids[0];
  }

  // Create the mailbox
  const createResponses = await jmapRequest([
    [
      'Mailbox/set',
      {
        accountId: sess.accountId,
        create: {
          processed: {
            name: 'Magic Link Processed',
          },
        },
      },
      '0',
    ],
  ]);

  const createResult = createResponses[0][1] as { created: { processed: { id: string } } };
  return createResult.created.processed.id;
}

async function fetchNewEmails(): Promise<JmapEmail[]> {
  const sess = await getSession();
  const inboxId = await getInboxId();

  // Query for emails in inbox to the catch-all domain
  const queryResponses = await jmapRequest([
    [
      'Email/query',
      {
        accountId: sess.accountId,
        filter: {
          inMailbox: inboxId,
          to: `@${config.fastmail.domain}`,
        },
        sort: [{ property: 'receivedAt', isAscending: false }],
        limit: 50,
      },
      '0',
    ],
  ]);

  const queryResult = queryResponses[0][1] as { ids: string[] };
  if (queryResult.ids.length === 0) {
    return [];
  }

  // Fetch email details
  const getResponses = await jmapRequest([
    [
      'Email/get',
      {
        accountId: sess.accountId,
        ids: queryResult.ids,
        properties: [
          'id',
          'subject',
          'from',
          'to',
          'receivedAt',
          'bodyValues',
          'htmlBody',
          'textBody',
        ],
        fetchAllBodyValues: true,
      },
      '0',
    ],
  ]);

  const getResult = getResponses[0][1] as { list: JmapEmail[] };
  return getResult.list;
}

async function moveToProcessed(emailId: string): Promise<void> {
  const sess = await getSession();
  const processedMailboxId = await getOrCreateProcessedMailbox();
  const inboxId = await getInboxId();

  await jmapRequest([
    [
      'Email/set',
      {
        accountId: sess.accountId,
        update: {
          [emailId]: {
            [`mailboxIds/${inboxId}`]: null,
            [`mailboxIds/${processedMailboxId}`]: true,
          },
        },
      },
      '0',
    ],
  ]);
}

async function processEmail(email: JmapEmail): Promise<void> {
  const subject = email.subject || '(no subject)';
  const fromEmail = email.from?.[0]?.email || 'unknown';
  const toEmail = email.to?.[0]?.email || '';

  // Extract service slug from recipient
  const toLocalPart = toEmail.split('@')[0];
  if (!toLocalPart) {
    console.log(`Skipping email: no valid recipient local part`);
    await moveToProcessed(email.id);
    return;
  }

  const slug = toLocalPart.toLowerCase().replace(/[^a-z0-9-]/g, '-');

  // Check if this looks like a login email
  if (!isLoginEmail(subject, fromEmail)) {
    console.log(`Skipping email: doesn't look like a login email - "${subject}"`);
    await moveToProcessed(email.id);
    return;
  }

  // Get HTML body
  let htmlContent = '';
  if (email.htmlBody && email.htmlBody.length > 0 && email.bodyValues) {
    const partId = email.htmlBody[0].partId;
    htmlContent = email.bodyValues[partId]?.value || '';
  } else if (email.textBody && email.textBody.length > 0 && email.bodyValues) {
    const partId = email.textBody[0].partId;
    htmlContent = email.bodyValues[partId]?.value || '';
  }

  if (!htmlContent) {
    console.log(`Skipping email: no body content`);
    await moveToProcessed(email.id);
    return;
  }

  // Extract magic link
  const magicLink = extractMagicLink(htmlContent);
  if (!magicLink) {
    console.log(`Skipping email: no magic link found - "${subject}"`);
    await moveToProcessed(email.id);
    return;
  }

  // Get or create service
  let service = await db.query.services.findFirst({
    where: eq(schema.services.slug, slug),
  });

  if (!service) {
    const serviceId = nanoid();
    await db.insert(schema.services).values({
      id: serviceId,
      slug,
      displayName: toLocalPart,
    });
    service = await db.query.services.findFirst({
      where: eq(schema.services.id, serviceId),
    });
  }

  if (!service) {
    console.error(`Failed to create service for slug: ${slug}`);
    return;
  }

  // Store magic link
  await db.insert(schema.magicLinks).values({
    id: nanoid(),
    serviceId: service.id,
    linkUrl: magicLink,
    subject,
    receivedAt: email.receivedAt,
  });

  console.log(`Processed magic link for ${slug}: ${subject}`);

  // Move email to processed folder
  await moveToProcessed(email.id);
}

async function checkEmails(): Promise<void> {
  try {
    const emails = await fetchNewEmails();
    for (const email of emails) {
      await processEmail(email);
    }
  } catch (error) {
    console.error('Error checking emails:', error);
    session = null;
  }
}

// EventSource-based push listener
async function connectEventSource(): Promise<void> {
  const sess = await getSession();

  // Build EventSource URL from the session template
  // Template looks like: https://api.fastmail.com/jmap/event/?types={types}&closeafter={closeafter}&ping={ping}
  const url = sess.eventSourceUrl
    .replace('{types}', 'Email')
    .replace('{closeafter}', 'no')
    .replace('{ping}', '30');

  console.log('Connecting to JMAP EventSource...');

  const abort = new AbortController();
  eventSourceAbort = abort;

  try {
    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${config.fastmail.appPassword}`,
        Accept: 'text/event-stream',
      },
      signal: abort.signal,
    });

    if (!response.ok) {
      throw new Error(`EventSource connection failed: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('EventSource response has no body');
    }

    console.log('JMAP EventSource connected');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });

      // Process complete SSE events (separated by double newlines)
      const events = buffer.split('\n\n');
      buffer = events.pop() || '';

      for (const event of events) {
        if (!event.trim()) continue;

        // Extract the data field from the SSE event
        const dataLine = event.split('\n').find(l => l.startsWith('data:'));
        if (!dataLine) continue;

        const data = dataLine.slice(5).trim();
        if (!data) continue;

        try {
          const parsed = JSON.parse(data);
          const changed = parsed.changed;
          if (!changed) continue;

          // Check if Email state changed for our account
          const accountChanges = changed[sess.accountId];
          if (accountChanges && ('Email' in accountChanges || 'EmailDelivery' in accountChanges)) {
            console.log('New email detected via EventSource');
            await checkEmails();
          }
        } catch {
          // Not JSON or malformed — ignore (could be a ping)
        }
      }
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.name === 'AbortError') return;
    throw error;
  }
}

async function startEventSourceWithReconnect(): Promise<void> {
  while (eventSourceAbort && !eventSourceAbort.signal.aborted) {
    try {
      await connectEventSource();
    } catch (error) {
      console.error('EventSource disconnected:', error);
      session = null;
    }

    // Don't reconnect if we were stopped
    if (!eventSourceAbort || eventSourceAbort.signal.aborted) break;

    console.log('Reconnecting EventSource in 5s...');
    await new Promise(resolve => setTimeout(resolve, 5000));
  }
}

export function startEmailPoller(): void {
  // Initial check for any unprocessed emails
  checkEmails();

  // Try EventSource for real-time push, fall back to polling
  eventSourceAbort = new AbortController();

  getSession()
    .then(() => {
      console.log('Starting JMAP EventSource for real-time email notifications');
      startEventSourceWithReconnect();
    })
    .catch((error) => {
      console.error('Failed to start EventSource, falling back to polling:', error);
      console.log(`Starting email poller (interval: ${config.pollIntervalMs}ms)`);
      fallbackInterval = setInterval(checkEmails, config.pollIntervalMs);
    });
}

export function stopEmailPoller(): void {
  if (eventSourceAbort) {
    eventSourceAbort.abort();
    eventSourceAbort = null;
  }
  if (fallbackInterval) {
    clearInterval(fallbackInterval);
    fallbackInterval = null;
  }
}
