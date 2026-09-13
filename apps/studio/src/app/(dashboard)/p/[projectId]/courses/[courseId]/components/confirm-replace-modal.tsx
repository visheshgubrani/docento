'use client'

import { AlertTriangle } from 'lucide-react'

import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

type ConfirmReplaceModalProps = {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
}

export function ConfirmReplaceModal({
    isOpen,
    onClose,
    onConfirm,
}: ConfirmReplaceModalProps) {
    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent className='sm:max-w-[480px]'>
                <DialogHeader>
                    <div className='flex items-center gap-3'>
                        <div className='p-2.5 rounded-full bg-amber-100/70'>
                            <AlertTriangle className='size-6 text-amber-600' />
                        </div>
                        <DialogTitle className='text-xl font-medium'>
                            Replace Existing Modules?
                        </DialogTitle>
                    </div>
                    <DialogDescription className='pt-3 text-foreground/70'>
                        Are you sure you want to generate an AI course outline? Your current modules will be removed and replaced with AI-generated modules.
                    </DialogDescription>
                </DialogHeader>

                <DialogFooter className='pt-4'>
                    <Button
                        type='button'
                        variant='outline'
                        onClick={onClose}
                        className='rounded-md cursor-pointer hover:text-foreground'
                    >
                        Cancel
                    </Button>
                    <Button
                        type='button'
                        onClick={onConfirm}
                        className='rounded-md cursor-pointer bg-amber-600 hover:bg-amber-700 text-white'
                    >
                        Yes, Replace
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
