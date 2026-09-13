'use client'

import { useState, useEffect, useCallback } from 'react'

interface PreviewStorageConfig<T> {
  key: string
  expirationMinutes?: number
}

interface StoredPreview<T> {
  data: T
  timestamp: number
  metadata?: Record<string, unknown>
}

export function usePreviewStorage<T>(config: PreviewStorageConfig<T>) {
  const { key, expirationMinutes = 30 } = config

  const getFullKey = useCallback(() => {
    return `preview_storage_${key}`
  }, [key])

  const [storedData, setStoredData] = useState<StoredPreview<T> | null>(null)
  const [isHydrated, setIsHydrated] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    const loadStoredData = () => {
      try {
        const fullKey = getFullKey()
        const item = localStorage.getItem(fullKey)

        if (item) {
          const parsed: StoredPreview<T> = JSON.parse(item)
          const now = Date.now()
          const expirationMs = expirationMinutes * 60 * 1000

          // Check if data has expired
          if (now - parsed.timestamp < expirationMs) {
            setStoredData(parsed)
          } else {
            // Clear expired data
            localStorage.removeItem(fullKey)
          }
        }
      } catch (error) {
        console.error('Failed to load preview data from storage:', error)
      } finally {
        setIsHydrated(true)
      }
    }

    loadStoredData()
  }, [getFullKey, expirationMinutes])

  // Save data to localStorage
  const savePreview = useCallback(
    (data: T, metadata?: Record<string, unknown>) => {
      try {
        const fullKey = getFullKey()
        const storedPreview: StoredPreview<T> = {
          data,
          timestamp: Date.now(),
          metadata,
        }

        localStorage.setItem(fullKey, JSON.stringify(storedPreview))
        setStoredData(storedPreview)
        return true
      } catch (error) {
        console.error('Failed to save preview data to storage:', error)
        return false
      }
    },
    [getFullKey],
  )

  // Clear data from localStorage
  const clearPreview = useCallback(() => {
    try {
      const fullKey = getFullKey()
      localStorage.removeItem(fullKey)
      setStoredData(null)
      return true
    } catch (error) {
      console.error('Failed to clear preview data from storage:', error)
      return false
    }
  }, [getFullKey])

  // Check if there's valid stored data
  const hasPreview = useCallback(() => {
    return storedData !== null
  }, [storedData])

  // Get the stored data
  const getPreviewData = useCallback(() => {
    return storedData?.data ?? null
  }, [storedData])

  // Get the stored metadata
  const getPreviewMetadata = useCallback(() => {
    return storedData?.metadata ?? null
  }, [storedData])

  return {
    savePreview,
    clearPreview,
    hasPreview,
    getPreviewData,
    getPreviewMetadata,
    isHydrated,
    storedData,
  }
}
