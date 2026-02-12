import { FastifyInstance } from 'fastify';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
} from '@simplewebauthn/types';
import { nanoid } from 'nanoid';
import { db, schema } from '../db/index.js';
import { eq, and, gt } from 'drizzle-orm';
import { config } from '../config.js';
import { authMiddleware } from '../middleware/auth.js';

const CHALLENGE_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes
const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export async function authRoutes(app: FastifyInstance) {
  // Get registration options
  app.post<{
    Body: { email: string; inviteToken?: string };
  }>('/api/auth/register/options', async (request, reply) => {
    const { email, inviteToken } = request.body;

    if (!email) {
      return reply.status(400).send({ error: 'Email is required' });
    }

    // Check if user already exists
    const existingUser = await db.query.users.findFirst({
      where: eq(schema.users.email, email),
    });

    if (existingUser) {
      return reply.status(400).send({ error: 'User already exists' });
    }

    // Check authorization: either admin email or valid invite token
    const isAdminEmail = email.toLowerCase() === config.adminEmail.toLowerCase();

    if (!isAdminEmail) {
      if (!inviteToken) {
        return reply.status(403).send({ error: 'Invite required for registration' });
      }

      const invite = await db.query.invites.findFirst({
        where: and(
          eq(schema.invites.token, inviteToken),
          eq(schema.invites.usedAt, null as unknown as string)
        ),
      });

      if (!invite) {
        return reply.status(403).send({ error: 'Invalid or used invite' });
      }
    }

    const userId = nanoid();
    const options = await generateRegistrationOptions({
      rpName: config.rpName,
      rpID: config.rpId,
      userID: new TextEncoder().encode(userId),
      userName: email,
      userDisplayName: email.split('@')[0],
      attestationType: 'none',
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    // Store challenge
    const challengeId = nanoid();
    const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT_MS).toISOString();

    await db.insert(schema.challenges).values({
      id: challengeId,
      challenge: options.challenge,
      type: 'registration',
      userId: null,
      inviteToken: inviteToken || null,
      expiresAt,
    });

    return {
      options,
      challengeId,
      userId,
      email,
    };
  });

  // Verify registration
  app.post<{
    Body: {
      challengeId: string;
      userId: string;
      email: string;
      response: RegistrationResponseJSON;
      inviteToken?: string;
    };
  }>('/api/auth/register/verify', async (request, reply) => {
    const { challengeId, userId, email, response, inviteToken } = request.body;

    // Get and validate challenge
    const now = new Date().toISOString();
    const challengeRecord = await db.query.challenges.findFirst({
      where: and(
        eq(schema.challenges.id, challengeId),
        eq(schema.challenges.type, 'registration'),
        gt(schema.challenges.expiresAt, now)
      ),
    });

    if (!challengeRecord) {
      return reply.status(400).send({ error: 'Invalid or expired challenge' });
    }

    try {
      const verification = await verifyRegistrationResponse({
        response,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpId,
      });

      if (!verification.verified || !verification.registrationInfo) {
        return reply.status(400).send({ error: 'Verification failed' });
      }

      const { credential } = verification.registrationInfo;

      // Determine if this is the admin user
      const isAdmin = email.toLowerCase() === config.adminEmail.toLowerCase();

      // Create user
      await db.insert(schema.users).values({
        id: userId,
        email: email.toLowerCase(),
        displayName: email.split('@')[0],
        isAdmin,
      });

      // Store credential
      await db.insert(schema.credentials).values({
        id: nanoid(),
        userId,
        credentialId: Buffer.from(credential.id).toString('base64url'),
        publicKey: Buffer.from(credential.publicKey).toString('base64url'),
        counter: credential.counter,
        transports: JSON.stringify(response.response.transports || []),
      });

      // Mark invite as used (if applicable)
      if (inviteToken) {
        await db
          .update(schema.invites)
          .set({
            usedAt: new Date().toISOString(),
            usedBy: userId,
          })
          .where(eq(schema.invites.token, inviteToken));
      }

      // Delete challenge
      await db.delete(schema.challenges).where(eq(schema.challenges.id, challengeId));

      // Create session
      const sessionId = nanoid(32);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

      await db.insert(schema.sessions).values({
        id: sessionId,
        userId,
        expiresAt,
      });

      reply.setCookie('session', sessionId, {
        httpOnly: true,
        secure: config.origin.startsWith('https'),
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_DURATION_MS / 1000,
      });

      return { success: true, isAdmin };
    } catch (error) {
      console.error('Registration verification error:', error);
      return reply.status(400).send({ error: 'Verification failed' });
    }
  });

  // Get login options
  app.post<{
    Body: { email?: string };
  }>('/api/auth/login/options', async (request, reply) => {
    const { email } = request.body;

    let allowCredentials: { id: Uint8Array; transports?: AuthenticatorTransport[] }[] | undefined;
    let userId: string | undefined;

    if (email) {
      const user = await db.query.users.findFirst({
        where: eq(schema.users.email, email.toLowerCase()),
      });

      if (!user) {
        return reply.status(400).send({ error: 'User not found' });
      }

      userId = user.id;

      const userCredentials = await db.query.credentials.findMany({
        where: eq(schema.credentials.userId, user.id),
      });

      if (userCredentials.length === 0) {
        return reply.status(400).send({ error: 'No passkeys registered' });
      }

      allowCredentials = userCredentials.map((cred) => ({
        id: Buffer.from(cred.credentialId, 'base64url'),
        transports: cred.transports ? JSON.parse(cred.transports) : undefined,
      }));
    }

    const options = await generateAuthenticationOptions({
      rpID: config.rpId,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Store challenge
    const challengeId = nanoid();
    const expiresAt = new Date(Date.now() + CHALLENGE_TIMEOUT_MS).toISOString();

    await db.insert(schema.challenges).values({
      id: challengeId,
      challenge: options.challenge,
      type: 'authentication',
      userId: userId || null,
      expiresAt,
    });

    return {
      options,
      challengeId,
    };
  });

  // Verify login
  app.post<{
    Body: {
      challengeId: string;
      response: AuthenticationResponseJSON;
    };
  }>('/api/auth/login/verify', async (request, reply) => {
    const { challengeId, response } = request.body;

    // Get and validate challenge
    const now = new Date().toISOString();
    const challengeRecord = await db.query.challenges.findFirst({
      where: and(
        eq(schema.challenges.id, challengeId),
        eq(schema.challenges.type, 'authentication'),
        gt(schema.challenges.expiresAt, now)
      ),
    });

    if (!challengeRecord) {
      return reply.status(400).send({ error: 'Invalid or expired challenge' });
    }

    // Find credential
    const credentialId = response.id;
    const credential = await db.query.credentials.findFirst({
      where: eq(schema.credentials.credentialId, credentialId),
    });

    if (!credential) {
      return reply.status(400).send({ error: 'Credential not found' });
    }

    // Get user
    const user = await db.query.users.findFirst({
      where: eq(schema.users.id, credential.userId),
    });

    if (!user) {
      return reply.status(400).send({ error: 'User not found' });
    }

    try {
      const verification = await verifyAuthenticationResponse({
        response,
        expectedChallenge: challengeRecord.challenge,
        expectedOrigin: config.origin,
        expectedRPID: config.rpId,
        credential: {
          id: Buffer.from(credential.credentialId, 'base64url'),
          publicKey: Buffer.from(credential.publicKey, 'base64url'),
          counter: credential.counter ?? 0,
          transports: credential.transports ? JSON.parse(credential.transports) : undefined,
        },
      });

      if (!verification.verified) {
        return reply.status(400).send({ error: 'Verification failed' });
      }

      // Update counter
      await db
        .update(schema.credentials)
        .set({ counter: verification.authenticationInfo.newCounter })
        .where(eq(schema.credentials.id, credential.id));

      // Delete challenge
      await db.delete(schema.challenges).where(eq(schema.challenges.id, challengeId));

      // Create session
      const sessionId = nanoid(32);
      const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();

      await db.insert(schema.sessions).values({
        id: sessionId,
        userId: user.id,
        expiresAt,
      });

      reply.setCookie('session', sessionId, {
        httpOnly: true,
        secure: config.origin.startsWith('https'),
        sameSite: 'strict',
        path: '/',
        maxAge: SESSION_DURATION_MS / 1000,
      });

      return {
        success: true,
        user: {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          isAdmin: user.isAdmin,
        },
      };
    } catch (error) {
      console.error('Authentication verification error:', error);
      return reply.status(400).send({ error: 'Verification failed' });
    }
  });

  // Logout
  app.post('/api/auth/logout', { preHandler: authMiddleware }, async (request, reply) => {
    const sessionId = request.cookies.session;

    if (sessionId) {
      await db.delete(schema.sessions).where(eq(schema.sessions.id, sessionId));
    }

    reply.clearCookie('session', { path: '/' });
    return { success: true };
  });

  // Get current user
  app.get('/api/auth/me', { preHandler: authMiddleware }, async (request) => {
    return { user: request.user };
  });
}
