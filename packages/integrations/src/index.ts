/**
 * @docento/integrations
 *
 * Boundaries to things outside the application: job execution today, and AI,
 * media, storage, payments, and email as they are extracted from the API.
 *
 * Each starts as a module here and is promoted to its own package only once it
 * has a meaningful independent interface. See ARCHITECTURE.md.
 */

export { JOB_DEFINITIONS, JobQueue, createJobQueue } from './jobs/index.js'
export type {
  EnqueueOptions,
  JobHandler,
  JobName,
  JobPayload,
  JobQueueOptions,
} from './jobs/index.js'
