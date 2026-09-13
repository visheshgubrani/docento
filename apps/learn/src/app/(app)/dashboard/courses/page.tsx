import type { Metadata } from "next"
import { redirect } from "next/navigation"

export const metadata: Metadata = {
  title: "Dashboard Courses",
  description: "Redirecting to dashboard.",
}

export default function DashboardCoursesRedirectPage() {
  redirect("/dashboard")
}

