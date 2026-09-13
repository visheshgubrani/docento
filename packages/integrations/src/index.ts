/**
 * @docento/integrations
 *
 * Boundaries to things outside the application.
 *
 * Each starts as a module here and is promoted to its own package only once it
 * has a meaningful independent interface. See ARCHITECTURE.md.
 *
 * ## What is here, and what is deliberately not
 *
 * `jobs` (pg-boss on the same Postgres), `storage` (local disk and anything
 * S3-compatible) and `email` (console, Resend, SMTP). All three default to
 * something that needs no external account, which is what makes a complete
 * install one `docker compose up`.
 *
 * AI and payments are not here yet. They arrive with their milestones, and the
 * placeholder modules that used to sit in the API for them are gone: an unused
 * provider adapter is a claim about a capability the product does not have.
 */

// Jobs
export { JOB_DEFINITIONS, JobQueue, createJobQueue } from './jobs/index.js'
export type {
  EnqueueOptions,
  JobHandler,
  JobName,
  JobPayload,
  JobQueueOptions,
} from './jobs/index.js'

// Storage
export {
  StorageError,
  buildStorageKey,
  createLocalStorage,
  createS3Storage,
  createStorage,
  localPathFor,
  sanitiseFilename,
} from './storage/index.js'
export type {
  GetOptions,
  LocalStorageOptions,
  PutOptions,
  S3StorageOptions,
  StorageAdapter,
  StorageConfig,
  StorageProvider,
  StoredObject,
  UploadTarget,
} from './storage/index.js'

// Email
export {
  EmailError,
  RENDERED_TEMPLATES,
  createConsoleEmail,
  createEmailProvider,
  createResendEmail,
  createSmtpEmail,
  escapeHtml,
  formatSender,
  renderTemplate,
} from './email/index.js'
export type {
  EmailConfig,
  EmailMessage,
  EmailProvider,
  RenderedEmail,
  ResendOptions,
  SmtpOptions,
  TemplateName,
  TemplatePayload,
} from './email/index.js'

// Assembly from the environment. Here rather than in each process, so the API
// and the worker cannot disagree about how a provider is configured.
export { createEmailFromEnv, createStorageFromEnv } from './from-env.js'
