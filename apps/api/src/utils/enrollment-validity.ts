type ResolveEnrollmentValidityInput = {
  requestedDurationInDays?: number | null
  courseEnrollmentValidityDays?: number | null
}

const normalizePositiveInt = (value: number | null | undefined): number | null => {
  if (value === null || value === undefined) return null
  if (!Number.isInteger(value) || value <= 0) return null
  return value
}

export const resolveEnrollmentDurationInDays = ({
  requestedDurationInDays,
  courseEnrollmentValidityDays,
}: ResolveEnrollmentValidityInput): number | null => {
  return (
    normalizePositiveInt(requestedDurationInDays) ??
    normalizePositiveInt(courseEnrollmentValidityDays)
  )
}

export const computeEnrollmentExpiresAt = (
  enrolledAt: Date,
  durationInDays: number | null
): Date | null => {
  if (!durationInDays) return null

  const expiresAt = new Date(enrolledAt)
  expiresAt.setDate(expiresAt.getDate() + durationInDays)
  return expiresAt
}

