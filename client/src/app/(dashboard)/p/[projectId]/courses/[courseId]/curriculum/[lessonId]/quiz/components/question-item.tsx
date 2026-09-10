"use client";

import { useState, useEffect, useRef } from "react";
import { Edit, Trash2, Loader2 } from "lucide-react";
import { GiCheckMark } from "react-icons/gi";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  type Question,
  type QuestionType,
  type CreateQuestionInput,
} from "@/lib/api";
import { AnswerInput } from "./answer-input";
import { MdOutlineAddBox } from "react-icons/md";

interface QuestionItemProps {
  question: Question;
  questionNumber: number;
  onSave: (questionId: string, data: CreateQuestionInput) => Promise<void>;
  onDelete: () => void;
  onChange?: (questionId: string, updates: Partial<Question>) => void;
  isSaving: boolean;
  isDeleting: boolean;
}

export function QuestionItem({
  question,
  questionNumber,
  onSave,
  onDelete,
  onChange,
  isSaving,
  isDeleting,
}: QuestionItemProps) {
  const [isEditing, setIsEditing] = useState(question.id.startsWith("temp-"));
  const [questionText, setQuestionText] = useState(question.questionText);
  const [questionType, setQuestionType] = useState<QuestionType>(
    question.questionType
  );
  const [answers, setAnswers] = useState<string[]>(
    question.options ||
      (questionType === "MULTIPLE_CHOICE" ? ["", "", "", ""] : [])
  );
  const [correctAnswerIndices, setCorrectAnswerIndices] = useState<number[]>(
    []
  );
  const [explanation, setExplanation] = useState(question.explanation || "");
  const [points, setPoints] = useState(question.points);
  const [questionError, setQuestionError] = useState("");
  const [answerError, setAnswerError] = useState("");

  // Initialize correct answer indices from question
  useEffect(() => {
    if (question.correctAnswer && question.options) {
      // Support multiple correct answers separated by ||
      const correctAnswers = question.correctAnswer
        .split("||")
        .map((a) => a.trim());
      const indices = correctAnswers
        .map((ca) => question.options!.indexOf(ca))
        .filter((i) => i !== -1);
      setCorrectAnswerIndices(indices.length > 0 ? indices : []);
    } else if (question.correctAnswer === "True") {
      setCorrectAnswerIndices([0]);
    } else if (question.correctAnswer === "False") {
      setCorrectAnswerIndices([1]);
    }
  }, [question.correctAnswer, question.options]);

  // Track previous question ID to detect when it changes from temp to real
  const prevQuestionIdRef = useRef(question.id);

  // Switch to view mode only when question ID changes from temp to real (after save)
  useEffect(() => {
    const prevId = prevQuestionIdRef.current;
    const currentId = question.id;

    // Only switch to view mode if the ID changed from temp to real
    if (prevId.startsWith("temp-") && !currentId.startsWith("temp-")) {
      setIsEditing(false);
    }

    prevQuestionIdRef.current = currentId;
  }, [question.id]);

  // Update answers array when question type changes
  useEffect(() => {
    if (questionType === "MULTIPLE_CHOICE") {
      // Check if current answers are from TRUE_FALSE
      const isTrueFalseFormat =
        answers.length === 2 && answers[0] === "True" && answers[1] === "False";
      if (answers.length === 0 || isTrueFalseFormat) {
        setAnswers(["", "", "", ""]);
        setCorrectAnswerIndices([]);
      }
    } else if (questionType === "TRUE_FALSE") {
      setAnswers(["True", "False"]);
      if (
        correctAnswerIndices.length === 0 ||
        correctAnswerIndices.some((i) => i > 1)
      ) {
        setCorrectAnswerIndices([0]);
      }
    } else if (questionType === "SHORT_ANSWER") {
      setAnswers([]);
      setCorrectAnswerIndices([]);
    }

    // Clear answer error when question type changes
    setAnswerError("");
  }, [questionType]);

  const handleAddAnswer = () => {
    setAnswers([...answers, ""]);
  };

  const handleUpdateAnswer = (index: number, value: string) => {
    const updated = [...answers];
    updated[index] = value;
    setAnswers(updated);

    // Notify parent of changes
    if (onChange) {
      onChange(question.id, { options: updated });
    }
  };

  const handleDeleteAnswer = (index: number) => {
    const updated = answers.filter((_, i) => i !== index);
    setAnswers(updated);

    // Update correct answer indices
    setCorrectAnswerIndices(
      (prev) =>
        prev
          .filter((i) => i !== index) // Remove the deleted index
          .map((i) => (i > index ? i - 1 : i)) // Adjust indices after the deleted one
    );
  };

  const handleToggleCorrect = (index: number) => {
    if (questionType === "TRUE_FALSE") {
      // For TRUE_FALSE, only allow single selection
      setCorrectAnswerIndices([index]);
      if (onChange) {
        onChange(question.id, { correctAnswer: answers[index] });
      }
    } else {
      // For MCQ, allow multiple selections (toggle behavior)
      setCorrectAnswerIndices((prev) => {
        const newIndices = prev.includes(index)
          ? prev.filter((i) => i !== index) // Remove if already selected
          : [...prev, index]; // Add if not selected

        // Notify parent of changes - store as || separated string
        if (onChange) {
          const correctAnswersStr = newIndices
            .map((i) => answers[i])
            .filter(Boolean)
            .join("||");
          onChange(question.id, { correctAnswer: correctAnswersStr });
        }

        return newIndices;
      });
    }
    setAnswerError(""); // Clear error when user selects an answer
  };

  const handleSave = async () => {
    // Reset errors
    setQuestionError("");
    setAnswerError("");

    let hasError = false;

    // Validation
    if (!questionText.trim()) {
      setQuestionError("Question is required.");
      hasError = true;
    }

    if (questionType === "MULTIPLE_CHOICE") {
      const filledAnswers = answers.filter((a) => a.trim());
      if (filledAnswers.length < 2) {
        setAnswerError("Please provide at least 2 answer options.");
        hasError = true;
      } else if (
        correctAnswerIndices.length === 0 ||
        !correctAnswerIndices.some((i) => answers[i]?.trim())
      ) {
        setAnswerError("At least one correct answer is required.");
        hasError = true;
      }
    } else if (questionType === "TRUE_FALSE") {
      if (correctAnswerIndices.length === 0) {
        setAnswerError("A correct answer is required.");
        hasError = true;
      }
    } else if (questionType === "SHORT_ANSWER") {
      if (!answers[0]?.trim()) {
        setAnswerError("An expected answer is required.");
        hasError = true;
      }
    }

    if (hasError) return;

    // Build correct answer string (multiple answers separated by || for MCQ)
    const correctAnswerValue =
      questionType === "SHORT_ANSWER"
        ? answers[0] || ""
        : correctAnswerIndices
            .map((i) => answers[i])
            .filter(Boolean)
            .join("||");

    const questionData: CreateQuestionInput = {
      questionText: questionText.trim(),
      questionType,
      options:
        questionType === "MULTIPLE_CHOICE"
          ? answers.filter((a) => a.trim())
          : questionType === "TRUE_FALSE"
          ? ["True", "False"]
          : undefined,
      correctAnswer: correctAnswerValue,
      explanation: explanation.trim() || undefined,
      points,
    };

    await onSave(question.id, questionData);
    setIsEditing(false);
  };

  // View Mode
  if (!isEditing) {
    const displayAnswers =
      questionType === "SHORT_ANSWER" ? [question.correctAnswer] : answers;
    // Parse correct answers (support multiple separated by ||)
    const correctAnswersList =
      question.correctAnswer?.split("||").map((a) => a.trim()) || [];

    return (
      <div className="rounded-md border border-neutral-300 bg-white">
        <div className="flex items-start justify-between px-5 py-4 bg-neutral-100 rounded-t-md">
          <span className="text-[1.1rem] font-lilita uppercase font-semibold text-foreground/80">
            Question {questionNumber}
          </span>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsEditing(true)}
              disabled={isDeleting}
              className="text-sm text-foreground/90 font-semibold underline hover:text-foreground/70 cursor-pointer disabled:opacity-50"
            >
              Edit
            </button>
            <Button
              onClick={onDelete}
              disabled={isDeleting}
              variant="ghost"
              size="icon"
              className="size-8 text-foreground hover:text-foreground hover:bg-neutral-100 cursor-pointer"
            >
              {isDeleting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Trash2 className="size-4" />
              )}
            </Button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-4">
          <p className="text-foreground font-semibold mb-3">{questionText}</p>

          <div className="space-y-2">
            {questionType === "MULTIPLE_CHOICE" && (
              <div className="space-y-1.5">
                {displayAnswers.map((answer, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {correctAnswersList.includes(answer) ? (
                      <GiCheckMark className="size-3.5 text-foreground flex-shrink-0" />
                    ) : (
                      <div className="size-3.5 flex-shrink-0" />
                    )}
                    <span className="text-[1rem] text-foreground/80">
                      {answer}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {questionType === "TRUE_FALSE" && (
              <div className="space-y-1.5">
                {["True", "False"].map((option) => (
                  <div key={option} className="flex items-center gap-2">
                    {correctAnswersList.includes(option) ? (
                      <GiCheckMark className="size-3.5 text-foreground flex-shrink-0" />
                    ) : (
                      <div className="size-3.5 flex-shrink-0" />
                    )}
                    <span className="text-sm text-foreground/80">{option}</span>
                  </div>
                ))}
              </div>
            )}
            {questionType === "SHORT_ANSWER" && (
              <div className="flex items-center gap-2">
                <GiCheckMark className="size-3.5 text-foreground flex-shrink-0" />
                <span className="text-sm text-foreground/80">
                  {question.correctAnswer}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Edit Mode
  return (
    <div className="rounded-md border border-neutral-300 bg-white">
      {/* Question Header */}
      <div className="flex items-start justify-between px-5 py-4 bg-neutral-100 rounded-t-md">
        <span className="text-lg font-semibold text-foreground/80">
          Question {questionNumber}
        </span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-sm text-foreground font-semibold underline hover:text-foreground/70 cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {isSaving ? <Loader2 className="size-3 animate-spin" /> : null}
            Done
          </button>
          <Button
            onClick={onDelete}
            disabled={isDeleting}
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-foreground/70 hover:text-foreground hover:bg-neutral-100 cursor-pointer"
          >
            {isDeleting ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Trash2 className="size-4" />
            )}
          </Button>
        </div>
      </div>

      <div className="px-5 pb-5 pt-4 space-y-6">
        {/* Question Type - Flex Row */}
        <div className="flex items-center gap-3">
          <label className="text-sm font-semibold font-noto text-foreground whitespace-nowrap">
            Question Type
          </label>
          <Select
            value={questionType}
            onValueChange={(value: string) =>
              setQuestionType(value as QuestionType)
            }
          >
            <SelectTrigger className="w-48 border-neutral-300 rounded-sm shadow-none">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="MULTIPLE_CHOICE" className="hover:text-white">
                Multiple Choice
              </SelectItem>
              <SelectItem value="TRUE_FALSE" className="hover:text-white">
                True/False
              </SelectItem>
              {/* <SelectItem value='SHORT_ANSWER'>Short Answer</SelectItem> */}
            </SelectContent>
          </Select>
        </div>

        {/* Question Text */}
        <div className="space-y-2">
          <label className="text-base font-medium text-foreground">
            Question <span className="text-destructive">*</span>
          </label>
          {questionError && (
            <p className="text-sm text-destructive">{questionError}</p>
          )}
          <Textarea
            value={questionText}
            onChange={(e) => {
              const newValue = e.target.value;
              setQuestionText(newValue);
              setQuestionError("");

              // Notify parent of changes
              if (onChange) {
                onChange(question.id, { questionText: newValue });
              }
            }}
            placeholder="Write your question here..."
            className="border-neutral-300 rounded-sm shadow-none py-2 mt-1 min-h-[40px]"
            rows={2}
          />
        </div>

        <div className="pt-3">
          {/* Multiple Choice Answers */}
          {questionType === "MULTIPLE_CHOICE" && (
            <div className="space-y-3">
              <label className="text-base font-medium text-foreground">
                Answers <br />{" "}
                <span className="text-xs text-foreground/50 ">
                  {" "}
                  (choose one or more correct answers)
                </span>
              </label>
              {answerError && (
                <p className="text-sm text-destructive">{answerError}</p>
              )}

              {answers.map((answer, index) => (
                <AnswerInput
                  key={index}
                  value={answer}
                  isCorrect={correctAnswerIndices.includes(index)}
                  onValueChange={(value) => handleUpdateAnswer(index, value)}
                  onToggleCorrect={() => handleToggleCorrect(index)}
                  onDelete={() => handleDeleteAnswer(index)}
                  canDelete={answers.length > 2}
                  answerNumber={index + 1}
                />
              ))}

              <Button
                onClick={handleAddAnswer}
                variant="outline"
                size="sm"
                className="w-full flex justify-center hover:text-foreground items-center mt-3 gap-2 py-5 cursor-pointer"
              >
                <MdOutlineAddBox className=" size-5" />
                Add Answer
              </Button>
            </div>
          )}

          {/* True/False Answers */}
          {questionType === "TRUE_FALSE" && (
            <div className="space-y-3">
              <label className="text-sm font-medium text-foreground">
                Select the correct answer
              </label>
              {answerError && (
                <p className="text-sm text-destructive">{answerError}</p>
              )}
              <div className="space-y-3">
                <AnswerInput
                  value="True"
                  isCorrect={correctAnswerIndices.includes(0)}
                  onValueChange={() => {}}
                  onToggleCorrect={() => {
                    setCorrectAnswerIndices([0]);
                    setAnswerError("");
                  }}
                  onDelete={() => {}}
                  canDelete={false}
                  readOnly
                  answerNumber={1}
                />
                <AnswerInput
                  value="False"
                  isCorrect={correctAnswerIndices.includes(1)}
                  onValueChange={() => {}}
                  onToggleCorrect={() => {
                    setCorrectAnswerIndices([1]);
                    setAnswerError("");
                  }}
                  onDelete={() => {}}
                  canDelete={false}
                  readOnly
                  answerNumber={2}
                />
              </div>
            </div>
          )}

          {/* Short Answer */}
          {questionType === "SHORT_ANSWER" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">
                Expected Answer{" "}
                <span className="text-xs text-destructive">*</span>
              </label>
              {answerError && (
                <p className="text-sm text-destructive">{answerError}</p>
              )}
              <Input
                value={answers[0] || ""}
                onChange={(e) => {
                  const newValue = e.target.value;
                  const updated = [newValue];
                  setAnswers(updated);
                  setAnswerError("");

                  // Notify parent of changes
                  if (onChange) {
                    onChange(question.id, { correctAnswer: newValue });
                  }
                }}
                placeholder="Enter the expected answer..."
                className="border-neutral-300 rounded-sm shadow-none py-2 mt-1"
              />
              <p className="text-xs text-foreground/60">
                This will be used to compare with student responses
              </p>
            </div>
          )}
        </div>

        {/* Explanation and Points */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Explanation{" "}
              <span className="text-xs text-foreground/50"> (Optional)</span>
            </label>
            <Textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              placeholder="Explain the correct answer..."
              className="border-neutral-300 rounded-sm shadow-none py-2 mt-1 min-h-[60px]"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <label className="text-base font-medium text-foreground">
              Points
            </label>
            <Input
              type="number"
              min="1"
              value={points}
              onChange={(e) => setPoints(Number(e.target.value))}
              className="border-neutral-300 rounded-sm shadow-none py-2 mt-1"
            />
          </div>
        </div>

        {/* Done button at bottom-right */}
        <div className="flex justify-end pt-4">
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="text-sm text-foreground font-semibold underline hover:text-foreground/70 cursor-pointer disabled:opacity-50 flex items-center gap-1"
          >
            {isSaving ? <Loader2 className="size-3 animate-spin" /> : null}
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
