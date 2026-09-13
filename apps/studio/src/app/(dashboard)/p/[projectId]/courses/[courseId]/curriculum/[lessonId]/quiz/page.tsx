'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { ArrowLeft, Settings } from 'lucide-react'
import { RiSparkling2Fill } from 'react-icons/ri'
import { useQueryClient } from '@tanstack/react-query'

import { useCourse } from '@/lib/hooks/use-courses'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import { usePreviewStorage } from '@/lib/hooks/use-preview-storage'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import {
    getQuiz,
    createQuiz,
    updateQuiz,
    createQuestion,
    generateQuizWithAI,
    type Quiz,
    type Question,
    type GenerateQuizOptions,
} from '@/lib/api'
import { QuestionCard } from './components/question-card'
import { QuizDetailsPanel } from './components/quiz-details-panel'
import { QuizDetailsDialog } from './components/quiz-details-dialog'
import { GenerateQuizDialog } from './components/generate-quiz-dialog'
import { AIQuizPreviewModal } from './components/ai-quiz-preview-modal'
import { QuizSkeleton } from './components/quiz-skeleton'

export default function QuizEditorPage() {
    const projectId = useProjectRouteId()
    const params = useParams()
    const router = useRouter()
    const queryClient = useQueryClient()
    const { toast } = useToast()

    const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
    const lessonId = typeof params?.lessonId === 'string' ? params.lessonId : ''

    const { data: course } = useCourse(projectId, courseId)

    const [quiz, setQuiz] = useState<Quiz | null>(null)
    const [isLoadingQuiz, setIsLoadingQuiz] = useState(true)
    const [quizTitle, setQuizTitle] = useState('')
    const [quizDescription, setQuizDescription] = useState('')
    const [passingScore, setPassingScore] = useState(70)
    const [maxAttempts, setMaxAttempts] = useState<number | ''>('')
    const [timeLimit, setTimeLimit] = useState<number | ''>('')
    const [questions, setQuestions] = useState<Question[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [isQuizDetailsOpen, setIsQuizDetailsOpen] = useState(false)
    const [isGenerateDialogOpen, setIsGenerateDialogOpen] = useState(false)
    const [isPreviewOpen, setIsPreviewOpen] = useState(false)
    const [isGenerating, setIsGenerating] = useState(false)
    const [isCreating, setIsCreating] = useState(false)

    // AI generation state
    const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([])
    const [lastGenerationOptions, setLastGenerationOptions] = useState<GenerateQuizOptions | null>(null)

    // Preview storage for persistence
    const previewStorage = usePreviewStorage<{
        questions: Question[]
        options: GenerateQuizOptions
        quizTitle: string
        quizDescription: string
        courseId: string
        lessonId: string
    }>({
        key: `quiz-${projectId}-${courseId}-${lessonId}`,
        expirationMinutes: 60, // 1 hour expiration
    })

    // Find current lesson
    const currentModule = course?.modules?.find((m) =>
        m.lessons.some((l) => l.id === lessonId)
    )
    const currentLesson = currentModule?.lessons?.find((l) => l.id === lessonId)
    const isMockTestLesson = currentLesson?.contentType === 'MOCK_TEST'

    // Load quiz data
    useEffect(() => {
        const loadQuiz = async () => {
            if (!projectId || !courseId || !currentModule?.id || !lessonId) return

            try {
                setIsLoadingQuiz(true)
                const quizData = await getQuiz(projectId, courseId, currentModule.id, lessonId)

                if (quizData) {
                    setQuiz(quizData)
                    setQuizTitle(quizData.title)
                    setQuizDescription(quizData.description || '')
                    setPassingScore(quizData.passingScore)
                    setMaxAttempts(quizData.maxAttempts || '')
                    setTimeLimit(quizData.timeLimit || '')
                    setQuestions(quizData.questions || [])
                }
                // Note: Default title will be set after currentLesson is available
            } catch (error) {
                console.error('Failed to load quiz:', error)
                toast({
                    title: 'Error',
                    description: 'Failed to load quiz data.',
                    variant: 'destructive',
                })
            } finally {
                setIsLoadingQuiz(false)
            }
        }

        loadQuiz()
    }, [projectId, courseId, currentModule?.id, lessonId, toast])

    // Set default title when lesson is loaded and no quiz exists
    useEffect(() => {
        if (!quiz && !isLoadingQuiz && currentLesson && !quizTitle) {
            setQuizTitle(
                `${currentLesson.title} ${isMockTestLesson ? 'Mock Test' : 'Quiz'}`
            )
        }
    }, [quiz, isLoadingQuiz, currentLesson, quizTitle, isMockTestLesson])

    // Restore preview data from storage on mount
    useEffect(() => {
        if (previewStorage.isHydrated && previewStorage.hasPreview()) {
            const storedData = previewStorage.getPreviewData()
            if (storedData && 
                storedData.courseId === courseId && 
                storedData.lessonId === lessonId) {
                // Restore the preview state
                setGeneratedQuestions(storedData.questions)
                setLastGenerationOptions(storedData.options)
                if (storedData.quizTitle) setQuizTitle(storedData.quizTitle)
                if (storedData.quizDescription) setQuizDescription(storedData.quizDescription)
                setIsPreviewOpen(true)
                
                toast({
                    title: 'Quiz Preview Restored',
                    description: 'Your previously generated quiz preview has been restored.',
                })
            }
        }
    }, [previewStorage.isHydrated, courseId, lessonId])

    const handleSaveQuizDetails = async () => {
        if (!projectId || !courseId || !currentModule?.id || !lessonId) return

        try {
            setIsSaving(true)

            const lessonTitle = currentLesson?.title || currentModule?.title || 'Lesson'
            const quizData = {
                title: quizTitle.trim() || `${lessonTitle} ${isMockTestLesson ? 'Mock Test' : 'Quiz'}`,
                description:
                    quizDescription.trim() ||
                    `Assess your knowledge of ${lessonTitle} with this ${isMockTestLesson ? 'mock test' : 'quiz'}.`,
                passingScore: passingScore || 70,
                maxAttempts: maxAttempts || undefined,
                timeLimit: timeLimit || undefined,
                isMockTest: isMockTestLesson,
            }

            if (quiz) {
                // Update existing quiz
                await updateQuiz(projectId, courseId, currentModule.id, lessonId, quizData)
                toast({
                    title: 'Details saved',
                    description: `${isMockTestLesson ? 'Mock test' : 'Quiz'} details have been updated.`,
                })
            } else {
                // Create new quiz
                const newQuiz = await createQuiz(projectId, courseId, currentModule.id, lessonId, quizData)
                setQuiz(newQuiz)
                toast({
                    title: isMockTestLesson ? 'Mock test created' : 'Quiz created',
                    description: `${isMockTestLesson ? 'Mock test' : 'Quiz'} details have been saved.`,
                })
            }

            // Refresh course data
            await queryClient.invalidateQueries({
                queryKey: ['project-course', projectId, courseId],
            })

            // Close dialog on mobile
            setIsQuizDetailsOpen(false)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save quiz details'
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    const handleBackToLesson = () => {
        router.push(`/p/${projectId}/courses/${courseId}/curriculum/${lessonId}`)
    }

    const handleCancel = () => {
        router.push(`/p/${projectId}/courses/${courseId}/curriculum/${lessonId}`)
    }

    const handleQuestionsUpdate = (updatedQuestions: Question[]) => {
        setQuestions(updatedQuestions)
    }

    const handleSaveQuiz = async () => {
        if (!projectId || !courseId || !currentModule?.id || !lessonId) return

        try {
            setIsSaving(true)

            const lessonTitle = currentLesson?.title || 'Lesson'
            const quizData = {
                title: quizTitle.trim() || `${lessonTitle} ${isMockTestLesson ? 'Mock Test' : 'Quiz'}`,
                description: quizDescription.trim() || undefined,
                passingScore: passingScore || 70,
                maxAttempts: maxAttempts || undefined,
                timeLimit: timeLimit || undefined,
                isMockTest: isMockTestLesson,
            }

            let currentQuiz = quiz

            // Create or update quiz
            if (quiz) {
                await updateQuiz(projectId, courseId, currentModule.id, lessonId, quizData)
            } else {
                currentQuiz = await createQuiz(projectId, courseId, currentModule.id, lessonId, quizData)
                setQuiz(currentQuiz)
            }

            // Save any incomplete temp questions that are complete
            const tempQuestions = questions.filter(q => q.id.startsWith('temp-'))
            for (const tempQuestion of tempQuestions) {
                // Check if the question is complete enough to save
                const hasQuestionText = tempQuestion.questionText?.trim()
                const hasCorrectAnswer = tempQuestion.correctAnswer?.trim()

                if (hasQuestionText && hasCorrectAnswer) {
                    try {
                        const questionData = {
                            questionText: tempQuestion.questionText.trim(),
                            questionType: tempQuestion.questionType,
                            options: tempQuestion.options?.filter(o => o?.trim()) || undefined,
                            correctAnswer: tempQuestion.correctAnswer,
                            explanation: tempQuestion.explanation?.trim() || undefined,
                            points: tempQuestion.points || 1,
                        }

                        const newQuestion = await createQuestion(
                            projectId,
                            courseId,
                            currentModule.id,
                            lessonId,
                            questionData
                        )

                        // Update the questions array with the saved question
                        setQuestions(prev => prev.map(q =>
                            q.id === tempQuestion.id ? newQuestion : q
                        ))
                    } catch (error) {
                        console.error('Failed to save question:', error)
                    }
                }
            }

            // Refresh course data
            await queryClient.invalidateQueries({
                queryKey: ['project-course', projectId, courseId],
            })

            toast({
                title: isMockTestLesson ? 'Mock test saved' : 'Quiz saved',
                description: `Your ${isMockTestLesson ? 'mock test' : 'quiz'} has been saved successfully.`,
            })

            // Navigate back to lesson
            router.push(`/p/${projectId}/courses/${courseId}/curriculum/${lessonId}`)
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to save quiz'
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsSaving(false)
        }
    }

    // Handle generating quiz preview
    const handleGeneratePreview = async (options: GenerateQuizOptions) => {
        if (!projectId || !courseId || !currentModule?.id || !lessonId) return

        try {
            setIsGenerating(true)
            setIsGenerateDialogOpen(false)
            setGeneratedQuestions([])
            setIsPreviewOpen(true)

            // Store options for potential regeneration
            setLastGenerationOptions(options)

            // Generate quiz questions
            const result = await generateQuizWithAI(
                projectId,
                courseId,
                currentModule.id,
                lessonId,
                options
            )

            if (result.questions && result.questions.length > 0) {
                // Store generated questions in state
                setGeneratedQuestions(result.questions)

                // Save to localStorage for persistence
                previewStorage.savePreview({
                    questions: result.questions,
                    options,
                    quizTitle,
                    quizDescription,
                    courseId,
                    lessonId,
                })
            } else {
                setIsPreviewOpen(false)
                toast({
                    title: 'No questions generated',
                    description: 'The AI could not generate questions. Please try again with a different description.',
                    variant: 'destructive',
                })
            }
        } catch (error) {
            setIsPreviewOpen(false)
            const message = error instanceof Error ? error.message : 'Failed to generate quiz'
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsGenerating(false)
        }
    }

    // Handle regeneration with same parameters
    const handleRegenerateQuiz = async () => {
        if (!projectId || !courseId || !currentModule?.id || !lessonId || !lastGenerationOptions) return

        try {
            setIsGenerating(true)

            const result = await generateQuizWithAI(
                projectId,
                courseId,
                currentModule.id,
                lessonId,
                lastGenerationOptions
            )

            if (result.questions && result.questions.length > 0) {
                setGeneratedQuestions(result.questions)
                
                // Update stored preview
                previewStorage.savePreview({
                    questions: result.questions,
                    options: lastGenerationOptions,
                    quizTitle,
                    quizDescription,
                    courseId,
                    lessonId,
                })
            } else {
                toast({
                    title: 'No questions generated',
                    description: 'The AI could not generate questions. Please try again with a different description.',
                    variant: 'destructive',
                })
            }
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to regenerate quiz'
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsGenerating(false)
        }
    }

    // Handle confirming and adding questions to quiz
    const handleConfirmQuiz = async () => {
        if (!projectId || !courseId || !currentModule?.id || !lessonId || generatedQuestions.length === 0) return

        try {
            setIsCreating(true)

            // Create quiz first if it doesn't exist
            let currentQuiz = quiz
            if (!currentQuiz) {
                const lessonTitle = currentLesson?.title || 'Lesson'
                currentQuiz = await createQuiz(projectId, courseId, currentModule.id, lessonId, {
                    title: quizTitle.trim() || `${lessonTitle} ${isMockTestLesson ? 'Mock Test' : 'Quiz'}`,
                    passingScore: 70,
                    isMockTest: isMockTestLesson,
                })
                setQuiz(currentQuiz)
            }

            // Save generated questions to the backend
            const savedQuestions: Question[] = []
            
            for (const generatedQuestion of generatedQuestions) {
                try {
                    const questionData = {
                        questionText: generatedQuestion.questionText,
                        questionType: generatedQuestion.questionType,
                        options: generatedQuestion.options || undefined,
                        correctAnswer: generatedQuestion.correctAnswer,
                        explanation: generatedQuestion.explanation || undefined,
                        points: generatedQuestion.points || 1,
                    }

                    const savedQuestion = await createQuestion(
                        projectId,
                        courseId,
                        currentModule.id,
                        lessonId,
                        questionData
                    )
                    savedQuestions.push(savedQuestion)
                } catch (error) {
                    console.error('Failed to save generated question:', error)
                }
            }

            // Close preview modal and clear state
            setIsPreviewOpen(false)
            setGeneratedQuestions([])
            setLastGenerationOptions(null)
            previewStorage.clearPreview()

            // Update questions state with saved questions
            setQuestions(prev => [...prev, ...savedQuestions])

            toast({
                title: isMockTestLesson ? 'Mock Test Generated' : 'Quiz Generated',
                description: `Successfully added ${savedQuestions.length} questions to your ${isMockTestLesson ? 'mock test' : 'quiz'}.`,
            })

            // Refresh course data
            await queryClient.invalidateQueries({
                queryKey: ['project-course', projectId, courseId],
            })
        } catch (error) {
            const message = error instanceof Error ? error.message : 'Failed to add questions'
            toast({
                title: 'Error',
                description: message,
                variant: 'destructive',
            })
        } finally {
            setIsCreating(false)
        }
    }

    // Handle closing preview modal
    const handleClosePreview = () => {
        setIsPreviewOpen(false)
        // Don't clear storage here - user might want to restore later
        // Storage will auto-expire after 60 minutes
    }

    if (!projectId || !courseId || !lessonId) {
        return (
            <div className='rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive'>
                Missing information. Please navigate from the lesson page.
            </div>
        )
    }

    if (isLoadingQuiz) {
        return <QuizSkeleton />
    }

    return (
        <div className='min-h-scree'>
            <div className='max-w-7xl mx-auto'>
                {/* Header */}
                <div className='rounded-md border border-neutral-300 bg-white p-5 mb-10'>
                    <div className='flex lg:flex-row flex-col lg:items-center justify-between gap-4'>
                        <div>
                            <div className='flex items-center gap-3'>
                                <button
                                    onClick={handleBackToLesson}
                                    className='flex items-center gap-1.5 text-sm text-foreground/80 hover:text-foreground transition-colors cursor-pointer'
                                >
                                    <ArrowLeft className='size-4' />
                                    Back to Lesson
                                </button>
                            </div>
                            <h1 className='text-2xl font-semibold mt-3'>
                                {isMockTestLesson ? 'Create Mock Test' : 'Create Quiz'}
                            </h1>
                            <p className='text-sm text-foreground font-literata mt-1'>
                                {currentModule?.title || 'Lesson'} {isMockTestLesson ? 'Mock Test' : 'Quiz'}
                            </p>
                        </div>
                        <div className='flex items-center gap-3'>
                            <Button
                                onClick={() => setIsQuizDetailsOpen(true)}
                                variant='outline'
                                className='xl:hidden cursor-pointer flex items-center lg:py-6 gap-2 hover:text-foreground'
                            >
                                <Settings className='size-4' />
                                Quiz Settings
                            </Button>
                            <Button
                                onClick={() => setIsGenerateDialogOpen(true)}
                                disabled={isCreating}
                                className='flex font-medium items-center shadow-md border-2 lg:py-6 text-lg cursor-pointer gap-2 bg-gradient-to-b from-accent/70 to-accent/80 text-white disabled:opacity-70'
                            >
                                <RiSparkling2Fill className='size-5' />
                                {isMockTestLesson ? 'Generate Mock Test' : 'Generate Quiz'}
                            </Button>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className='grid grid-cols-1 xl:grid-cols-3 gap-6'>
                    {/* Left Column - Questions */}
                    <div className='xl:col-span-2'>
                        <QuestionCard
                            projectId={projectId}
                            courseId={courseId}
                            moduleId={currentModule?.id || ''}
                            lessonId={lessonId}
                            quiz={quiz}
                            questions={questions}
                            onQuestionsUpdate={handleQuestionsUpdate}
                            onQuizCreated={setQuiz}
                            quizTitle={quizTitle}
                            lessonTitle={
                                currentLesson?.title
                                    ? `${currentLesson.title} ${isMockTestLesson ? 'Mock Test' : 'Quiz'}`
                                    : undefined
                            }
                        />
                    </div>

                    {/* Right Column - Quiz Details (Desktop Only) */}
                    <div className='hidden xl:block xl:col-span-1'>
                        <QuizDetailsPanel
                            quizTitle={quizTitle}
                            setQuizTitle={setQuizTitle}
                            quizDescription={quizDescription}
                            setQuizDescription={setQuizDescription}
                            passingScore={passingScore}
                            setPassingScore={setPassingScore}
                            maxAttempts={maxAttempts}
                            setMaxAttempts={setMaxAttempts}
                            timeLimit={timeLimit}
                            setTimeLimit={setTimeLimit}
                        />
                    </div>
                </div>

                {/* Footer Actions */}
                <div className='flex items-center justify-end gap-3 pt-6 mt-6'>
                    <Button
                        variant='outline'
                        onClick={handleCancel}
                        disabled={isSaving}
                        className='px-6 py-5 text-[1.1rem] cursor-pointer hover:text-foreground'
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSaveQuiz}
                        disabled={isSaving || isLoadingQuiz}
                        className='px-6 py-5 font-semibold text-[1.1rem] bg-accent hover:bg-accent/90 text-white cursor-pointer'
                    >
                        {isSaving ? 'Saving...' : isMockTestLesson ? 'Save Mock Test' : 'Save Quiz'}
                    </Button>
                </div>
            </div>

            {/* Quiz Details Dialog - Mobile Only */}
            <QuizDetailsDialog
                open={isQuizDetailsOpen}
                onOpenChange={setIsQuizDetailsOpen}
                quizTitle={quizTitle}
                setQuizTitle={setQuizTitle}
                quizDescription={quizDescription}
                setQuizDescription={setQuizDescription}
                passingScore={passingScore}
                setPassingScore={setPassingScore}
                maxAttempts={maxAttempts}
                setMaxAttempts={setMaxAttempts}
                timeLimit={timeLimit}
                setTimeLimit={setTimeLimit}
            />

            {/* Generate Quiz Dialog */}
            <GenerateQuizDialog
                open={isGenerateDialogOpen}
                onOpenChange={setIsGenerateDialogOpen}
                onGenerate={handleGeneratePreview}
                isGenerating={isGenerating}
                lessonTitle={
                    currentLesson?.title
                        ? `${currentLesson.title} ${isMockTestLesson ? 'Mock Test' : 'Quiz'}`
                        : undefined
                }
            />

            {/* AI Quiz Preview Modal */}
            <AIQuizPreviewModal
                isOpen={isPreviewOpen}
                questions={generatedQuestions}
                onClose={handleClosePreview}
                onConfirm={handleConfirmQuiz}
                onRegenerate={handleRegenerateQuiz}
                isGenerating={isGenerating}
                isCreating={isCreating}
            />
        </div>
    )
}
