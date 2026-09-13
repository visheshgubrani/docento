'use client'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

interface QuizDetailsDialogProps {
    open: boolean
    onOpenChange: (open: boolean) => void
    quizTitle: string
    setQuizTitle: (value: string) => void
    quizDescription: string
    setQuizDescription: (value: string) => void
    passingScore: number
    setPassingScore: (value: number) => void
    maxAttempts: number | ''
    setMaxAttempts: (value: number | '') => void
    timeLimit: number | ''
    setTimeLimit: (value: number | '') => void
}

export function QuizDetailsDialog({
    open,
    onOpenChange,
    quizTitle,
    setQuizTitle,
    quizDescription,
    setQuizDescription,
    passingScore,
    setPassingScore,
    maxAttempts,
    setMaxAttempts,
    timeLimit,
    setTimeLimit,
}: QuizDetailsDialogProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className='max-w-lg max-h-[88vh] overflow-y-auto'>
                <DialogHeader>
                    <DialogTitle className='text-xl font-semibold'>Quiz Settings</DialogTitle>
                    <DialogDescription className='text-foreground/70 mt-1'>
                        Configure your quiz details and settings
                    </DialogDescription>
                </DialogHeader>

                <div className='space-y-5 py-4'>
                    {/* Title */}
                    <div className='space-y-2'>
                        <label htmlFor='dialog-quiz-title' className='text-sm font-medium text-foreground'>
                            Quiz Title <span className='text-destructive'>*</span>
                        </label>
                        <Input
                            id='dialog-quiz-title'
                            value={quizTitle}
                            onChange={(e) => setQuizTitle(e.target.value)}
                            placeholder='Enter quiz title'
                            className='border-neutral-300 rounded-sm shadow-none py-2 mt-1'
                        />
                    </div>

                    {/* Description */}
                    <div className='space-y-2'>
                        <label htmlFor='dialog-quiz-description' className='text-sm font-medium text-foreground'>
                            Description <span className='text-muted-foreground'> (Optional)</span>
                        </label>
                        <Textarea
                            id='dialog-quiz-description'
                            value={quizDescription}
                            onChange={(e) => setQuizDescription(e.target.value)}
                            placeholder='Add instructions or context for students...'
                            className='border-neutral-300 rounded-sm shadow-none py-2 mt-1 min-h-[100px]'
                            rows={4}
                        />
                    </div>

                    {/* Settings */}
                    <div className='space-y-4'>
                        <div className='space-y-2'>
                            <label htmlFor='dialog-passing-score' className='text-sm font-medium text-foreground'>
                                Passing Score <span className='text-muted-foreground'> (%)</span>
                            </label>
                            <Input
                                id='dialog-passing-score'
                                type='number'
                                min='0'
                                max='100'
                                value={passingScore}
                                onChange={(e) => setPassingScore(Number(e.target.value))}
                                className='border-neutral-300 rounded-sm shadow-none py-2 mt-1'
                            />
                        </div>

                        <div className='space-y-2'>
                            <label htmlFor='dialog-max-attempts' className='text-sm font-medium text-foreground'>
                                Max Attempts <span className='text-muted-foreground'> (Optional)</span>
                            </label>
                            <Input
                                id='dialog-max-attempts'
                                type='number'
                                min='1'
                                value={maxAttempts}
                                onChange={(e) => setMaxAttempts(e.target.value ? Number(e.target.value) : '')}
                                placeholder='Unlimited'
                                className='border-neutral-300 rounded-sm shadow-none py-2 mt-1'
                            />
                        </div>

                        <div className='space-y-2'>
                            <label htmlFor='dialog-time-limit' className='text-sm font-medium text-foreground'>
                                Time Limit <span className='text-muted-foreground'> (minutes)</span>
                            </label>
                            <Input
                                id='dialog-time-limit'
                                type='number'
                                min='1'
                                value={timeLimit}
                                onChange={(e) => setTimeLimit(e.target.value ? Number(e.target.value) : '')}
                                placeholder='No limit'
                                className='border-neutral-300 rounded-sm shadow-none py-2 mt-1'
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className='flex items-center justify-center w-full'>
                    <Button
                        onClick={() => onOpenChange(false)}
                        className='bg-accent/80 w-full hover:bg-accent/90 text-white cursor-pointer'
                    >
                        Done
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
