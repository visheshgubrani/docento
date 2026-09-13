import { authClient } from '@/lib/auth'

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:4000/api/v1'

export class ApiError extends Error {
  status: number
  details?: unknown

  constructor(message: string, status: number, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.details = details
  }
}

type FetchOptions = RequestInit & {
  skipJson?: boolean
}

const getPostHogHeaders = async (): Promise<Record<string, string>> => {
  if (typeof window === 'undefined') {
    return {}
  }

  const { getPostHogRequestHeaders } = await import('./posthog')
  return getPostHogRequestHeaders()
}

async function apiFetch<T = unknown>(
  path: string,
  { skipJson, ...options }: FetchOptions = {}
): Promise<T> {
  const headers = new Headers(options.headers)
  const posthogHeaders = await getPostHogHeaders()

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  Object.entries(posthogHeaders).forEach(([key, value]) => {
    if (!headers.has(key)) {
      headers.set(key, value)
    }
  })

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers,
    credentials: 'include',
    ...options,
  })

  if (skipJson) {
    if (!response.ok) {
      throw new ApiError(response.statusText, response.status)
    }
    return undefined as T
  }

  const payload = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      (payload && (payload.message || payload.error || payload.status)) ||
      response.statusText ||
      'Request failed'
    throw new ApiError(message, response.status, payload)
  }

  return ((payload && (payload.data ?? payload)) as T) ?? ({} as T)
}

export type Project = {
  id: string
  name: string
  slug: string
  ownerId: string
  authMode: 'MANAGED' | 'DELEGATED'
  createdAt: string
  updatedAt: string
  description?: string | null
  branding?: Record<string, unknown> | null
  customDomain?: string | null
  allowedOrigins?: string[]
  webhookUrl?: string | null
}

export type RevenueStat = {
  currency: string
  amount: number
}

export type ProjectAnalyticsOverview = {
  totalRevenue: number
  revenueByCurrency: RevenueStat[]
  totalStudents: number
  activeCourses: number
  totalEnrollments: number
  averageProgress: number
}

export type ProjectEngagementMetrics = {
  windowStart: string
  activeStudents7d: number
  lessonsCompleted7d: number
  newEnrollments7d: number
  revenue7d: number
  revenueByCurrency7d: RevenueStat[]
  averageProgress: number
}

export type ProjectTransaction = {
  id: string
  amount: number
  currency: string
  status: string
  provider: string
  providerTxId?: string | null
  createdAt: string
  receiptUrl?: string | null
  course?: {
    id: string
    title: string
  } | null
  student?: {
    id: string
    name?: string | null
    email?: string | null
    externalId?: string | null
  } | null
}

export type ProjectStudentAnalytics = {
  id: string
  email?: string | null
  externalId?: string | null
  status: EndUserStatus
  createdAt: string
  averageProgress: number
  totalEnrollments: number
  lastActiveAt?: string | null
  enrollments: {
    courseId: string
    courseTitle: string
    progress?: number | null
    completedAt?: string | null
  }[]
}

export type CourseAnalyticsCourse = {
  id: string
  title: string
  price?: number | null
  isPublished: boolean
  createdAt: string
}

export type CourseAnalyticsMetrics = {
  totalEnrollments: number
  averageProgress: number
  completionRate: number
  revenue: number
}

export type CourseAnalyticsInsights = {
  course: CourseAnalyticsCourse
  metrics: CourseAnalyticsMetrics
}

export type ProjectWebhookEvent =
  | 'enrollment.created'
  | 'lesson.completed'
  | 'quiz.attempt_completed'
  | 'course.completed'

export type ProjectWebhook = {
  url?: string | null
  secret?: string | null
  events: ProjectWebhookEvent[]
}

export type ProjectPaymentSettings = {
  keyId?: string | null
  isConfigured: boolean
}

export type SaveProjectPaymentSettingsInput = {
  keyId: string
  keySecret: string
}

export type ProjectCouponDiscountType = 'PERCENTAGE' | 'FLAT'
export type ProjectCouponStatus = 'ACTIVE' | 'PAUSED'

export type ProjectCoupon = {
  id: string
  projectId: string
  code: string
  discountType: ProjectCouponDiscountType
  discountValue: number
  appliesToAll: boolean
  usageLimit: number | null
  usageCount: number
  expiresAt: string | null
  status: ProjectCouponStatus
  createdAt: string
  updatedAt: string
  courseIds: string[]
  courses: Array<{
    id: string
    title: string
  }>
}

export type CreateProjectCouponInput = {
  code: string
  discountType: ProjectCouponDiscountType
  discountValue: number
  appliesToAll: boolean
  courseIds?: string[]
  usageLimit?: number | null
  expiresAt?: string | null
}

export type CollaboratorRole = 'OWNER' | 'EDITOR'

export type ProjectCollaboratorUser = {
  id: string
  name?: string | null
  email: string
  image?: string | null
}

export type ProjectMember = {
  id: string
  projectId: string
  userId: string
  role: CollaboratorRole
  joinedAt: string
  user: ProjectCollaboratorUser
}

export type ProjectInvitation = {
  id: string
  email: string
  role: CollaboratorRole
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'REVOKED' | 'EXPIRED'
  expiresAt: string
  createdAt: string
}

export type ProjectOwner = ProjectCollaboratorUser & {
  role: 'OWNER'
}

export type ProjectCollaborators = {
  owner: ProjectOwner | null
  members: ProjectMember[]
  invitations: ProjectInvitation[]
}

export type InviteCollaboratorInput = {
  email: string
}

export type InviteCollaboratorResult = {
  type: 'invitation'
  invitation?: ProjectInvitation
}

export type CreateProjectInput = {
  name: string
  description?: string
  authMode?: 'MANAGED' | 'DELEGATED'
}

export async function fetchProjects(): Promise<Project[]> {
  const data = await apiFetch<{ projects?: Project[] }>('/projects')
  return data.projects ?? []
}

export async function fetchProject(projectId: string): Promise<Project> {
  const payload = await apiFetch<{ project: Project }>(`/projects/${projectId}`)
  return payload.project
}

export async function createProject(
  input: CreateProjectInput
): Promise<Project> {
  const payload = await apiFetch<{ project: Project }>('/projects', {
    method: 'POST',
    body: JSON.stringify(input),
  })

  return payload.project
}

export async function deleteProject(projectId: string): Promise<void> {
  await apiFetch(`/projects/${projectId}`, { method: 'DELETE', skipJson: true })
}

export type UpdateProjectInput = {
  name?: string
}

export async function updateProject(
  projectId: string,
  input: UpdateProjectInput
): Promise<Project> {
  const payload = await apiFetch<{ project: Project }>(`/projects/${projectId}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })

  return payload.project
}

const mapRevenueStats = (
  entries: { currency?: string; amount?: number; _sum?: { amount?: number | null } }[] = []
): RevenueStat[] =>
  entries.map((entry) => ({
    currency: entry.currency ?? 'USD',
    amount: entry.amount ?? entry._sum?.amount ?? 0,
  }))

type AnalyticsOverviewPayload = {
  totalRevenue?: number
  revenueByCurrency?: { currency?: string; amount?: number; _sum?: { amount?: number | null } }[]
  totalStudents?: number
  activeCourses?: number
  totalEnrollments?: number
  averageProgress?: number
}

type AnalyticsEngagementPayload = {
  activeStudents7d?: number
  lessonsCompleted7d?: number
  newEnrollments7d?: number
  revenue7d?: number
  revenueByCurrency7d?: { currency?: string; amount?: number; _sum?: { amount?: number | null } }[]
  averageProgress?: number
}

export async function fetchProjectAnalyticsOverview(
  projectId: string
): Promise<ProjectAnalyticsOverview> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch analytics', 400)
  }

  const payload = await apiFetch<
    AnalyticsOverviewPayload | { overview?: AnalyticsOverviewPayload }
  >(`/projects/${projectId}/analytics/overview`)
  const overviewPayload = payload as AnalyticsOverviewPayload & {
    overview?: AnalyticsOverviewPayload
  }
  const overview: AnalyticsOverviewPayload =
    overviewPayload.overview ?? overviewPayload

  return {
    totalRevenue: overview.totalRevenue ?? 0,
    revenueByCurrency: mapRevenueStats(overview.revenueByCurrency),
    totalStudents: overview.totalStudents ?? 0,
    activeCourses: overview.activeCourses ?? 0,
    totalEnrollments: overview.totalEnrollments ?? 0,
    averageProgress: overview.averageProgress ?? 0,
  }
}

export async function fetchProjectAnalyticsEngagement(
  projectId: string
): Promise<ProjectEngagementMetrics> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch engagement analytics', 400)
  }

  const payload = await apiFetch<
    AnalyticsEngagementPayload | {
      windowStart?: string
      metrics?: AnalyticsEngagementPayload
    }
  >(`/projects/${projectId}/analytics/engagement`)

  const engagementPayload = payload as AnalyticsEngagementPayload & {
    windowStart?: string
    metrics?: AnalyticsEngagementPayload
  }
  const metrics: AnalyticsEngagementPayload =
    engagementPayload.metrics ?? engagementPayload
  const windowStart = engagementPayload.windowStart

  return {
    windowStart: windowStart ?? new Date().toISOString(),
    activeStudents7d: metrics.activeStudents7d ?? 0,
    lessonsCompleted7d: metrics.lessonsCompleted7d ?? 0,
    newEnrollments7d: metrics.newEnrollments7d ?? 0,
    revenue7d: metrics.revenue7d ?? 0,
    revenueByCurrency7d: mapRevenueStats(metrics.revenueByCurrency7d),
    averageProgress: metrics.averageProgress ?? 0,
  }
}

export async function fetchProjectAnalyticsRecentSales(
  projectId: string
): Promise<ProjectTransaction[]> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch recent sales', 400)
  }

  const payload = await apiFetch<{ transactions?: ProjectTransaction[] }>(
    `/projects/${projectId}/analytics/recent-sales`
  )

  return payload.transactions ?? []
}

export async function fetchProjectAnalyticsStudents(
  projectId: string
): Promise<ProjectStudentAnalytics[]> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch student analytics', 400)
  }

  const payload = await apiFetch<{ students?: ProjectStudentAnalytics[] }>(
    `/projects/${projectId}/analytics/students`
  )

  return payload.students ?? []
}

export async function fetchProjectAnalyticsCourseInsights(
  projectId: string,
  courseId: string
): Promise<CourseAnalyticsInsights> {
  if (!projectId || !courseId) {
    throw new ApiError(
      'Project ID and Course ID are required to fetch course analytics',
      400
    )
  }

  const payload = await apiFetch<{
    course?: CourseAnalyticsCourse
    metrics?: CourseAnalyticsMetrics
  }>(`/projects/${projectId}/analytics/courses/${courseId}`)

  return {
    course: payload.course ?? {
      id: courseId,
      title: '',
      price: null,
      isPublished: false,
      createdAt: new Date().toISOString(),
    },
    metrics: {
      totalEnrollments: payload.metrics?.totalEnrollments ?? 0,
      averageProgress: payload.metrics?.averageProgress ?? 0,
      completionRate: payload.metrics?.completionRate ?? 0,
      revenue: payload.metrics?.revenue ?? 0,
    },
  }
}

export async function fetchAllowedOrigins(
  projectId: string
): Promise<string[]> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch allowed origins', 400)
  }

  const payload = await apiFetch<{ origins?: string[] }>(
    `/projects/${projectId}/allowed-origins`
  )

  return payload.origins ?? []
}

export async function addAllowedOrigin(
  projectId: string,
  origin: string
): Promise<string[]> {
  if (!projectId) {
    throw new ApiError('Project ID is required to add an origin', 400)
  }

  const trimmed = origin.trim()
  if (!trimmed) {
    throw new ApiError('Origin is required', 400)
  }

  if (!/^https?:\/\//i.test(trimmed)) {
    throw new ApiError('Origin must start with http:// or https://', 400)
  }

  const payload = await apiFetch<{ origins?: string[] }>(
    `/projects/${projectId}/allowed-origins`,
    {
      method: 'POST',
      body: JSON.stringify({ origin: trimmed }),
    }
  )

  return payload.origins ?? []
}

export async function deleteAllowedOrigin(
  projectId: string,
  origin: string
): Promise<string[]> {
  if (!projectId) {
    throw new ApiError('Project ID is required to delete an origin', 400)
  }

  const trimmed = origin.trim()
  if (!trimmed) {
    throw new ApiError('Origin is required', 400)
  }

  const payload = await apiFetch<{ origins?: string[] }>(
    `/projects/${projectId}/allowed-origins`,
    {
      method: 'DELETE',
      body: JSON.stringify({ origin: trimmed }),
    }
  )

  return payload.origins ?? []
}

export async function fetchProjectPaymentSettings(
  projectId: string
): Promise<ProjectPaymentSettings> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch payment settings', 400)
  }

  const payload = await apiFetch<ProjectPaymentSettings>(
    `/projects/${projectId}/payments`
  )

  return {
    keyId: payload.keyId ?? null,
    isConfigured: Boolean(payload.isConfigured),
  }
}

export async function saveProjectPaymentSettings(
  projectId: string,
  input: SaveProjectPaymentSettingsInput
): Promise<void> {
  if (!projectId) {
    throw new ApiError('Project ID is required to save payment settings', 400)
  }

  const keyId = input?.keyId?.trim()
  const keySecret = input?.keySecret?.trim()

  if (!keyId || !keySecret) {
    throw new ApiError('Razorpay key ID and key secret are required', 400)
  }

  await apiFetch(`/projects/${projectId}/payments`, {
    method: 'POST',
    body: JSON.stringify({ keyId, keySecret }),
  })
}

export async function fetchProjectCoupons(
  projectId: string
): Promise<ProjectCoupon[]> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch coupons', 400)
  }

  const payload = await apiFetch<{ coupons?: ProjectCoupon[] }>(
    `/projects/${projectId}/coupons`
  )

  return payload.coupons ?? []
}

export async function createProjectCoupon(
  projectId: string,
  input: CreateProjectCouponInput
): Promise<ProjectCoupon> {
  if (!projectId) {
    throw new ApiError('Project ID is required to create a coupon', 400)
  }

  const code = input?.code?.trim().toUpperCase()
  if (!code) {
    throw new ApiError('Coupon code is required', 400)
  }

  if (!input.discountType) {
    throw new ApiError('Discount type is required', 400)
  }

  if (!Number.isFinite(input.discountValue) || input.discountValue <= 0) {
    throw new ApiError('Discount value must be greater than 0', 400)
  }

  const payload = await apiFetch<{ coupon: ProjectCoupon }>(
    `/projects/${projectId}/coupons`,
    {
      method: 'POST',
      body: JSON.stringify({
        code,
        discountType: input.discountType,
        discountValue: input.discountValue,
        appliesToAll: input.appliesToAll,
        courseIds: input.courseIds ?? [],
        usageLimit: input.usageLimit ?? null,
        expiresAt: input.expiresAt ?? null,
      }),
    }
  )

  return payload.coupon
}

export async function updateProjectCouponStatus(
  projectId: string,
  couponId: string,
  status: ProjectCouponStatus
): Promise<ProjectCoupon> {
  if (!projectId || !couponId) {
    throw new ApiError(
      'Project ID and coupon ID are required to update coupon status',
      400
    )
  }

  const payload = await apiFetch<{ coupon: ProjectCoupon }>(
    `/projects/${projectId}/coupons/${couponId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )

  return payload.coupon
}

export async function fetchProjectCollaborators(
  projectId: string
): Promise<ProjectCollaborators> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch collaborators', 400)
  }

  const payload = await apiFetch<{
    owner?: ProjectOwner | null
    members?: ProjectMember[]
    invitations?: ProjectInvitation[]
  }>(`/projects/${projectId}/members`)

  return {
    owner: payload.owner ?? null,
    members: payload.members ?? [],
    invitations: payload.invitations ?? [],
  }
}

export async function inviteProjectCollaborator(
  projectId: string,
  input: InviteCollaboratorInput
): Promise<InviteCollaboratorResult> {
  if (!projectId) {
    throw new ApiError('Project ID is required to invite collaborators', 400)
  }

  const email = input?.email?.trim()
  if (!email) {
    throw new ApiError('Collaborator email is required', 400)
  }

  return apiFetch<InviteCollaboratorResult>(`/projects/${projectId}/invite`, {
    method: 'POST',
    body: JSON.stringify({
      email,
      role: 'EDITOR',
    }),
  })
}

export async function removeProjectCollaborator(
  projectId: string,
  memberId: string
): Promise<void> {
  if (!projectId || !memberId) {
    throw new ApiError(
      'Project ID and member ID are required to remove a collaborator',
      400
    )
  }

  await apiFetch(`/projects/${projectId}/members/${memberId}`, {
    method: 'DELETE',
  })
}

export async function revokeProjectInvitation(
  projectId: string,
  invitationId: string
): Promise<void> {
  if (!projectId || !invitationId) {
    throw new ApiError(
      'Project ID and invitation ID are required to revoke an invitation',
      400
    )
  }

  await apiFetch(`/projects/${projectId}/invitations/${invitationId}`, {
    method: 'DELETE',
  })
}

export type InvitationAction = 'accept' | 'reject'

export type InvitationActionResult = {
  project?: {
    id: string
    name: string
  }
  member?: ProjectMember
  role?: CollaboratorRole
  projectId?: string
}

export async function respondToProjectInvitation(
  token: string,
  action: InvitationAction
): Promise<InvitationActionResult> {
  const trimmedToken = token?.trim()
  if (!trimmedToken) {
    throw new ApiError('Invitation token is required', 400)
  }

  const path =
    action === 'reject'
      ? '/projects/invitations/reject'
      : '/projects/invitations/accept'

  return apiFetch<InvitationActionResult>(path, {
    method: 'POST',
    body: JSON.stringify({ token: trimmedToken }),
  })
}

export type SaveProjectWebhookInput = {
  url: string
  secret?: string
}

export async function fetchProjectWebhook(
  projectId: string
): Promise<ProjectWebhook> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch webhook config', 400)
  }

  const payload = await apiFetch<ProjectWebhook>(
    `/projects/${projectId}/webhooks`
  )

  return {
    url: payload.url ?? null,
    secret: payload.secret ?? null,
    events: payload.events ?? [],
  }
}

export async function saveProjectWebhook(
  projectId: string,
  input: SaveProjectWebhookInput
): Promise<ProjectWebhook> {
  if (!projectId) {
    throw new ApiError('Project ID is required to save a webhook', 400)
  }

  if (!input?.url?.trim()) {
    throw new ApiError('Webhook URL is required', 400)
  }

  const payload = await apiFetch<{ webhook?: ProjectWebhook }>(
    `/projects/${projectId}/webhooks`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )

  return {
    url: payload.webhook?.url ?? null,
    secret: payload.webhook?.secret ?? null,
    events: payload.webhook?.events ?? [],
  }
}

export async function sendTestProjectWebhook(
  projectId: string,
  event: ProjectWebhookEvent = 'enrollment.created'
): Promise<void> {
  if (!projectId) {
    throw new ApiError('Project ID is required to test a webhook', 400)
  }

  await apiFetch(`/projects/${projectId}/webhooks/test`, {
    method: 'POST',
    body: JSON.stringify({ event }),
    skipJson: true,
  })
}

export async function refreshSession() {
  await authClient.getSession()
}

export type BillingPlanId = 'PRO_PLAN_MONTHLY' | 'ENTERPRISE_YEARLY'
export type BillingSubscription = {
  plan: BillingPlanId | 'FREE'
  status: string
  currentPeriodStart: string | null
  currentPeriodEnd: string | null
}

type CreateBillingOrderResponse = {
  success?: boolean
  order_id: string
  amount: number
  key_id: string
}

export async function createBillingOrder(
  planId: BillingPlanId
): Promise<{ orderId: string; amount: number; keyId: string }> {
  if (!planId) {
    throw new ApiError('Plan ID is required to create an order', 400)
  }

  const payload = await apiFetch<CreateBillingOrderResponse>(
    `/billing/create-order`,
    {
      method: 'POST',
      body: JSON.stringify({ planId }),
    }
  )

  return {
    orderId: payload.order_id,
    amount: payload.amount,
    keyId: payload.key_id,
  }
}

export type VerifyBillingPaymentInput = {
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
  planId: BillingPlanId
}

export async function verifyBillingPayment(
  input: VerifyBillingPaymentInput
): Promise<{ success?: boolean; message?: string }> {
  if (
    !input?.razorpay_order_id ||
    !input?.razorpay_payment_id ||
    !input?.razorpay_signature
  ) {
    throw new ApiError('Payment verification details are required', 400)
  }

  return apiFetch<{ success?: boolean; message?: string }>(
    `/billing/verify-payment`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export async function fetchBillingSubscription(): Promise<BillingSubscription> {
  const payload = await apiFetch<{ subscription?: BillingSubscription }>(
    `/billing/subscription`
  )

  const subscription = payload.subscription

  return {
    plan: subscription?.plan ?? 'FREE',
    status: subscription?.status ?? 'INACTIVE',
    currentPeriodStart: subscription?.currentPeriodStart ?? null,
    currentPeriodEnd: subscription?.currentPeriodEnd ?? null,
  }
}

export type EndUserStatus = 'ACTIVE' | 'BANNED'

export type EndUser = {
  id: string
  projectId: string
  email?: string | null
  externalId?: string | null
  status: EndUserStatus
  createdAt: string
  managedUser?: {
    id: string
    name?: string | null
  } | null
  delegatedUser?: {
    id: string
    metadata?: Record<string, unknown> | null
    lastSeenAt?: string | null
  } | null
  _count?: {
    enrollments: number
    progress: number
  }
}

export type EndUserPagination = {
  page: number
  limit: number
  total: number
  totalPages: number
}

export type EndUserList = {
  endUsers: EndUser[]
  pagination: EndUserPagination
}

export type ApiKey = {
  id: string
  name: string
  key: string
  projectId: string
  createdAt: string
  lastUsedAt?: string | null
}

export type ApiKeyOwner = {
  name?: string | null
  email?: string | null
}

export type ApiKeyList = {
  publishableKey?: string | null
  secretKeys: ApiKey[]
  owner?: ApiKeyOwner
}

type FetchProjectEndUsersParams = {
  search?: string
  page?: number
  limit?: number
}

export async function fetchProjectEndUsers(
  projectId: string,
  params: FetchProjectEndUsersParams = {}
): Promise<EndUserList> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch end users', 400)
  }

  const searchParams = new URLSearchParams()
  if (params.search) searchParams.set('search', params.search)
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))

  const query = searchParams.toString()
  const payload = await apiFetch<{
    endUsers?: EndUser[]
    pagination?: EndUserPagination
  }>(`/projects/${projectId}/end-users${query ? `?${query}` : ''}`)

  return {
    endUsers: payload.endUsers ?? [],
    pagination: payload.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: payload.endUsers?.length ?? 0,
      totalPages: 1,
    },
  }
}

export type CreateEndUserInput = {
  email?: string
  externalId?: string
  password?: string
  name?: string
  metadata?: Record<string, unknown>
  status?: EndUserStatus
}

export async function createEndUser(
  projectId: string,
  input: CreateEndUserInput
): Promise<EndUser> {
  if (!projectId) {
    throw new ApiError('Project ID is required to create an end user', 400)
  }

  const payload = await apiFetch<{ endUser: EndUser }>(
    `/projects/${projectId}/end-users`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )

  return payload.endUser
}

export async function updateEndUserStatus(
  projectId: string,
  endUserId: string,
  status: EndUserStatus
): Promise<EndUser> {
  if (!projectId || !endUserId) {
    throw new ApiError('Project ID and End User ID are required', 400)
  }

  const payload = await apiFetch<{ endUser: EndUser }>(
    `/projects/${projectId}/end-users/${endUserId}/status`,
    {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }
  )

  return payload.endUser
}

export async function fetchProjectApiKeys(
  projectId: string
): Promise<ApiKeyList> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch API keys', 400)
  }

  const payload = await apiFetch<{
    publishableKey?: string | null
    secretKeys?: ApiKey[]
    owner?: ApiKeyOwner
  }>(`/projects/${projectId}/api-keys`)

  return {
    publishableKey: payload.publishableKey ?? null,
    secretKeys: payload.secretKeys ?? [],
    owner: payload.owner,
  }
}

export async function createProjectApiKey(
  projectId: string,
  name: string
): Promise<{ apiKey: string; key: ApiKey }> {
  if (!projectId) {
    throw new ApiError('Project ID is required to create an API key', 400)
  }

  const payload = await apiFetch<{ apiKey: string; key: ApiKey }>(
    `/projects/${projectId}/api-keys`,
    {
      method: 'POST',
      body: JSON.stringify({ name }),
    }
  )

  return payload
}

export async function deleteProjectApiKey(
  projectId: string,
  keyId: string
): Promise<void> {
  if (!projectId || !keyId) {
    throw new ApiError(
      'Project ID and Key ID are required to delete a key',
      400
    )
  }

  await apiFetch(`/projects/${projectId}/api-keys/${keyId}`, {
    method: 'DELETE',
    skipJson: true,
  })
}

export async function updateProjectApiKeyName(
  projectId: string,
  keyId: string,
  name: string
): Promise<ApiKey> {
  if (!projectId || !keyId) {
    throw new ApiError(
      'Project ID and Key ID are required to update a key',
      400
    )
  }

  if (!name.trim()) {
    throw new ApiError('Key name is required', 400)
  }

  const payload = await apiFetch<{ apiKey: ApiKey }>(
    `/projects/${projectId}/api-keys/${keyId}`,
    {
      method: 'PATCH',
      body: JSON.stringify({ name }),
    }
  )

  return payload.apiKey
}

export type CourseSummary = {
  id: string
  title: string
  description?: string | null
  slug: string
  thumbnail?: string | null
  category?: string[]
  instructors?: CourseInstructor[]
  isPublished: boolean
  price: number
  enrollmentValidityDays?: number | null
  certificatesEnabled?: boolean
  projectId: string
  createdAt: string
  updatedAt: string
  _count?: {
    modules: number
    enrollments: number
    lessons: number
  }
}

export type CourseInstructor = {
  name: string
  avatar?: string | null
  role?: string | null
  description?: string | null
}

export type Module = {
  id: string
  title: string
  description?: string | null
  order: number
  courseId: string
  createdAt: string
  updatedAt: string
}

export type CourseModuleLesson = {
  id: string
  title: string
  description?: string | null
  contentType?: string | null
  videoUrl?: string | null
  videoId?: string | null
  videoStatus?: 'PROCESSING' | 'READY' | 'FAILED' | string | null
  textContent?: string | null
  fileUrl?: string | null
  duration?: number | null
  isFree: boolean
  order: number
}

export type LessonPrimaryContentType =
  | 'VIDEO'
  | 'TEXT'
  | 'QUIZ'
  | 'MOCK_TEST'
  | 'ASSIGNMENT'
  | 'YOUTUBE'
export type LessonContentType =
  | LessonPrimaryContentType
  | 'FILE'
  | 'RESOURCES'

export type CourseModule = Module & {
  lessons: CourseModuleLesson[]
  _count?: {
    lessons: number
  }
}

export type CourseDetail = CourseSummary & {
  modules: CourseModule[]
  _count?: {
    enrollments: number
  }
}

type FetchProjectCoursesParams = {
  isPublished?: boolean
}

export async function fetchProjectCourses(
  projectId: string,
  params: FetchProjectCoursesParams = {}
): Promise<CourseSummary[]> {
  if (!projectId) {
    throw new ApiError('Project ID is required to fetch courses', 400)
  }

  const searchParams = new URLSearchParams()
  if (params.isPublished !== undefined) {
    searchParams.set('isPublished', String(params.isPublished))
  }

  const queryString = searchParams.toString()
  const payload = await apiFetch<{ courses: CourseSummary[] }>(
    `/projects/${projectId}/courses${queryString ? `?${queryString}` : ''}`
  )

  return payload.courses ?? []
}

export type CreateCourseInput = {
  title: string
  description?: string
  price?: number
  thumbnail?: string
  isPublished?: boolean
}

export type UpdateCourseInput = Partial<{
  title: string
  description: string | null
  price: number
  enrollmentValidityDays: number | null
  thumbnail: string | null
  category: string[]
  instructors: CourseInstructor[]
  isPublished: boolean
  certificatesEnabled: boolean
}>

export type CreateModuleInput = {
  title: string
  description?: string
}

export type CreateLessonInput = {
  title: string
  contentType: LessonPrimaryContentType
  description?: string
  textContent?: string
  fileUrl?: string
  videoUrl?: string
  isFree?: boolean
  duration?: number
}

export type UpdateLessonInput = Partial<{
  title: string
  description: string | null
  contentType: LessonContentType
  textContent: string | null
  fileUrl: string | null
  videoUrl: string | null
  isFree: boolean
  duration: number | null
  order: number
}>

export type VideoUploadSession = {
  uploadToken: string
  expiresAt: string
  apiUrl: string
  playbackPolicy: VideoPlaybackPolicy
  generateSubtitle: boolean
  generateChapters: boolean
}

export type VideoPlaybackPolicy = 'public' | 'signed'

export type ChapterMarker = {
  startTime: number
  endTime: number
  title: string
}

export type VideoPlaybackSession = {
  type: 'clipmux' | string
  videoId: string
  token?: string
  url?: string | null
  subtitleUrl?: string | null
  chapters?: ChapterMarker[] | null
  expiresAt?: number
}

export type LinkVideoInput = {
  videoId: string
  title: string
}

export async function createCourse(
  projectId: string,
  input: CreateCourseInput
): Promise<CourseSummary> {
  if (!projectId) {
    throw new ApiError('Project ID is required to create a course', 400)
  }

  const payload = await apiFetch<{ course: CourseSummary }>(
    `/projects/${projectId}/courses`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )

  return payload.course
}

export async function fetchCourse(
  projectId: string,
  courseId: string
): Promise<CourseDetail> {
  if (!projectId || !courseId) {
    throw new ApiError('Project ID and Course ID are required', 400)
  }

  const payload = await apiFetch<{ course: CourseDetail }>(
    `/projects/${projectId}/courses/${courseId}`
  )

  return payload.course
}

export async function updateCourse(
  projectId: string,
  courseId: string,
  input: UpdateCourseInput
): Promise<CourseSummary> {
  if (!projectId || !courseId) {
    throw new ApiError('Project ID and Course ID are required to update', 400)
  }

  const payload = await apiFetch<{ course: CourseSummary }>(
    `/projects/${projectId}/courses/${courseId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )

  return payload.course
}

export async function toggleCoursePublish(
  projectId: string,
  courseId: string
): Promise<CourseSummary> {
  if (!projectId || !courseId) {
    throw new ApiError(
      'Project ID and Course ID are required to toggle publish state',
      400
    )
  }

  const payload = await apiFetch<{ course: CourseSummary }>(
    `/projects/${projectId}/courses/${courseId}/publish`,
    { method: 'POST' }
  )

  return payload.course
}

export async function deleteCourse(
  projectId: string,
  courseId: string
): Promise<void> {
  if (!projectId || !courseId) {
    throw new ApiError(
      'Project ID and Course ID are required to delete a course',
      400
    )
  }

  await apiFetch(`/projects/${projectId}/courses/${courseId}`, {
    method: 'DELETE',
    skipJson: true,
  })
}

export type ThumbnailUploadSession = {
  presignedUrl: string
  fileUrl: string
  key: string
  method: string
  headers: Record<string, string>
}

export async function createCourseThumbnailUpload(
  projectId: string,
  courseId: string,
  fileName: string,
  contentType: string
): Promise<ThumbnailUploadSession> {
  if (!projectId || !courseId) {
    throw new ApiError(
      'Project ID and Course ID are required to upload thumbnail',
      400
    )
  }

  if (!fileName) {
    throw new ApiError('File name is required', 400)
  }

  const payload = await apiFetch<ThumbnailUploadSession>(
    `/projects/${projectId}/courses/${courseId}/thumbnail/presign`,
    {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    }
  )

  return payload
}

export async function createCourseInstructorAvatarUpload(
  projectId: string,
  courseId: string,
  fileName: string,
  contentType: string
): Promise<ThumbnailUploadSession> {
  if (!projectId || !courseId) {
    throw new ApiError(
      'Project ID and Course ID are required to upload instructor avatar',
      400
    )
  }

  if (!fileName) {
    throw new ApiError('File name is required', 400)
  }

  const payload = await apiFetch<ThumbnailUploadSession>(
    `/projects/${projectId}/courses/${courseId}/instructors/avatar/presign`,
    {
      method: 'POST',
      body: JSON.stringify({ fileName, contentType }),
    }
  )

  return payload
}

export async function createModule(
  projectId: string,
  courseId: string,
  input: CreateModuleInput
): Promise<CourseModule> {
  if (!projectId || !courseId) {
    throw new ApiError(
      'Project ID and Course ID are required to add modules',
      400
    )
  }

  if (!input.title) {
    throw new ApiError('Module title is required', 400)
  }

  const payload = await apiFetch<{ module: Module }>(
    `/projects/${projectId}/courses/${courseId}/modules`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: input.title,
        description: input.description,
      }),
    }
  )

  const createdModule = payload.module

  return {
    ...createdModule,
    lessons: [],
    _count: {
      lessons: 0,
    },
  }
}

export async function createLesson(
  projectId: string,
  courseId: string,
  moduleId: string,
  input: CreateLessonInput
): Promise<CourseModuleLesson> {
  if (!projectId || !courseId || !moduleId) {
    throw new ApiError(
      'Project, Course, and Module IDs are required to add lessons',
      400
    )
  }

  if (!input.title || !input.contentType) {
    throw new ApiError('Lesson title and content type are required', 400)
  }

  if (!['VIDEO', 'TEXT', 'QUIZ', 'MOCK_TEST', 'ASSIGNMENT', 'YOUTUBE'].includes(input.contentType)) {
    throw new ApiError(
      'Lessons must be one of: VIDEO, TEXT, QUIZ, MOCK_TEST, ASSIGNMENT, or YOUTUBE',
      400
    )
  }

  const payload = await apiFetch<{ lesson: CourseModuleLesson }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...input,
        description: input.description?.trim() || undefined,
        textContent: input.textContent?.trim() || undefined,
        fileUrl: input.fileUrl?.trim() || undefined,
        videoUrl: input.videoUrl?.trim() || undefined,
      }),
    }
  )

  return payload.lesson
}

export async function updateLesson(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  input: UpdateLessonInput
): Promise<CourseModuleLesson> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to update a lesson',
      400
    )
  }

  const payload = await apiFetch<{ lesson: CourseModuleLesson }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )

  return payload.lesson
}

export async function createVideoUploadSession(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  title: string,
  playbackPolicy: VideoPlaybackPolicy = 'signed',
  generateSubtitle = false,
  generateChapters = false
): Promise<VideoUploadSession> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to upload a video',
      400
    )
  }

  const payload = await apiFetch<{
    uploadToken: string
    expiresAt: string
    apiUrl: string
    playbackPolicy?: VideoPlaybackPolicy
    generateSubtitle?: boolean
    generateChapters?: boolean
  }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/upload`,
    {
      method: 'POST',
      body: JSON.stringify({ title, playbackPolicy, generateSubtitle, generateChapters }),
    }
  )

  return {
    uploadToken: payload.uploadToken,
    expiresAt: payload.expiresAt,
    apiUrl: payload.apiUrl,
    playbackPolicy: payload.playbackPolicy ?? playbackPolicy,
    generateSubtitle: payload.generateSubtitle ?? generateSubtitle,
    generateChapters: payload.generateChapters ?? generateChapters,
  }
}

export async function linkVideoToLesson(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  input: LinkVideoInput
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to link a video',
      400
    )
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/link-video`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )
}

export async function fetchLessonPlaybackSession(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<VideoPlaybackSession> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to fetch playback.',
      400
    )
  }

  const payload = await apiFetch<{
    type: string
    videoId: string
    token?: string
    url?: string | null
    subtitle_url?: string | null
    chapters?: ChapterMarker[] | null
  }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/play`
  )

  return {
    type: payload.type,
    videoId: payload.videoId,
    token: payload.token,
    url: payload.url ?? null,
    subtitleUrl: payload.subtitle_url ?? null,
    chapters: payload.chapters ?? null,
  }
}

export type UpdateModuleInput = Partial<{
  title: string
  description: string | null
}>

export async function updateModule(
  projectId: string,
  courseId: string,
  moduleId: string,
  input: UpdateModuleInput
): Promise<Module> {
  if (!projectId || !courseId || !moduleId) {
    throw new ApiError(
      'Project, Course, and Module IDs are required to update a module',
      400
    )
  }

  const payload = await apiFetch<{ module: Module }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(input),
    }
  )

  return payload.module
}

export async function deleteModule(
  projectId: string,
  courseId: string,
  moduleId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId) {
    throw new ApiError(
      'Project, Course, and Module IDs are required to delete a module',
      400
    )
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}

export type ModuleOrderItem = {
  id: string
  order: number
}

export async function reorderModules(
  projectId: string,
  courseId: string,
  moduleOrders: ModuleOrderItem[]
): Promise<void> {
  if (!projectId || !courseId) {
    throw new ApiError(
      'Project and Course IDs are required to reorder modules',
      400
    )
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/reorder`,
    {
      method: 'POST',
      body: JSON.stringify({ moduleOrders }),
    }
  )
}

export async function deleteLesson(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to delete a lesson',
      400
    )
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}

export type LessonOrderItem = {
  id: string
  order: number
}

export async function reorderLessons(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonOrders: LessonOrderItem[]
): Promise<void> {
  if (!projectId || !courseId || !moduleId) {
    throw new ApiError(
      'Project, Course, and Module IDs are required to reorder lessons',
      400
    )
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/reorder`,
    {
      method: 'POST',
      body: JSON.stringify({ lessonOrders }),
    }
  )
}

// ===== AI COURSE GENERATION =====

export type GenerateCourseOutlineInput = {
  description: string
  targetAudience?: string
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
  moduleCount?: number
  lessonsPerModule?: number
}

export type GeneratedLesson = {
  title: string
  description: string
  contentType: 'VIDEO' | 'TEXT'
  estimatedDuration: number
  order: number
  isFree: boolean
}

export type GeneratedModule = {
  title: string
  description: string
  order: number
  lessons: GeneratedLesson[]
}

export type GeneratedCourseOutline = {
  title: string
  description: string
  modules: GeneratedModule[]
  suggestedPrice: number
  estimatedTotalHours: number
  prerequisites: string[]
  learningOutcomes: string[]
}

export async function generateCourseOutline(
  projectId: string,
  input: GenerateCourseOutlineInput
): Promise<GeneratedCourseOutline> {
  if (!projectId) {
    throw new ApiError('Project ID is required to generate course outline', 400)
  }

  if (!input.description?.trim()) {
    throw new ApiError('Course description is required', 400)
  }

  const payload = await apiFetch<{ outline: GeneratedCourseOutline }>(
    `/projects/${projectId}/ai/generate-outline`,
    {
      method: 'POST',
      body: JSON.stringify(input),
    }
  )

  return payload.outline
}

export async function deleteVideoFromLesson(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to delete video',
      400
    )
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/video`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}

// ===== LESSON IMAGE UPLOADS =====

export type LessonImageUploadSession = {
  upload: {
    id: string
    title: string
    type: string
    key: string
    fileUrl: string
  }
  presignedUrl: string
  method: string
  headers: Record<string, string>
}

export async function createLessonImageUpload(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  fileName: string,
  contentType: string
): Promise<LessonImageUploadSession> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to upload an image',
      400
    )
  }

  if (!fileName) {
    throw new ApiError('File name is required', 400)
  }

  const payload = await apiFetch<LessonImageUploadSession>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/uploads/presign`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: fileName,
        type: contentType,
        fileName,
      }),
    }
  )

  return payload
}

// ===== GENERIC FILE UPLOADS (RESOURCES) =====

export type Upload = {
  id: string
  lessonId: string
  title: string
  fileUrl: string
  key: string
  type: string
  createdAt: string
  updatedAt: string
}

export type UploadList = {
  uploads: Upload[]
}

export async function fetchLessonUploads(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Upload[]> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to fetch uploads', 400)
  }

  const payload = await apiFetch<{ uploads: Upload[] }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/uploads`
  )

  return payload.uploads
}

export type CreateUploadSession = {
  upload: Upload
  presignedUrl: string
  method: string
  headers: Record<string, string>
}

export async function createLessonUpload(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  fileName: string,
  contentType: string
): Promise<CreateUploadSession> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to create upload',
      400
    )
  }

  if (!fileName) {
    throw new ApiError('File name is required', 400)
  }

  const payload = await apiFetch<CreateUploadSession>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/uploads/presign`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: fileName,
        type: contentType,
        fileName,
      }),
    }
  )

  return payload
}

export async function deleteLessonUpload(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  uploadId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId || !uploadId) {
    throw new ApiError('All IDs are required to delete upload', 400)
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/uploads/${uploadId}`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}


// ========== PDF Upload ==========

interface PdfUploadSession {
  presignedUrl: string
  fileUrl: string
  key: string
  method: 'PUT'
  headers: {
    'Content-Type': string
  }
  expiresIn: number
}

export async function createPdfUpload(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  fileName: string,
  contentType: string
): Promise<PdfUploadSession> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to create PDF upload',
      400
    )
  }

  if (!fileName) {
    throw new ApiError('File name is required', 400)
  }

  const payload = await apiFetch<PdfUploadSession>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/pdf/presign`,
    {
      method: 'POST',
      body: JSON.stringify({
        fileName,
        contentType,
      }),
    }
  )

  return payload
}

export async function deletePdfFromLesson(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError(
      'Project, Course, Module, and Lesson IDs are required to delete PDF',
      400
    )
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/pdf`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}

// ===== ASSIGNMENT TYPES =====

export type Assignment = {
  id: string
  lessonId: string
  title: string
  description?: string | null
  dueDate?: string | null
  totalPoints: number
  createdAt: string
  updatedAt: string
  _count?: {
    submissions: number
  }
}

export type CreateAssignmentInput = {
  title: string
  description?: string
  dueDate?: string | null
  totalPoints?: number
}

export type UpdateAssignmentInput = Partial<CreateAssignmentInput>

export type AssignmentSubmissionStatus = 'graded' | 'ungraded'

export type AssignmentSubmissionEndUser = {
  id: string
  email?: string | null
  externalId?: string | null
}

export type AssignmentSubmission = {
  id: string
  assignmentId: string
  endUserId: string
  content?: string | null
  fileUrl?: string | null
  grade?: number | null
  feedback?: string | null
  submittedAt: string
  gradedAt?: string | null
  gradedById?: string | null
  endUser?: AssignmentSubmissionEndUser
}

export type AssignmentSubmissionsList = {
  submissions: AssignmentSubmission[]
  total: number
  assignment: {
    id: string
    lessonId: string
    title: string
    dueDate?: string | null
    totalPoints: number
  }
}

// ===== ASSIGNMENT API FUNCTIONS =====

export async function getAssignment(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Assignment | null> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to fetch assignment', 400)
  }

  const payload = await apiFetch<{ assignment: Assignment | null }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assignments`
  )

  return payload.assignment
}

export async function createAssignment(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: CreateAssignmentInput
): Promise<Assignment> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to create assignment', 400)
  }

  if (!data?.title?.trim()) {
    throw new ApiError('Assignment title is required', 400)
  }

  const payload = await apiFetch<{ assignment: Assignment }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assignments`,
    {
      method: 'POST',
      body: JSON.stringify({
        title: data.title.trim(),
        description: data.description?.trim() || undefined,
        dueDate: data.dueDate || undefined,
        totalPoints: data.totalPoints,
      }),
    }
  )

  return payload.assignment
}

export async function updateAssignment(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: UpdateAssignmentInput
): Promise<Assignment> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to update assignment', 400)
  }

  const payload = await apiFetch<{ assignment: Assignment }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assignments`,
    {
      method: 'PATCH',
      body: JSON.stringify({
        ...(data.title !== undefined && { title: data.title.trim() }),
        ...(data.description !== undefined && {
          description: data.description.trim() || null,
        }),
        ...(data.dueDate !== undefined && { dueDate: data.dueDate || null }),
        ...(data.totalPoints !== undefined && { totalPoints: data.totalPoints }),
      }),
    }
  )

  return payload.assignment
}

export async function deleteAssignment(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to delete assignment', 400)
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assignments`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}

export async function listAssignmentSubmissions(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  status?: AssignmentSubmissionStatus
): Promise<AssignmentSubmissionsList> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to list assignment submissions', 400)
  }

  const searchParams = new URLSearchParams()
  if (status) {
    searchParams.set('status', status)
  }

  const query = searchParams.toString()
  const payload = await apiFetch<{
    submissions?: AssignmentSubmission[]
    total?: number
    assignment?: AssignmentSubmissionsList['assignment']
  }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assignments/submissions${query ? `?${query}` : ''}`
  )

  return {
    submissions: payload.submissions ?? [],
    total: payload.total ?? payload.submissions?.length ?? 0,
    assignment: payload.assignment ?? {
      id: '',
      lessonId,
      title: '',
      dueDate: null,
      totalPoints: 100,
    },
  }
}

export type GradeAssignmentSubmissionInput = {
  grade: number
  feedback?: string
}

export async function gradeAssignmentSubmission(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  submissionId: string,
  input: GradeAssignmentSubmissionInput
): Promise<AssignmentSubmission> {
  if (!projectId || !courseId || !moduleId || !lessonId || !submissionId) {
    throw new ApiError('All IDs are required to grade assignment submission', 400)
  }

  const payload = await apiFetch<{ submission: AssignmentSubmission }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/assignments/submissions/${submissionId}/grade`,
    {
      method: 'POST',
      body: JSON.stringify({
        grade: input.grade,
        feedback: input.feedback?.trim() || undefined,
      }),
    }
  )

  return payload.submission
}

// ===== QUIZ TYPES =====

export type QuestionType =
  | 'MULTIPLE_CHOICE'
  | 'MULTI_SELECT'
  | 'TRUE_FALSE'
  | 'SHORT_ANSWER'
  | 'INTEGER'

export type Question = {
  id: string
  quizId: string
  questionText: string
  questionType: QuestionType
  options: string[] | null
  correctAnswer: string
  correctAnswers?: string[]
  explanation?: string | null
  points: number
  negativePoints?: number
  partialMarking?: boolean
  sectionId?: string | null
  order: number
  createdAt: string
}

export type Quiz = {
  id: string
  lessonId: string
  title: string
  description?: string | null
  passingScore: number
  maxAttempts?: number | null
  timeLimit?: number | null
  negativeMarking?: boolean
  defaultNegativeMark?: number | null
  isMockTest?: boolean
  startTime?: string | null
  endTime?: string | null
  createdAt: string
  updatedAt: string
  questions?: Question[]
  _count?: {
    attempts: number
  }
}

export type CreateQuizInput = {
  title: string
  description?: string
  passingScore?: number
  maxAttempts?: number
  timeLimit?: number
  negativeMarking?: boolean
  defaultNegativeMark?: number
  isMockTest?: boolean
  startTime?: string
  endTime?: string
}

export type UpdateQuizInput = Partial<CreateQuizInput>

export type CreateQuestionInput = {
  questionText: string
  questionType: QuestionType
  options?: string[]
  correctAnswer: string
  explanation?: string
  points?: number
}

export type UpdateQuestionInput = Partial<CreateQuestionInput> & {
  order?: number
}

export type GenerateQuizOptions = {
  description: string
  questionCount?: number
  questionTypes?: QuestionType[]
  difficulty?: 'beginner' | 'intermediate' | 'advanced'
}

// ===== QUIZ API FUNCTIONS =====

export async function getQuiz(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<Quiz | null> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to fetch quiz', 400)
  }

  const payload = await apiFetch<{ quiz: Quiz | null }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes`
  )

  return payload.quiz
}

export async function createQuiz(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: CreateQuizInput
): Promise<Quiz> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to create quiz', 400)
  }

  const payload = await apiFetch<{ quiz: Quiz }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )

  return payload.quiz
}

export async function updateQuiz(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: UpdateQuizInput
): Promise<Quiz> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to update quiz', 400)
  }

  const payload = await apiFetch<{ quiz: Quiz }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )

  return payload.quiz
}

export async function deleteQuiz(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to delete quiz', 400)
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}

// ===== QUESTION API FUNCTIONS =====

export async function createQuestion(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  data: CreateQuestionInput
): Promise<Question> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to create question', 400)
  }

  const payload = await apiFetch<{ question: Question }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes/questions`,
    {
      method: 'POST',
      body: JSON.stringify(data),
    }
  )

  return payload.question
}

export async function updateQuestion(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  questionId: string,
  data: UpdateQuestionInput
): Promise<Question> {
  if (!projectId || !courseId || !moduleId || !lessonId || !questionId) {
    throw new ApiError('All IDs are required to update question', 400)
  }

  const payload = await apiFetch<{ question: Question }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes/questions/${questionId}`,
    {
      method: 'PATCH',
      body: JSON.stringify(data),
    }
  )

  return payload.question
}

export async function deleteQuestion(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  questionId: string
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId || !questionId) {
    throw new ApiError('All IDs are required to delete question', 400)
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes/questions/${questionId}`,
    {
      method: 'DELETE',
      skipJson: true,
    }
  )
}

export async function reorderQuestions(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  questionOrders: { id: string; order: number }[]
): Promise<void> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to reorder questions', 400)
  }

  await apiFetch(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/quizzes/questions/reorder`,
    {
      method: 'POST',
      body: JSON.stringify({ questionOrders }),
      skipJson: true,
    }
  )
}

// ===== AI QUIZ GENERATION =====

export async function generateQuizWithAI(
  projectId: string,
  courseId: string,
  moduleId: string,
  lessonId: string,
  options: GenerateQuizOptions
): Promise<{ questions: Question[]; questionCount: number }> {
  if (!projectId || !courseId || !moduleId || !lessonId) {
    throw new ApiError('All IDs are required to generate quiz', 400)
  }

  const payload = await apiFetch<{
    questions: Question[]
    questionCount: number
  }>(
    `/projects/${projectId}/courses/${courseId}/modules/${moduleId}/lessons/${lessonId}/ai/generate-quiz`,
    {
      method: 'POST',
      body: JSON.stringify(options),
    }
  )

  return {
    questions: payload.questions ?? [],
    questionCount: payload.questionCount ?? 0,
  }
}

// Course Enrollments
export type CourseEnrollmentEndUser = {
  id: string
  email?: string | null
  externalId?: string | null
  managedUser?: {
    name?: string | null
  } | null
  delegatedUser?: {
    lastSeenAt?: string | null
  } | null
}

export type CourseEnrollment = {
  id: string
  courseId: string
  endUserId: string
  enrolledAt: string
  completedAt?: string | null
  progress: number
  expiresAt?: string | null
  endUser: CourseEnrollmentEndUser
}

export type CourseEnrollmentPagination = {
  total: number
  page: number
  limit: number
  totalPages: number
  hasMore: boolean
}

export type CourseEnrollmentList = {
  enrollments: CourseEnrollment[]
  pagination: CourseEnrollmentPagination
}

type FetchCourseEnrollmentsParams = {
  page?: number
  limit?: number
  status?: 'active' | 'expired' | 'all'
  search?: string
}

export async function fetchCourseEnrollments(
  projectId: string,
  courseId: string,
  params: FetchCourseEnrollmentsParams = {}
): Promise<CourseEnrollmentList> {
  if (!projectId || !courseId) {
    throw new ApiError('Project ID and Course ID are required to fetch enrollments', 400)
  }

  const searchParams = new URLSearchParams()
  if (params.page) searchParams.set('page', String(params.page))
  if (params.limit) searchParams.set('limit', String(params.limit))
  if (params.status) searchParams.set('status', params.status)

  const query = searchParams.toString()
  const payload = await apiFetch<{
    enrollments?: CourseEnrollment[]
    pagination?: CourseEnrollmentPagination
  }>(`/projects/${projectId}/courses/${courseId}/enrollments${query ? `?${query}` : ''}`)

  return {
    enrollments: payload.enrollments ?? [],
    pagination: payload.pagination ?? {
      page: params.page ?? 1,
      limit: params.limit ?? 20,
      total: payload.enrollments?.length ?? 0,
      totalPages: 1,
      hasMore: false,
    },
  }
}
