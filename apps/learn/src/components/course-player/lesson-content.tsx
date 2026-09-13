"use client";

import Link from "next/link";
import { ClipMuxPlayer } from "@clipmux/player";
import {
  HiDocumentText,
  HiPlayCircle,
  HiSparkles,
  HiLink,
} from "react-icons/hi2";
import {
  type LessonPlayback,
  type StorefrontLesson,
  type StorefrontLessonDetail,
} from "@/lib/lms-api-client";
import { QuizLessonContent } from "@/components/course-player/quiz-lesson-content";
import { TextLessonContent } from "@/components/course-player/text-lesson-content";
import { AssignmentLessonContent } from "@/components/course-player/assignment-lesson-content";
import { MdLock } from "react-icons/md";

type LessonContentProps = {
  courseId: string;
  coursePrice?: number | null;
  lesson: StorefrontLesson;
  lessonDetail?: StorefrontLessonDetail | null;
  playback?: LessonPlayback | null;
  playbackLoading?: boolean;
  playbackError?: string | null;
  isLoading?: boolean;
  canAccess: boolean;
  isAuthenticated: boolean;
  onVideoEnded?: () => void;
  onAssignmentSubmitted?: () => void;
};

function AccessGateSkeleton() {
  return (
    <div className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-xl border border-border bg-muted-foreground/15 p-8 text-center dark:bg-muted/45 sm:p-10 md:min-h-[500px] md:p-12">
      <div className="h-8 w-52 animate-pulse rounded bg-muted/60 md:h-10 md:w-64" />
      <div className="mt-4 h-4 w-4/5 max-w-2xl animate-pulse rounded bg-muted/55 md:h-5" />
      <div className="mt-2 h-4 w-3/5 max-w-xl animate-pulse rounded bg-muted/55 md:h-5" />
      <div className="mt-7 flex flex-wrap items-center justify-center gap-2 md:gap-4">
        <div className="h-9 w-24 animate-pulse rounded-full bg-muted/60" />
        <div className="h-9 w-36 animate-pulse rounded-full bg-muted/60" />
      </div>
    </div>
  );
}

function AccessGate({
  courseId,
  isAuthenticated,
  coursePrice,
}: {
  courseId: string;
  isAuthenticated: boolean;
  coursePrice?: number | null;
}) {
  const isFreeCourse = !coursePrice || coursePrice <= 0;
  const gateTitle = isFreeCourse ? "Enrollment required" : "Purchase required";
  const gateDescription = isFreeCourse
    ? "This lesson is locked. Enroll to proceed and watch the rest of the course."
    : "This lesson is locked. Purchase the course to continue.";
  const actionLabel = isFreeCourse ? "Enroll to Continue" : "Purchase Course";

  return (
    <div className="flex min-h-[420px] w-full flex-col items-center justify-center rounded-xl border border-border bg-muted-foreground/15 p-8 text-center dark:bg-muted/45 sm:p-10 md:min-h-[500px] md:p-12">
      <h3 className="font-display flex items-center gap-2 text-2xl font-semibold text-primary md:text-3xl">
        <span>{gateTitle}</span>
        <MdLock />
      </h3>
      <p className="mt-4 max-w-2xl text-sm text-foreground/70 md:text-lg">
        {gateDescription}
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-2 md:gap-4">
        {!isAuthenticated ? (
          <Link
            href={`/login?next=${encodeURIComponent(`/courses/${courseId}`)}`}
            className="inline-flex rounded-full border border-border bg-background px-4 py-2.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
          >
            Login
          </Link>
        ) : null}
        <Link
          href={`/checkout/${courseId}`}
          className="inline-flex rounded-full border border-border bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
        >
          {actionLabel}
        </Link>
      </div>
    </div>
  );
}

function TypePanel({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-muted/20 p-5 sm:p-6">
      <div className="inline-flex rounded-md bg-primary/15 p-2 text-primary">{icon}</div>
      <h3 className="mt-3 text-lg font-semibold text-foreground">{title}</h3>
      <p className="mt-2 text-sm text-foreground/70">{description}</p>
    </div>
  );
}

function VideoLesson({
  lesson,
  playback,
  playbackLoading,
  playbackError,
  onVideoEnded,
}: {
  lesson: StorefrontLesson;
  playback?: LessonPlayback | null;
  playbackLoading?: boolean;
  playbackError?: string | null;
  onVideoEnded?: () => void;
}) {
  if (playbackLoading) {
    return <div className="h-[340px] animate-pulse rounded-lg border border-border bg-muted/40" />;
  }

  if (playback) {
    return (
      <div className="overflow-hidden rounded-lg">
        <ClipMuxPlayer
          playbackId={playback.videoId}
          token={playback.token}
          src={playback.url ?? undefined}
          title={lesson.title}
          subtitles={playback.subtitleUrl ?? undefined}
          chapters={playback.chapters ?? undefined}
          theme={{ primaryColor: "#84cc16", accentColor: "#f59e0b" }}
          onEnded={onVideoEnded}
        />
      </div>
    );
  }

  return (
    <TypePanel
      icon={<HiPlayCircle className="size-5" />}
      title="Video unavailable"
      description={playbackError ?? "Playback is not available for this lesson right now."}
    />
  );
}

function TextLesson({
  lesson,
  lessonDetail,
}: {
  lesson: StorefrontLesson;
  lessonDetail?: StorefrontLessonDetail | null;
}) {
  return (
    <div className="rounded-xl border border-border bg-background p-5">
      <div className="max-w-none lesson-prose">
        <TextLessonContent
          content={lessonDetail?.textContent}
          fallback={
            lessonDetail?.description ??
            lesson.description ??
            "Text content has not been added for this lesson yet."
          }
        />
      </div>
    </div>
  );
}

function MockTestLesson() {
  return (
    <TypePanel
      icon={<HiSparkles className="size-5" />}
      title="Mock test lesson"
      description="Mock tests are delivered in the student dashboard where attempt history and scoring are tracked."
    />
  );
}

function FallbackLesson() {
  return (
    <TypePanel
      icon={<HiDocumentText className="size-5" />}
      title="Lesson content"
      description="This lesson type is not currently supported in this player yet."
    />
  );
}

function extractYouTubeId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (
      (parsed.hostname === "www.youtube.com" ||
        parsed.hostname === "youtube.com") &&
      parsed.searchParams.has("v")
    ) {
      return parsed.searchParams.get("v");
    }
    if (parsed.hostname === "youtu.be") {
      return parsed.pathname.slice(1).split("/")[0] || null;
    }
    if (
      (parsed.hostname === "www.youtube.com" ||
        parsed.hostname === "youtube.com") &&
      parsed.pathname.startsWith("/embed/")
    ) {
      return parsed.pathname.replace("/embed/", "").split("/")[0] || null;
    }
  } catch {
    // not a valid URL
  }
  return null;
}

function YouTubeLesson({
  lesson,
  lessonDetail,
}: {
  lesson: StorefrontLesson;
  lessonDetail?: StorefrontLessonDetail | null;
}) {
  const url = lessonDetail?.videoUrl || "";
  const youtubeId = extractYouTubeId(url);

  if (youtubeId) {
    return (
      <div className="overflow-hidden rounded-lg">
        <div className="aspect-video bg-black">
          <iframe
            className="w-full h-full"
            src={`https://www.youtube.com/embed/${youtubeId}`}
            title={lesson.title}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (url) {
    return (
      <div className="rounded-xl border border-border bg-background p-5">
        <div className="inline-flex rounded-md bg-primary/15 p-2 text-primary">
          <HiLink className="size-5" />
        </div>
        <h3 className="mt-3 text-lg font-semibold text-foreground">
          External Video
        </h3>
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-2 inline-block text-sm text-primary hover:underline break-all"
        >
          {url}
        </a>
      </div>
    );
  }

  return (
    <TypePanel
      icon={<HiLink className="size-5" />}
      title="External video"
      description="No external video link has been set for this lesson."
    />
  );
}

export function LessonContent({
  courseId,
  coursePrice,
  lesson,
  lessonDetail,
  playback,
  playbackLoading,
  playbackError,
  isLoading = false,
  canAccess,
  isAuthenticated,
  onVideoEnded,
  onAssignmentSubmitted,
}: LessonContentProps) {
  if (isLoading) {
    if (!canAccess) {
      return <AccessGateSkeleton />;
    }

    return <div className="h-[340px] animate-pulse rounded-xl border border-border bg-muted/40" />;
  }

  if (!canAccess) {
    return (
      <AccessGate
        courseId={courseId}
        isAuthenticated={isAuthenticated}
        coursePrice={coursePrice}
      />
    );
  }

  const lessonType = lesson.contentType.toUpperCase();

  if (lessonType === "VIDEO") {
    return (
      <VideoLesson
        lesson={lesson}
        playback={playback}
        playbackLoading={playbackLoading}
        playbackError={playbackError}
        onVideoEnded={onVideoEnded}
      />
    );
  }

  if (lessonType === "TEXT") {
    return <TextLesson lesson={lesson} lessonDetail={lessonDetail} />;
  }

  if (lessonType === "QUIZ") return <QuizLessonContent lessonId={lesson.id} />;
  if (lessonType === "ASSIGNMENT") {
    return (
      <AssignmentLessonContent
        lessonId={lesson.id}
        lessonTitle={lesson.title}
        lessonDescription={lessonDetail?.description ?? lesson.description}
        onSubmissionSuccess={onAssignmentSubmitted}
      />
    );
  }
  if (lessonType === "MOCK_TEST") return <MockTestLesson />;
  if (lessonType === "YOUTUBE")
    return <YouTubeLesson lesson={lesson} lessonDetail={lessonDetail} />;
  return <FallbackLesson />;
}
