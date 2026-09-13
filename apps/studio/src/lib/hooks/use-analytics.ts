'use client'

import { useQuery } from '@tanstack/react-query'

import {
  fetchProjectAnalyticsCourseInsights,
  fetchProjectAnalyticsEngagement,
  fetchProjectAnalyticsOverview,
  fetchProjectAnalyticsRecentSales,
  fetchProjectAnalyticsStudents,
  type CourseAnalyticsInsights,
  type ProjectAnalyticsOverview,
  type ProjectEngagementMetrics,
  type ProjectStudentAnalytics,
  type ProjectTransaction,
} from '@/lib/api'

export const analyticsKeys = {
  overview: (projectId: string) =>
    ['project', projectId, 'analytics', 'overview'] as const,
  engagement: (projectId: string) =>
    ['project', projectId, 'analytics', 'engagement'] as const,
  sales: (projectId: string) =>
    ['project', projectId, 'analytics', 'recent-sales'] as const,
  students: (projectId: string) =>
    ['project', projectId, 'analytics', 'students'] as const,
  courseInsights: (projectId: string, courseId: string) =>
    ['project', projectId, 'analytics', 'course', courseId] as const,
}

export function useProjectAnalyticsOverview(projectId: string) {
  return useQuery<ProjectAnalyticsOverview, Error>({
    queryKey: analyticsKeys.overview(projectId),
    queryFn: () => fetchProjectAnalyticsOverview(projectId),
    enabled: !!projectId,
  })
}

export function useProjectAnalyticsEngagement(projectId: string) {
  return useQuery<ProjectEngagementMetrics, Error>({
    queryKey: analyticsKeys.engagement(projectId),
    queryFn: () => fetchProjectAnalyticsEngagement(projectId),
    enabled: !!projectId,
  })
}

export function useProjectAnalyticsRecentSales(projectId: string) {
  return useQuery<ProjectTransaction[], Error>({
    queryKey: analyticsKeys.sales(projectId),
    queryFn: () => fetchProjectAnalyticsRecentSales(projectId),
    enabled: !!projectId,
  })
}

export function useProjectAnalyticsStudents(projectId: string) {
  return useQuery<ProjectStudentAnalytics[], Error>({
    queryKey: analyticsKeys.students(projectId),
    queryFn: () => fetchProjectAnalyticsStudents(projectId),
    enabled: !!projectId,
  })
}

export function useProjectAnalyticsCourseInsights(
  projectId: string,
  courseId: string,
) {
  return useQuery<CourseAnalyticsInsights, Error>({
    queryKey: analyticsKeys.courseInsights(projectId, courseId),
    queryFn: () => fetchProjectAnalyticsCourseInsights(projectId, courseId),
    enabled: !!projectId && !!courseId,
  })
}
