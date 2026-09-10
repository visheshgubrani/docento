'use client'

import { FileText, Download, ExternalLink } from 'lucide-react'
import Image from 'next/image'
import { Button } from '@/components/ui/button'

interface PdfContentPreviewProps {
    fileUrl: string
    fileName?: string
}

export function PdfContentPreview({
    fileUrl,
    fileName,
}: PdfContentPreviewProps) {
    // Extract filename from URL if not provided
    const rawName =
        fileName ||
        fileUrl.split('/').pop()?.split('?')[0] ||
        'document.pdf'

    // Truncate at first occurrence of '.pdf' and add .pdf extension
    const pdfIndex = rawName.toLowerCase().indexOf('.pdf')
    const displayName = pdfIndex !== -1
        ? rawName.substring(0, pdfIndex) + '.pdf'
        : rawName

    const handleView = () => {
        window.open(fileUrl, '_blank', 'noopener,noreferrer')
    }

    const handleDownload = async () => {
        try {
            const response = await fetch(fileUrl)
            const blob = await response.blob()
            const url = window.URL.createObjectURL(blob)
            const a = document.createElement('a')
            a.href = url
            a.download = displayName
            document.body.appendChild(a)
            a.click()
            window.URL.revokeObjectURL(url)
            document.body.removeChild(a)
        } catch (error) {
            console.error('Download failed:', error)
            // Fallback: open in new tab
            window.open(fileUrl, '_blank', 'noopener,noreferrer')
        }
    }

    return (
        <div className="rounded-md border bg-card p-6">
            <div className="flex items-start gap-4">
                {/* PDF Icon */}
                <div className="flex mt-1 items-center justify-center flex-shrink-0">
                    <Image
                        src="/images/icons/pdf.svg"
                        alt="PDF"
                        width={42}
                        height={42}
                    />
                </div>

                {/* PDF Info */}
                <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold mb-1 truncate">
                        {displayName}
                    </h3>
                    <p className="text-xs font-allerta text-muted-foreground mb-4">
                        PDF Document
                    </p>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-3">
                        <Button onClick={handleView} size="sm" variant="default" className='bg-accent/70 hover:bg-accent/80 rounded-sm cursor-pointer'>
                            <ExternalLink className="w-4 h-4 mr-1" />
                            View PDF
                        </Button>
                        <Button onClick={handleDownload} size="sm" variant="outline" className='rounded-sm cursor-pointer hover:text-foreground'>
                            <Download className="w-4 h-4 mr-1" />
                            Download
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    )
}
