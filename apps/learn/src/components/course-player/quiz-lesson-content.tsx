"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  HiArrowPath,
  HiChartBar,
  HiCheckCircle,
  HiClipboardDocumentList,
  HiClock,
  HiXCircle,
  HiXMark,
} from "react-icons/hi2";
import {
  ApiRequestError,
  fetchStudentLessonQuiz,
  startStudentQuizAttempt,
  submitStudentQuizAttempt,
  type StudentLessonQuiz,
  type StudentQuizQuestion,
  type StudentQuizSubmitResult,
} from "@/lib/lms-api-client";

function getQuestionOptions(question: StudentQuizQuestion) {
  if (Array.isArray(question.options)) {
    return question.options.filter((option): option is string => typeof option === "string");
  }

  if (question.questionType === "TRUE_FALSE") {
    return ["TRUE", "FALSE"];
  }

  return [];
}

function formatTimeSpent(timeSpent: number | null | undefined) {
  if (!timeSpent || timeSpent < 1) return "0s";
  if (timeSpent < 60) return `${timeSpent}s`;

  const minutes = Math.floor(timeSpent / 60);
  const seconds = timeSpent % 60;
  return `${minutes}m ${seconds}s`;
}

function formatRemainingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.max(0, totalSeconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${seconds}`;
}

function formatTimeLimitMinutes(minutes: number | null | undefined) {
  if (!minutes || minutes < 1) return "0m";
  if (minutes < 60) return `${minutes}m`;

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
}

function toTimeLimitSeconds(value: number | null | undefined) {
  if (typeof value !== "number" || value <= 0) return null;
  return Math.max(1, Math.round(value * 60));
}

function getElapsedSeconds(startedAtMs: number | null) {
  if (!startedAtMs || !Number.isFinite(startedAtMs)) return 0;
  return Math.max(0, Math.floor((Date.now() - startedAtMs) / 1000));
}

function getOptionPrefix(index: number) {
  let value = index;
  let prefix = "";

  do {
    prefix = String.fromCharCode(65 + (value % 26)) + prefix;
    value = Math.floor(value / 26) - 1;
  } while (value >= 0);

  return `${prefix})`;
}

type QuizLessonContentProps = {
  lessonId: string;
};

export function QuizLessonContent({ lessonId }: QuizLessonContentProps) {
  const [quizData, setQuizData] = useState<StudentLessonQuiz | null>(null);
  const [quizResult, setQuizResult] = useState<StudentQuizSubmitResult | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizAttemptId, setQuizAttemptId] = useState<string | null>(null);
  const [quizStartedAt, setQuizStartedAt] = useState<number | null>(null);
  const [timeLimitSeconds, setTimeLimitSeconds] = useState<number | null>(null);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [quizLoading, setQuizLoading] = useState(true);
  const [quizSubmitting, setQuizSubmitting] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);
  const [isTimeoutDialogOpen, setIsTimeoutDialogOpen] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [showQuizResults, setShowQuizResults] = useState(false);
  const autoSubmitTriggered = useRef(false);

  const loadQuizData = useCallback(async () => {
    setQuizLoading(true);
    setQuizError(null);

    try {
      const data = await fetchStudentLessonQuiz(lessonId);
      setQuizData(data);
    } catch (error) {
      if (error instanceof ApiRequestError && error.status === 401) {
        setQuizError("Please log in to attempt this quiz.");
      } else if (error instanceof ApiRequestError && error.status === 403) {
        setQuizError("You need an active enrollment to attempt this quiz.");
      } else {
        setQuizError(error instanceof Error ? error.message : "Failed to load quiz.");
      }
      setQuizData(null);
    } finally {
      setQuizLoading(false);
    }
  }, [lessonId]);

  const startAttempt = useCallback(
    async (quizSnapshot: StudentLessonQuiz) => {
      const response = await startStudentQuizAttempt(lessonId);

      const startedAt = new Date(response.attempt.startedAt).getTime();
      const resolvedTimeLimitSeconds =
        toTimeLimitSeconds(response.timeLimit) ?? toTimeLimitSeconds(quizSnapshot.quiz.timeLimit);
      const backendRemainingSeconds =
        typeof response.remainingSeconds === "number" && Number.isFinite(response.remainingSeconds)
          ? Math.max(0, Math.floor(response.remainingSeconds))
          : null;
      const elapsedSeconds = getElapsedSeconds(startedAt);
      const initialRemainingSeconds =
        resolvedTimeLimitSeconds === null
          ? null
          : backendRemainingSeconds !== null
          ? Math.min(backendRemainingSeconds, resolvedTimeLimitSeconds)
          : Math.max(0, resolvedTimeLimitSeconds - elapsedSeconds);

      setQuizAttemptId(response.attempt.id);
      setQuizStartedAt(startedAt);
      setTimeLimitSeconds(resolvedTimeLimitSeconds);
      setRemainingSeconds(initialRemainingSeconds);
      setQuizAnswers({});
      setQuizResult(null);
      setCurrentQuestionIndex(0);
      setShowQuizResults(false);
      setIsTimeoutDialogOpen(false);
      autoSubmitTriggered.current = false;
    },
    [lessonId]
  );

  useEffect(() => {
    setQuizData(null);
    setQuizResult(null);
    setQuizAnswers({});
    setQuizAttemptId(null);
    setQuizStartedAt(null);
    setTimeLimitSeconds(null);
    setRemainingSeconds(null);
    setQuizError(null);
    setIsTimeoutDialogOpen(false);
    setCurrentQuestionIndex(0);
    setShowQuizResults(false);
    autoSubmitTriggered.current = false;

    void loadQuizData();
  }, [lessonId, loadQuizData]);

  const handleSubmitQuizAttempt = useCallback(
    async (options?: { force?: boolean; dueToTimeout?: boolean }) => {
      if (!quizData || !quizAttemptId || quizSubmitting) return;

      const forceSubmit = Boolean(options?.force);
      const dueToTimeout = Boolean(options?.dueToTimeout);

      if (!forceSubmit) {
        const unansweredQuestion = quizData.questions.find((question) => {
          const answer = quizAnswers[question.id];
          return !answer || !answer.trim();
        });

        if (unansweredQuestion) {
          setQuizError("Answer every question before submitting.");
          return;
        }
      }

      try {
        setQuizSubmitting(true);
        setQuizError(null);

        const elapsedSeconds = Math.max(1, getElapsedSeconds(quizStartedAt));
        const clampedTimeSpent =
          timeLimitSeconds === null ? elapsedSeconds : Math.min(elapsedSeconds, timeLimitSeconds);

        const response = await submitStudentQuizAttempt(lessonId, quizAttemptId, {
          answers: quizData.questions.map((question) => ({
            questionId: question.id,
            userAnswer: (quizAnswers[question.id] ?? "").trim(),
          })),
          timeSpent: clampedTimeSpent,
        });

        setQuizResult(response);
        setQuizAttemptId(null);
        setQuizStartedAt(null);
        setTimeLimitSeconds(null);
        setRemainingSeconds(null);
        setCurrentQuestionIndex(0);
        setShowQuizResults(!dueToTimeout);
        autoSubmitTriggered.current = false;

        const refreshedQuiz = await fetchStudentLessonQuiz(lessonId);
        setQuizData(refreshedQuiz);

        if (dueToTimeout) {
          setIsTimeoutDialogOpen(true);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to submit quiz.";

        if (message.toLowerCase().includes("time limit exceeded")) {
          setQuizError(null);
          setQuizAttemptId(null);
          setQuizStartedAt(null);
          setTimeLimitSeconds(null);
          setRemainingSeconds(null);
          setCurrentQuestionIndex(0);
          setShowQuizResults(false);
          setIsTimeoutDialogOpen(true);
          autoSubmitTriggered.current = false;

          try {
            const refreshedQuiz = await fetchStudentLessonQuiz(lessonId);
            setQuizData(refreshedQuiz);
          } catch {
            // Ignore refresh failures and keep the existing quiz snapshot.
          }
        } else {
          setQuizError(message);
        }
      } finally {
        setQuizSubmitting(false);
      }
    },
    [
      lessonId,
      quizAnswers,
      quizAttemptId,
      quizData,
      quizStartedAt,
      quizSubmitting,
      timeLimitSeconds,
    ]
  );

  useEffect(() => {
    if (!quizAttemptId || remainingSeconds === null || quizSubmitting) return;

    if (remainingSeconds <= 0) {
      if (!autoSubmitTriggered.current) {
        autoSubmitTriggered.current = true;
        void handleSubmitQuizAttempt({ force: true, dueToTimeout: true });
      }
      return;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((previous) => {
        if (previous === null) return null;
        if (previous <= 1) return 0;
        return previous - 1;
      });
    }, 1000);

    return () => {
      window.clearInterval(timerId);
    };
  }, [handleSubmitQuizAttempt, quizAttemptId, quizSubmitting, remainingSeconds]);

  const handleStartQuizAttempt = async () => {
    if (!quizData || quizSubmitting) return;

    try {
      setQuizError(null);
      setIsTimeoutDialogOpen(false);
      await startAttempt(quizData);
    } catch (error) {
      setQuizError(error instanceof Error ? error.message : "Failed to start quiz attempt.");
    }
  };

  const handleQuizAnswerChange = (questionId: string, userAnswer: string) => {
    setQuizAnswers((previous) => ({
      ...previous,
      [questionId]: userAnswer,
    }));
  };

  const handleViewResultsAfterTimeout = () => {
    if (!quizResult) {
      setQuizError("Unable to load results. Check your previous attempts below.");
      setIsTimeoutDialogOpen(false);
      return;
    }

    setShowQuizResults(true);
    setIsTimeoutDialogOpen(false);
  };

  const attemptsValue = useMemo(() => {
    if (!quizData) return "";
    if (!quizData.quiz.maxAttempts) return "Unlimited";

    const remaining = quizData.attemptsRemaining ?? 0;
    return `${remaining}/${quizData.quiz.maxAttempts} left`;
  }, [quizData]);

  const answeredCount = useMemo(() => {
    if (!quizData) return 0;

    return quizData.questions.reduce((count, question) => {
      const answer = quizAnswers[question.id];
      return answer && answer.trim() ? count + 1 : count;
    }, 0);
  }, [quizAnswers, quizData]);

  const activeQuestion = useMemo(() => {
    if (!quizData) return null;
    return quizData.questions[currentQuestionIndex] ?? null;
  }, [currentQuestionIndex, quizData]);
  const activeQuestionOptions = useMemo(
    () => (activeQuestion ? getQuestionOptions(activeQuestion) : []),
    [activeQuestion]
  );

  const activeQuestionPoints = activeQuestion?.points ?? 1;
  const isLastQuestion = Boolean(
    quizData && currentQuestionIndex === Math.max(quizData.questions.length - 1, 0)
  );
  const remainingProgressPercent = useMemo(() => {
    if (!quizAttemptId || remainingSeconds === null || timeLimitSeconds === null) return null;
    if (timeLimitSeconds <= 0) return 0;

    return Math.max(0, Math.min(100, (remainingSeconds / timeLimitSeconds) * 100));
  }, [quizAttemptId, remainingSeconds, timeLimitSeconds]);
  const elapsedProgressPercent = useMemo(() => {
    if (remainingProgressPercent === null) return null;
    return Math.max(0, Math.min(100, 100 - remainingProgressPercent));
  }, [remainingProgressPercent]);
  const infoItems = quizData
    ? [
        {
          label: "Questions",
          value: `${quizData.quiz.totalQuestions}`,
          icon: HiClipboardDocumentList,
        },
        {
          label: "Pass Score",
          value: `${quizData.quiz.passingScore}%`,
          icon: HiChartBar,
        },
        {
          label: "Attempts",
          value: attemptsValue,
          icon: HiArrowPath,
        },
        {
          label: "Time Limit",
          value: quizData.quiz.timeLimit
            ? formatTimeLimitMinutes(quizData.quiz.timeLimit)
            : "No limit",
          icon: HiClock,
        },
      ]
    : [];

  if (quizLoading) {
    return (
      <div className="space-y-3">
        <div className="h-7 w-1/3 animate-pulse rounded bg-muted" />
        <div className="h-48 animate-pulse rounded-xl border border-border bg-muted/30" />
      </div>
    );
  }

  if (quizError && !quizData) {
    return (
      <div className="space-y-3">
        <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          {quizError}
        </div>
        <button
          type="button"
          onClick={() => {
            void loadQuizData();
          }}
          className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!quizData) {
    return (
      <div className="rounded-xl border border-border bg-muted/20 p-4 text-sm text-foreground/75">
        Quiz details are unavailable for this lesson.
      </div>
    );
  }

  return (
    <>
      <div className="space-y-6">
        <div className="rounded-2xl border border-border bg-gradient-to-b from-muted/35 to-background p-4 sm:p-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">Quiz</p>
          <h3 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
            {quizData.quiz.title}
          </h3>
          {quizData.quiz.description ? (
            <p className="mt-2 text-sm text-foreground/80">{quizData.quiz.description}</p>
          ) : null}

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {infoItems.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.label}
                  className="flex items-start gap-3 rounded-lg border border-border bg-background px-3.5 py-3"
                >
                  <Icon className="size-5.5 shrink-0 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                      {item.label}
                    </span>
                    <span className="text-sm mt-1.5 font-semibold text-foreground">
                      {item.value}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {quizAttemptId && remainingSeconds !== null && elapsedProgressPercent !== null ? (
            <div className="mt-5 rounded-lg border border-border bg-background px-3.5 py-3">
              <div className="flex items-center gap-3">
                <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted-foreground/20">
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-1000 ease-linear"
                    style={{ width: `${elapsedProgressPercent}%` }}
                  />
                </div>
                <span className="min-w-14 text-right text-xs font-semibold tabular-nums text-foreground">
                  {formatRemainingTime(remainingSeconds)}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        {quizError && quizData ? (
          <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
            {quizError}
          </div>
        ) : null}

        <div className="rounded-2xl border border-border dark:border-border/70 bg-muted dark:bg-muted/60 px-4 md:px-6 py-8 md:py-10">
          {quizResult && showQuizResults ? (
            <div className="space-y-5">
              <div className="flex items-center justify-between gap-3">
                <h4 className="text-xl font-semibold text-foreground">Results</h4>
                {quizData.canTakeQuiz ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleStartQuizAttempt();
                    }}
                    className="rounded-md border cursor-pointer border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                  >
                    Try Again
                  </button>
                ) : null}
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="flex items-start gap-3 rounded-lg border border-primary/20 dark:border-primary/60  bg-background px-3.5 py-3">
                  {quizResult.summary.passed ? (
                    <HiCheckCircle className="size-5.5 shrink-0 text-primary" />
                  ) : (
                    <HiXCircle className="size-5.5 shrink-0 text-red-500" />
                  )}
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                      Status
                    </span>
                    <span
                      className={`text-sm mt-1.5 font-semibold ${
                        quizResult.summary.passed
                          ? "text-primary"
                          : "text-red-500 dark:text-red-400"
                      }`}
                    >
                      {quizResult.summary.passed ? "Passed" : "Failed"}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-primary/20 dark:border-primary/60  bg-background px-3.5 py-3">
                  <HiChartBar className="size-5.5 shrink-0 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                      Final Score
                    </span>
                    <span className="text-sm mt-1.5 font-semibold text-foreground">
                      {quizResult.summary.score}%
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-primary/20 dark:border-primary/60  bg-background px-3.5 py-3">
                  <HiClipboardDocumentList className="size-5.5 shrink-0 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                      Total Points
                    </span>
                    <span className="text-sm mt-1.5 font-semibold text-foreground">
                      {quizResult.summary.pointsEarned}/{quizResult.summary.totalPoints}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-3 rounded-lg border border-primary/20 dark:border-primary/60  bg-background px-3.5 py-3">
                  <HiClock className="size-5.5 shrink-0 text-primary" />
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold uppercase tracking-wide text-foreground/55">
                      Time Taken
                    </span>
                    <span className="text-sm mt-1.5 font-semibold text-foreground">
                      {formatTimeSpent(quizResult.summary.timeSpent)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                {quizResult.answers.map((answer, index) => (
                  <div
                    key={answer.questionId}
                    className="rounded-lg border border-border bg-background dark:bg-muted/20 p-4"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2 text-xs font-semibold text-foreground/70">
                        <span>Question {index + 1}</span>
                      </div>
                      <span className="rounded-full border border-primary/20 dark:border-primary/60 bg-primary/[0.07] dark:bg-primary/50 px-2.5 py-1 text-[11px] font-semibold text-foreground/75 dark:text-primary-foreground">
                        {answer.pointsEarned}/{answer.pointsPossible} pts
                      </span>
                    </div>
                    <p className="mt-2 text-sm font-medium text-foreground">
                      {answer.questionText}
                    </p>

                    {(() => {
                      const question = quizData.questions.find(
                        (item) => item.id === answer.questionId
                      );
                      const options = question ? getQuestionOptions(question) : [];

                      if (!options.length) {
                        return (
                          <p className="mt-3 text-sm text-foreground/65">
                            No predefined options for this question.
                          </p>
                        );
                      }

                      return (
                        <div className="mt-3 grid gap-2">
                          {options.map((option, optionIndex) => {
                            const isCorrectOption = option === answer.correctAnswer;
                            const isIncorrectSelected =
                              option === answer.userAnswer && option !== answer.correctAnswer;

                            return (
                              <div
                                key={option}
                                className={`rounded-md border px-3 py-2 text-sm ${
                                  isCorrectOption
                                    ? "border-primary bg-primary/15 text-foreground"
                                    : isIncorrectSelected
                                    ? "border-red-500/35 bg-red-500/10 text-foreground"
                                    : "border-muted-foreground/20 dark:border-border bg-muted dark:bg-muted/70 text-foreground/80"
                                }`}
                              >
                                <span className="font-medium text-foreground/75">
                                  {getOptionPrefix(optionIndex)}
                                </span>{" "}
                                <span>{option}</span>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })()}

                    <div className="mt-6 rounded-md border border-muted-foreground/20 dark:border-border bg-accent dark:bg-background px-3 py-2">
                      <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
                        Explanation
                      </p>
                      <p className="mt-1 text-sm text-foreground/80">
                        {answer.explanation || "No explanation available for this question."}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {quizData.canTakeQuiz ? (
                <button
                  type="button"
                  onClick={() => {
                    void handleStartQuizAttempt();
                  }}
                  className="rounded-md border cursor-pointer border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
                >
                  Try again
                </button>
              ) : (
                <p className="text-xs text-foreground/60">No attempts remaining.</p>
              )}
            </div>
          ) : quizAttemptId && activeQuestion ? (
            <div className="space-y-5 rounded-lg border border-border bg-background dark:bg-muted/20 p-4">
              <div className="flex items-center justify-between text-sm font-semibold text-foreground/75">
                <span>
                  Question {currentQuestionIndex + 1} of {quizData.questions.length}
                </span>
                <span className="rounded-full border border-primary/20 dark:border-primary/60 bg-primary/[0.07] dark:bg-primary/50 px-2.5 py-1 text-[11px] font-semibold text-foreground/75 dark:text-primary-foreground">
                  {activeQuestionPoints} pts
                </span>
              </div>

              <p className="text-lg font-medium text-foreground">{activeQuestion.questionText}</p>

              {activeQuestion.questionType === "SHORT_ANSWER" ? (
                <input
                  value={quizAnswers[activeQuestion.id] ?? ""}
                  onChange={(event) =>
                    handleQuizAnswerChange(activeQuestion.id, event.target.value)
                  }
                  className="w-full rounded-lg border border-border bg-muted/25 px-3 py-2.5 text-sm text-foreground outline-none transition-colors focus:border-primary focus:bg-background"
                  placeholder="Type your answer"
                />
              ) : activeQuestionOptions.length > 0 ? (
                <div className="grid gap-2">
                  {activeQuestionOptions.map((option, optionIndex) => {
                    const selected = quizAnswers[activeQuestion.id] === option;
                    return (
                      <button
                        key={option}
                        type="button"
                        onClick={() => handleQuizAnswerChange(activeQuestion.id, option)}
                        className={`rounded-lg cursor-pointer border px-3.5 py-2.5 text-left text-sm transition-colors ${
                          selected
                            ? "border-primary bg-primary/15 text-foreground"
                            : "border-muted-foreground/20 dark:border-border bg-muted dark:bg-muted/20 text-foreground/85 hover:bg-muted"
                        }`}
                      >
                        <span className="font-medium text-foreground/75">
                          {getOptionPrefix(optionIndex)}
                        </span>{" "}
                        <span>{option}</span>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-foreground/65">
                  No options available for this question.
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setCurrentQuestionIndex((previous) => Math.max(previous - 1, 0))}
                  disabled={quizSubmitting || currentQuestionIndex === 0}
                  className="rounded-md cursor-pointer border border-border bg-muted dark:bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Previous
                </button>

                <p className="text-xs font-light text-foreground/60">
                  {answeredCount} of {quizData.questions.length} answered
                </p>

                {isLastQuestion ? (
                  <button
                    type="button"
                    onClick={() => {
                      void handleSubmitQuizAttempt();
                    }}
                    disabled={quizSubmitting}
                    className="rounded-md bg-primary px-3 cursor-pointer py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {quizSubmitting ? "Submitting..." : "Submit Quiz"}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentQuestionIndex((previous) =>
                        Math.min(previous + 1, quizData.questions.length - 1)
                      )
                    }
                    className="rounded-md cursor-pointer bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  >
                    Next
                  </button>
                )}
              </div>
            </div>
          ) : quizResult ? (
            <div className="space-y-3">
              <h4 className="text-lg font-semibold text-foreground">
                Quiz submitted automatically
              </h4>
              <p className="text-sm text-foreground/75">
                Your answers were submitted because the timer ended.
              </p>
              <button
                type="button"
                onClick={handleViewResultsAfterTimeout}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                View Results
              </button>
            </div>
          ) : quizData.canTakeQuiz ? (
            <div className="gap-4 flex flex-col text-center items-center">
              <h4 className="text-2xl font-light text-foreground">
                Ready to test your knowledge on &quot;{quizData.quiz.title}&quot;?
              </h4>
              <p className="text-base text-foreground/70">
                Start when you are ready. Questions will appear one at a time.
              </p>
              <button
                type="button"
                onClick={() => {
                  void handleStartQuizAttempt();
                }}
                className="mt-4 rounded-md cursor-pointer bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Start Quiz
              </button>
            </div>
          ) : (
            <div className="text-sm text-foreground/75">
              You have no remaining quiz attempts for this lesson.
            </div>
          )}
        </div>

        {quizData.previousAttempts.length > 0 ? (
          <div className="rounded-xl border border-border bg-muted/10 p-4 sm:p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-foreground/60">
              Previous attempts
            </p>
            <div className="mt-3 space-y-2">
              {quizData.previousAttempts.map((attempt) => (
                <div
                  key={attempt.id}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border bg-background px-3 py-2 text-xs"
                >
                  <span className="text-foreground/80">Attempt #{attempt.attemptNumber}</span>
                  <span className="text-foreground/75">Score {attempt.score}%</span>
                  <span
                    className={
                      attempt.passed
                        ? "text-emerald-600 dark:text-emerald-300"
                        : "text-red-600 dark:text-red-300"
                    }
                  >
                    {attempt.passed ? "Passed" : "Failed"}
                  </span>
                  <span className="text-foreground/60">{formatTimeSpent(attempt.timeSpent)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      {isTimeoutDialogOpen ? (
        <div className="fixed inset-0 z-[70] flex items-center justify-center backdrop-blur-sm bg-black/45 p-4 sm:p-6 lg:p-8">
          <div className="w-full max-w-sm rounded-xl border border-border bg-background p-4 shadow-xl">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h4 className="text-base font-semibold text-foreground">Time&apos;s Up!</h4>
                <p className="mt-1 text-sm text-foreground/75">
                  The time limit for this quiz has been reached. Your answers will be submitted
                  automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsTimeoutDialogOpen(false)}
                className="inline-flex rounded-md border border-border bg-background p-1.5 text-foreground transition-colors hover:bg-muted"
                aria-label="Close timeout dialog"
              >
                <HiXMark className="size-4" />
              </button>
            </div>

            <div className="mt-4 flex items-center justify-end gap-4">
              <button
                type="button"
                onClick={() => setIsTimeoutDialogOpen(false)}
                className="rounded-md border border-border bg-background px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-muted"
              >
                Close
              </button>
              <button
                type="button"
                onClick={handleViewResultsAfterTimeout}
                className="rounded-md bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                View Results
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
