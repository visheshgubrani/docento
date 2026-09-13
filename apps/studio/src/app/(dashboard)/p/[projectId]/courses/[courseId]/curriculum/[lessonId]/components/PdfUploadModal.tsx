'use client'

import { useState, useRef } from 'react'
import { X, Upload, FileText, Loader2 } from 'lucide-react'
import Image from 'next/image'
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { uploadPdfFile } from '../../../components/helpers/upload-pdf'
import { updateLesson } from '@/lib/api'

interface PdfUploadModalProps {
    isOpen: boolean
    onClose: () => void
    projectId: string
    courseId: string
    moduleId: string
    lessonId: string
    onUploadComplete: () => void
}

function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

export function PdfUploadModal({
    isOpen,
    onClose,
    projectId,
    courseId,
    moduleId,
    lessonId,
    onUploadComplete,
}: PdfUploadModalProps) {
    const fileInputRef = useRef<HTMLInputElement>(null)
    const [isDragging, setIsDragging] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [uploadState, setUploadState] = useState<
        'idle' | 'uploading' | 'success' | 'error'
    >('idle')
    const [progress, setProgress] = useState(0)
    const [errorMessage, setErrorMessage] = useState<string | null>(null)

    const MAX_FILE_SIZE = 25 * 1024 * 1024 // 25MB in bytes

    const handleFileSelection = (files: FileList | null) => {
        if (!files || files.length === 0) return

        const file = files[0]

        // Validate file type
        if (file.type !== 'application/pdf') {
            setErrorMessage('Please select a PDF file')
            return
        }

        // Validate file size
        if (file.size > MAX_FILE_SIZE) {
            setErrorMessage(
                `File size must be less than ${formatFileSize(MAX_FILE_SIZE)}`
            )
            return
        }

        setSelectedFile(file)
        setErrorMessage(null)
    }

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(true)
    }

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
    }

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault()
        setIsDragging(false)
        handleFileSelection(e.dataTransfer.files)
    }

    const handleBrowseClick = () => {
        fileInputRef.current?.click()
    }

    const handleRemoveFile = () => {
        setSelectedFile(null)
        setErrorMessage(null)
        if (fileInputRef.current) {
            fileInputRef.current.value = ''
        }
    }

    const handleUpload = async () => {
        if (!selectedFile) return

        setUploadState('uploading')
        setProgress(0)
        setErrorMessage(null)

        try {
            // Upload PDF to R2
            const fileUrl = await uploadPdfFile(
                selectedFile,
                { projectId, courseId, moduleId, lessonId },
                (progressValue: number) => {
                    setProgress(progressValue)
                }
            )

            // Update lesson with the PDF URL and contentType
            await updateLesson(projectId, courseId, moduleId, lessonId, {
                fileUrl,
                contentType: 'FILE',
            })

            setUploadState('success')
            setTimeout(() => {
                onUploadComplete()
                handleClose()
            }, 500)
        } catch (error) {
            console.error('Upload error:', error)
            setUploadState('error')
            setErrorMessage(
                error instanceof Error ? error.message : 'Failed to upload PDF'
            )
        }
    }

    const handleClose = () => {
        if (uploadState === 'uploading') return // Prevent closing during upload
        setSelectedFile(null)
        setUploadState('idle')
        setProgress(0)
        setErrorMessage(null)
        onClose()
    }

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="max-w-xl">
                <DialogHeader>
                    <DialogTitle>Upload PDF</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    {/* File input */}
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="application/pdf,.pdf"
                        onChange={(e) => handleFileSelection(e.target.files)}
                        className="hidden"
                    />

                    {/* Upload area */}
                    {!selectedFile ? (
                        <div
                            onDragOver={handleDragOver}
                            onDragLeave={handleDragLeave}
                            onDrop={handleDrop}
                            onClick={handleBrowseClick}
                            className={`
                border-2 border-dashed rounded-lg p-8
                flex flex-col items-center justify-center
                cursor-pointer transition-colors
                ${isDragging
                                    ? 'border-accent bg-accent/10'
                                    : 'border-muted-foreground/70 bg-muted/70 hover:border-accent/50'
                                }
              `}
                        >
                            <div className=" flex items-center justify-center mb-8">
                                <Image
                                    src="/images/icons/pdf.svg"
                                    alt="PDF"
                                    width={62}
                                    height={62}
                                />
                            </div>
                            <p className="text-sm font-medium mb-1.5">
                                Drop your PDF here or click to browse
                            </p>
                            <p className="text-xs text-muted-foreground">
                                Maximum file size: {formatFileSize(MAX_FILE_SIZE)}
                            </p>
                        </div>
                    ) : (
                        <div className="border rounded-md bg-muted/70 p-4">
                            <div className="flex items-start gap-3">
                                <div className="flex items-center justify-center flex-shrink-0">
                                    <Image
                                        src="/images/icons/pdf.svg"
                                        alt="PDF"
                                        width={42}
                                        height={42}
                                    />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium truncate">
                                        {selectedFile.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {formatFileSize(selectedFile.size)}
                                    </p>
                                </div>
                                {uploadState !== 'uploading' && (
                                    <button
                                        onClick={handleRemoveFile}
                                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                                        aria-label="Remove file"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Error message */}
                    {errorMessage && (
                        <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-md p-3">
                            {errorMessage}
                        </div>
                    )}

                    {/* Action buttons */}
                    <div className="flex justify-end gap-3 pt-2">
                        <Button
                            variant="outline"
                            onClick={handleClose}
                            disabled={uploadState === 'uploading'}
                            className='cursor-pointer rounded-md hover:text-foreground'
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleUpload}
                            className='bg-accent/80 hover:bg-accent/90 cursor-pointer rounded-md'
                            disabled={!selectedFile || uploadState === 'uploading'}
                        >
                            {uploadState === 'uploading' ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                                    Uploading
                                </>
                            ) : (
                                <>
                                    <Upload className="w-4 h-4 mr-1" />
                                    Upload PDF
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
