import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  displayName: text('display_name'),
  isAdmin: integer('is_admin', { mode: 'boolean' }).default(false),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const credentials = sqliteTable('credentials', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').unique().notNull(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').default(0),
  transports: text('transports'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const services = sqliteTable('services', {
  id: text('id').primaryKey(),
  slug: text('slug').unique().notNull(),
  displayName: text('display_name'),
  iconUrl: text('icon_url'),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
});

export const magicLinks = sqliteTable('magic_links', {
  id: text('id').primaryKey(),
  serviceId: text('service_id').notNull().references(() => services.id, { onDelete: 'cascade' }),
  linkUrl: text('link_url').notNull(),
  subject: text('subject'),
  receivedAt: text('received_at').default('CURRENT_TIMESTAMP'),
  usedAt: text('used_at'),
  usedBy: text('used_by').references(() => users.id),
});

export const invites = sqliteTable('invites', {
  id: text('id').primaryKey(),
  token: text('token').unique().notNull(),
  createdBy: text('created_by').notNull().references(() => users.id),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  usedAt: text('used_at'),
  usedBy: text('used_by').references(() => users.id),
});

export const sessions = sqliteTable('sessions', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: text('created_at').default('CURRENT_TIMESTAMP'),
  expiresAt: text('expires_at').notNull(),
});

export const challenges = sqliteTable('challenges', {
  id: text('id').primaryKey(),
  challenge: text('challenge').notNull(),
  type: text('type').notNull(),
  userId: text('user_id'),
  inviteToken: text('invite_token'),
  expiresAt: text('expires_at').notNull(),
});
