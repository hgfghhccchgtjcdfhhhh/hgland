import { pgTable, text, timestamp, uuid, varchar, date, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  phone: varchar('phone', { length: 20 }),
  passwordHash: text('password_hash').notNull(),
  fullName: varchar('full_name', { length: 255 }).notNull(),
  username: varchar('username', { length: 50 }).notNull().unique(),
  birthDate: date('birth_date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const projects = pgTable('projects', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  status: varchar('status', { length: 50 }).default('draft').notNull(),
  siteConfig: jsonb('site_config'),
  pages: jsonb('pages'),
  files: jsonb('files'),
  packages: jsonb('packages'),
  seoSettings: jsonb('seo_settings'),
  resources: jsonb('resources'),
  deploymentConfig: jsonb('deployment_config'),
  integrations: jsonb('integrations'),
  terminalHistory: jsonb('terminal_history'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const deployments = pgTable('deployments', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(),
  url: text('url'),
  subdomain: varchar('subdomain', { length: 100 }),
  customDomain: varchar('custom_domain', { length: 255 }),
  domainVerified: boolean('domain_verified').default(false),
  sslEnabled: boolean('ssl_enabled').default(false),
  buildLog: text('build_log'),
  deployedFiles: jsonb('deployed_files'),
  version: varchar('version', { length: 20 }).default('1'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow(),
});

export const chatMessages = pgTable('chat_messages', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const agentMemory = pgTable('agent_memory', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  memoryType: varchar('memory_type', { length: 50 }).notNull(),
  category: varchar('category', { length: 100 }),
  content: text('content').notNull(),
  metadata: jsonb('metadata'),
  importance: varchar('importance', { length: 20 }).default('medium'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastAccessedAt: timestamp('last_accessed_at').defaultNow(),
});

export const agentExecutions = pgTable('agent_executions', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id).notNull(),
  userGoal: text('user_goal').notNull(),
  plan: jsonb('plan'),
  executionSteps: jsonb('execution_steps'),
  evaluationResults: jsonb('evaluation_results'),
  finalOutcome: varchar('final_outcome', { length: 50 }),
  lessonsLearned: jsonb('lessons_learned'),
  totalIterations: varchar('total_iterations', { length: 10 }),
  startedAt: timestamp('started_at').defaultNow().notNull(),
  completedAt: timestamp('completed_at'),
});

export const agentLearnings = pgTable('agent_learnings', {
  id: uuid('id').defaultRandom().primaryKey(),
  projectId: uuid('project_id').references(() => projects.id),
  executionId: uuid('execution_id').references(() => agentExecutions.id),
  learningType: varchar('learning_type', { length: 50 }).notNull(),
  pattern: text('pattern').notNull(),
  insight: text('insight').notNull(),
  successRate: varchar('success_rate', { length: 20 }),
  applicableContexts: jsonb('applicable_contexts'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Deployment = typeof deployments.$inferSelect;
export type ChatMessage = typeof chatMessages.$inferSelect;
