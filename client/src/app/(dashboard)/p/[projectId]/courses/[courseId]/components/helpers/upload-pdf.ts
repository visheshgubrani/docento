import { createPdfUpload } from '@/lib/api'

interface UploadConfig {
    projectId: string
    courseId: string
    moduleId: string
    lessonId: string
}

/**
 * Upload a PDF file to R2 using presigned URL
 * @param file - The PDF file to upload
 * @param config - Project, course, module, and lesson IDs
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns The public URL of the uploaded PDF
 */
export async function uploadPdfFile(
    file: File,
    config: UploadConfig,
    onProgress?: (progress: number) => void
): Promise<string> {
    try {
        // Get presigned URL from backend
        const uploadSession = await createPdfUpload(
            config.projectId,
            config.courseId,
            config.moduleId,
            config.lessonId,
            file.name,
            'application/pdf'
        )

        // Upload file to R2 using presigned URL with progress tracking
        return new Promise<string>((resolve, reject) => {
            const xhr = new XMLHttpRequest()

            // Track upload progress
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable && onProgress) {
                    const percentComplete = Math.round((e.loaded / e.total) * 100)
                    onProgress(percentComplete)
                }
            })

            // Handle successful upload
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    resolve(uploadSession.fileUrl)
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`))
                }
            })

            // Handle upload errors
            xhr.addEventListener('error', () => {
                reject(new Error('Upload failed due to network error'))
            })

            xhr.addEventListener('abort', () => {
                reject(new Error('Upload was cancelled'))
            })

            // Open connection and send file
            xhr.open('PUT', uploadSession.presignedUrl)
            xhr.setRequestHeader('Content-Type', 'application/pdf')
            xhr.send(file)
        })
    } catch (error) {
        if (error instanceof Error) {
            throw error
        }
        throw new Error('Failed to upload PDF')
    }
}
