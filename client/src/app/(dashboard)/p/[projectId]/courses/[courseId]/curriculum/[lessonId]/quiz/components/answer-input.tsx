'use client'

import { Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Button } from '@/components/ui/button'
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from '@/components/ui/tooltip'

interface AnswerInputProps {
    value: string
    isCorrect: boolean
    onValueChange: (value: string) => void
    onToggleCorrect: () => void
    onDelete: () => void
    canDelete: boolean
    answerNumber: number
    readOnly?: boolean
}

export function AnswerInput({
    value,
    isCorrect,
    onValueChange,
    onToggleCorrect,
    onDelete,
    canDelete,
    answerNumber,
    readOnly = false,
}: AnswerInputProps) {
    return (
        <div className='flex items-center gap-3'>
            <Input
                value={value}
                onChange={(e) => onValueChange(e.target.value)}
                placeholder={`Enter answer ${answerNumber}...`}
                className='flex-1 border-neutral-300 rounded-sm shadow-none py-3'
                readOnly={readOnly}
            />
            <TooltipProvider>
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div className='flex items-center'>
                            <Checkbox
                                checked={isCorrect}
                                onCheckedChange={onToggleCorrect}
                                className='h-5 w-5 cursor-pointer'
                            />
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        <p>Correct answer</p>
                    </TooltipContent>
                </Tooltip>
            </TooltipProvider>
            {canDelete && (
                <Button
                    onClick={onDelete}
                    variant='ghost'
                    size='sm'
                    className='h-9 w-9 p-0 text-foreground hover:bg-foreground/5'
                >
                    <Trash2 className='size-4' />
                </Button>
            )}
        </div>
    )
}
