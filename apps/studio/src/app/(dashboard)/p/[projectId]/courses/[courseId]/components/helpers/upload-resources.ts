import { createLessonUpload, type Upload } from '@/lib/api'

interface UploadConfig {
  projectId: string
  courseId: string
  moduleId: string
  lessonId: string
}

/**
 * Get the MIME type from a file
 * Falls back to 'application/octet-stream' if type cannot be determined
 */
function getContentType(file: File): string {
  return file.type || 'application/octet-stream'
}

/**
 * Upload a resource file to R2 using presigned URL
 * @param file - The file to upload
 * @param config - Project, course, module, and lesson IDs
 * @param onProgress - Optional callback for upload progress (0-100)
 * @returns The Upload object containing file info
 */
export async function uploadResourceFile(
  file: File,
  config: UploadConfig,
  onProgress?: (progress: number) => void,
): Promise<Upload> {
  try {
    const contentType = getContentType(file)

    // Get presigned URL from backend
    const uploadSession = await createLessonUpload(
      config.projectId,
      config.courseId,
      config.moduleId,
      config.lessonId,
      file.name,
      contentType,
    )

    // Upload file to R2 using presigned URL with progress tracking
    return new Promise<Upload>((resolve, reject) => {
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
          resolve(uploadSession.upload)
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
      xhr.setRequestHeader('Content-Type', contentType)
      xhr.send(file)
    })
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to upload resource file')
  }
}
