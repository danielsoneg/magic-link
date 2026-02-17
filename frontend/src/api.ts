import type {
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
} from '@simplewebauthn/types';

const API_BASE = '/api';

interface User {
  id: string;
  email: string;
  displayName: string | null;
  isAdmin: boolean;
}

interface Service {
  id: string;
  slug: string;
  displayName: string | null;
  iconUrl: string | null;
  serviceUrl: string | null;
  createdAt: string;
  latestLink?: string | null;
  linkCount?: number;
}

interface MagicLink {
  id: string;
  serviceId: string;
  linkUrl: string;
  subject: string | null;
  receivedAt: string;
  usedAt: string | null;
  usedBy: string | null;
  service?: Service | null;
}

interface Invite {
  id: string;
  token: string;
  createdBy: string;
  createdAt: string;
  usedAt: string | null;
  usedBy: string | null;
  createdByUser?: { email: string; displayName: string | null };
  usedByUser?: { email: string; displayName: string | null } | null;
}

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    ...options?.headers as Record<string, string>,
  };
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }
  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
    credentials: 'include',
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

// Auth
export async function getMe(): Promise<{ user: User }> {
  return request('/auth/me');
}

export async function logout(): Promise<void> {
  await request('/auth/logout', { method: 'POST' });
}

export async function getRegisterOptions(email: string, inviteToken?: string) {
  return request<{
    options: PublicKeyCredentialCreationOptionsJSON;
    challengeId: string;
    userId: string;
    email: string;
  }>('/auth/register/options', {
    method: 'POST',
    body: JSON.stringify({ email, inviteToken }),
  });
}

export async function verifyRegistration(data: {
  challengeId: string;
  userId: string;
  email: string;
  response: unknown;
  inviteToken?: string;
}) {
  return request<{ success: boolean; isAdmin: boolean }>('/auth/register/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function getLoginOptions(email?: string) {
  return request<{
    options: PublicKeyCredentialRequestOptionsJSON;
    challengeId: string;
  }>('/auth/login/options', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function verifyLogin(data: { challengeId: string; response: unknown }) {
  return request<{ success: boolean; user: User }>('/auth/login/verify', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

// Services
export async function getServices(): Promise<{ services: Service[] }> {
  return request('/services');
}

export async function getService(slug: string): Promise<{ service: Service; links: MagicLink[] }> {
  return request(`/services/${slug}`);
}

export async function updateService(
  slug: string,
  data: { displayName?: string; iconUrl?: string; serviceUrl?: string }
): Promise<{ service: Service }> {
  return request(`/services/${slug}`, {
    method: 'PATCH',
    body: JSON.stringify(data),
  });
}

export async function deleteService(slug: string): Promise<void> {
  await request(`/services/${slug}`, { method: 'DELETE' });
}

// Links
export async function getLinks(): Promise<{ links: MagicLink[] }> {
  return request('/links');
}

export async function markLinkUsed(id: string): Promise<void> {
  await request(`/links/${id}/use`, { method: 'POST' });
}

// Users
export async function getUsers(): Promise<{
  users: (User & { credentialCount: number; createdAt: string })[];
}> {
  return request('/users');
}

export async function deleteUser(id: string): Promise<void> {
  await request(`/users/${id}`, { method: 'DELETE' });
}

export async function resetUserPasskeys(id: string): Promise<void> {
  await request(`/users/${id}/reset`, { method: 'POST' });
}

// Invites
export async function getInvites(): Promise<{ invites: Invite[] }> {
  return request('/invites');
}

export async function createInvite(): Promise<{ invite: Invite }> {
  return request('/invites', { method: 'POST' });
}

export async function deleteInvite(id: string): Promise<void> {
  await request(`/invites/${id}`, { method: 'DELETE' });
}

export async function getInviteInfo(
  token: string
): Promise<{ valid: boolean; used: boolean; alreadyLoggedIn: boolean }> {
  return request(`/invites/${token}`);
}
