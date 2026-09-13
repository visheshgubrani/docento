'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter, useParams } from 'next/navigation'
import { Reorder, useDragControls, useMotionValue } from 'framer-motion'
import { RxDragHandleDots2 } from 'react-icons/rx'
import { CgAddR } from 'react-icons/cg'
import { IoMdAddCircleOutline } from 'react-icons/io'
import { BsThreeDotsVertical } from 'react-icons/bs'
import {
  Video,
  FileText,
  Circle,
  Loader2,
  FileQuestion,
  FolderOpen,
  ClipboardList,
} from 'lucide-react'
import { BsFileEarmarkPdfFill } from 'react-icons/bs'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'
import { useProjectRouteId } from '@/lib/hooks/use-project-route-id'
import {
  createModule,
  updateModule,
  deleteModule,
  reorderModules,
  createLesson,
  updateLesson,
  deleteLesson,
  reorderLessons,
  type CourseModule,
  type CourseModuleLesson,
  type LessonPrimaryContentType,
} from '@/lib/api'
import { useQueryClient } from '@tanstack/react-query'
import { FaVideo, FaYoutube } from 'react-icons/fa'
import { MdOutlineAssignment } from 'react-icons/md'
import { MdAssignment } from 'react-icons/md'
import { BsQuestionCircleFill } from 'react-icons/bs'
import { MdTypeSpecimen } from 'react-icons/md'
import { FaPenToSquare } from 'react-icons/fa6'

// Types for local state management
type LocalModule = CourseModule & {
  _isOptimistic?: boolean
}

type LocalLesson = CourseModuleLesson & {
  _isOptimistic?: boolean
}

const toPrimaryLessonContentType = (
  contentType: string | null | undefined,
): LessonPrimaryContentType => {
  switch (contentType?.toUpperCase()) {
    case 'VIDEO':
    case 'TEXT':
    case 'QUIZ':
    case 'MOCK_TEST':
    case 'ASSIGNMENT':
    case 'YOUTUBE':
      return contentType.toUpperCase() as LessonPrimaryContentType
    default:
      return 'TEXT'
  }
}

// Props type
type ManualCourseBuilderProps = {
  modules: CourseModule[]
}

export function ManualCourseBuilder({
  modules: serverModules,
}: ManualCourseBuilderProps) {
  const router = useRouter()
  const params = useParams()
  const projectId = useProjectRouteId()
  const courseId = typeof params?.courseId === 'string' ? params.courseId : ''
  const queryClient = useQueryClient()

  // Local state for optimistic updates
  const [modules, setModules] = useState<LocalModule[]>(serverModules)

  // Sync with server data when it changes
  useEffect(() => {
    setModules(serverModules)
  }, [serverModules])

  const [isAddingModule, setIsAddingModule] = useState(false)
  const [newModuleTitle, setNewModuleTitle] = useState('')
  const [addingLessonToModuleId, setAddingLessonToModuleId] = useState<
    string | null
  >(null)
  const [newLessonTitle, setNewLessonTitle] = useState('')

  // Track which items are being processed
  const [processingModuleIds, setProcessingModuleIds] = useState<Set<string>>(
    new Set(),
  )
  const [processingLessonIds, setProcessingLessonIds] = useState<Set<string>>(
    new Set(),
  )
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null)
  const [editingLessonId, setEditingLessonId] = useState<string | null>(null)
  const [isCreatingModule, setIsCreatingModule] = useState(false)
  const [isReordering, setIsReordering] = useState(false)

  // Navigate to lesson editor
  const handleNavigateToLesson = useCallback(
    (lessonId: string) => {
      router.push(`/p/${projectId}/courses/${courseId}/curriculum/${lessonId}`)
    },
    [router, projectId, courseId],
  )

  // Module reorder handler
  const handleModuleReorder = useCallback(
    async (newOrder: LocalModule[]) => {
      const oldModules = modules
      setModules(newOrder)

      // Only call API if order actually changed
      const orderChanged = newOrder.some((m, i) => m.id !== oldModules[i]?.id)
      if (!orderChanged) return

      setIsReordering(true)
      try {
        const moduleOrders = newOrder.map((m, idx) => ({
          id: m.id,
          order: idx + 1,
        }))
        await reorderModules(projectId, courseId, moduleOrders)
      } catch (error) {
        console.error('Failed to reorder modules:', error)
        // Rollback
        setModules(oldModules)
      } finally {
        setIsReordering(false)
      }
    },
    [modules, projectId, courseId],
  )

  // Lesson reorder handler
  const handleLessonReorder = useCallback(
    async (moduleId: string, newLessons: LocalLesson[]) => {
      const module = modules.find((m) => m.id === moduleId)
      if (!module) return

      const oldLessons = module.lessons

      // Optimistic update
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, lessons: newLessons } : m,
        ),
      )

      // Only call API if order actually changed
      const orderChanged = newLessons.some((l, i) => l.id !== oldLessons[i]?.id)
      if (!orderChanged) return

      try {
        const lessonOrders = newLessons.map((l, idx) => ({
          id: l.id,
          order: idx + 1,
        }))
        await reorderLessons(projectId, courseId, moduleId, lessonOrders)
      } catch (error) {
        console.error('Failed to reorder lessons:', error)
        // Rollback
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId ? { ...m, lessons: oldLessons } : m,
          ),
        )
      }
    },
    [modules, projectId, courseId],
  )

  // Module operations with optimistic updates
  const handleAddModule = useCallback(async () => {
    if (!newModuleTitle.trim()) return

    const tempId = `temp-${Date.now()}`
    const optimisticModule: LocalModule = {
      id: tempId,
      title: newModuleTitle.trim(),
      description: null,
      order: modules.length + 1,
      courseId,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      lessons: [],
      _count: { lessons: 0 },
      _isOptimistic: true,
    }

    // Optimistic update
    setModules((prev) => [...prev, optimisticModule])
    setNewModuleTitle('')
    setIsAddingModule(false)
    setIsCreatingModule(true)

    try {
      const created = await createModule(projectId, courseId, {
        title: optimisticModule.title,
      })
      // Replace temp with real module
      setModules((prev) =>
        prev.map((m) =>
          m.id === tempId ? { ...created, _isOptimistic: false } : m,
        ),
      )
    } catch (error) {
      console.error('Failed to create module:', error)
      // Rollback
      setModules((prev) => prev.filter((m) => m.id !== tempId))
    } finally {
      setIsCreatingModule(false)
    }
  }, [newModuleTitle, modules.length, courseId, projectId])

  const handleCancelAddModule = useCallback(() => {
    setNewModuleTitle('')
    setIsAddingModule(false)
  }, [])

  const handleRenameModule = useCallback((moduleId: string) => {
    setEditingModuleId(moduleId)
  }, [])

  const handleSaveModuleRename = useCallback(
    async (moduleId: string, newTitle: string) => {
      if (!newTitle.trim()) return

      const oldTitle = modules.find((m) => m.id === moduleId)?.title

      // Optimistic update
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId ? { ...m, title: newTitle.trim() } : m,
        ),
      )
      setEditingModuleId(null)

      try {
        await updateModule(projectId, courseId, moduleId, {
          title: newTitle.trim(),
        })
      } catch (error) {
        console.error('Failed to rename module:', error)
        // Rollback
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId ? { ...m, title: oldTitle || m.title } : m,
          ),
        )
      }
    },
    [projectId, courseId, modules],
  )

  const handleCancelModuleRename = useCallback(() => {
    setEditingModuleId(null)
  }, [])

  const handleDuplicateModule = useCallback(
    async (moduleId: string) => {
      const originalModule = modules.find((m) => m.id === moduleId)
      if (!originalModule) return

      const tempId = `temp-dup-${Date.now()}`
      const duplicatedModule: LocalModule = {
        ...originalModule,
        id: tempId,
        title: `${originalModule.title} (copy)`,
        order: modules.length + 1,
        lessons: originalModule.lessons.map((l, i) => ({
          ...l,
          id: `temp-lesson-${Date.now()}-${i}`,
          title: `${l.title} (copy)`,
        })),
        _isOptimistic: true,
      }

      // Optimistic update
      setModules((prev) => {
        const idx = prev.findIndex((m) => m.id === moduleId)
        const newModules = [...prev]
        newModules.splice(idx + 1, 0, duplicatedModule)
        return newModules
      })
      setProcessingModuleIds((prev) => new Set(prev).add(tempId))

      try {
        // Create the module
        const newModule = await createModule(projectId, courseId, {
          title: duplicatedModule.title,
          description: originalModule.description ?? undefined,
        })

        // Create lessons (in parallel for speed)
        const lessonPromises = originalModule.lessons.map((lesson) =>
          createLesson(projectId, courseId, newModule.id, {
            title: `${lesson.title} (copy)`,
            contentType: toPrimaryLessonContentType(lesson.contentType),
            description: lesson.description ?? undefined,
            textContent: lesson.textContent ?? undefined,
            videoUrl: lesson.videoUrl ?? undefined,
            fileUrl: lesson.fileUrl ?? undefined,
            isFree: lesson.isFree,
            duration: lesson.duration ?? undefined,
          }),
        )
        const createdLessons = await Promise.all(lessonPromises)

        // Update with real data
        setModules((prev) =>
          prev.map((m) =>
            m.id === tempId
              ? {
                  ...newModule,
                  lessons: createdLessons,
                  _isOptimistic: false,
                }
              : m,
          ),
        )
      } catch (error) {
        console.error('Failed to duplicate module:', error)
        // Rollback
        setModules((prev) => prev.filter((m) => m.id !== tempId))
      } finally {
        setProcessingModuleIds((prev) => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })
      }
    },
    [modules, projectId, courseId],
  )

  const handleDeleteModule = useCallback(
    async (moduleId: string) => {
      const moduleToDelete = modules.find((m) => m.id === moduleId)
      if (!moduleToDelete) return

      // Optimistic update
      setModules((prev) => prev.filter((m) => m.id !== moduleId))

      try {
        await deleteModule(projectId, courseId, moduleId)
      } catch (error) {
        console.error('Failed to delete module:', error)
        // Rollback - add back at original position
        setModules((prev) => {
          const newModules = [...prev]
          const originalIdx = serverModules.findIndex((m) => m.id === moduleId)
          newModules.splice(originalIdx, 0, moduleToDelete)
          return newModules
        })
      }
    },
    [modules, projectId, courseId, serverModules],
  )

  // Lesson operations with optimistic updates
  const handleStartAddLesson = useCallback((moduleId: string) => {
    setAddingLessonToModuleId(moduleId)
    setNewLessonTitle('')
  }, [])

  const handleAddLesson = useCallback(
    async (moduleId: string) => {
      if (!newLessonTitle.trim()) return

      const tempId = `temp-lesson-${Date.now()}`
      const module = modules.find((m) => m.id === moduleId)
      const optimisticLesson: LocalLesson = {
        id: tempId,
        title: newLessonTitle.trim(),
        description: null,
        contentType: 'TEXT',
        videoUrl: null,
        textContent: null,
        fileUrl: null,
        duration: null,
        isFree: false,
        order: (module?.lessons.length ?? 0) + 1,
        _isOptimistic: true,
      }

      // Optimistic update
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? { ...m, lessons: [...m.lessons, optimisticLesson] }
            : m,
        ),
      )
      setNewLessonTitle('')
      setAddingLessonToModuleId(null)

      try {
        const created = await createLesson(projectId, courseId, moduleId, {
          title: optimisticLesson.title,
          contentType: 'TEXT',
        })
        // Replace temp with real
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  lessons: m.lessons.map((l) =>
                    l.id === tempId ? { ...created, _isOptimistic: false } : l,
                  ),
                }
              : m,
          ),
        )
      } catch (error) {
        console.error('Failed to create lesson:', error)
        // Rollback
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  lessons: m.lessons.filter((l) => l.id !== tempId),
                }
              : m,
          ),
        )
      }
    },
    [newLessonTitle, modules, projectId, courseId],
  )

  const handleCancelAddLesson = useCallback(() => {
    setNewLessonTitle('')
    setAddingLessonToModuleId(null)
  }, [])

  const handleRenameLesson = useCallback((lessonId: string) => {
    setEditingLessonId(lessonId)
  }, [])

  const handleSaveLessonRename = useCallback(
    async (moduleId: string, lessonId: string, newTitle: string) => {
      if (!newTitle.trim()) return

      const module = modules.find((m) => m.id === moduleId)
      const oldTitle = module?.lessons.find((l) => l.id === lessonId)?.title

      // Optimistic update
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: m.lessons.map((l) =>
                  l.id === lessonId ? { ...l, title: newTitle.trim() } : l,
                ),
              }
            : m,
        ),
      )
      setEditingLessonId(null)

      try {
        await updateLesson(projectId, courseId, moduleId, lessonId, {
          title: newTitle.trim(),
        })
      } catch (error) {
        console.error('Failed to rename lesson:', error)
        // Rollback
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  lessons: m.lessons.map((l) =>
                    l.id === lessonId
                      ? { ...l, title: oldTitle || l.title }
                      : l,
                  ),
                }
              : m,
          ),
        )
      }
    },
    [projectId, courseId, modules],
  )

  const handleCancelLessonRename = useCallback(() => {
    setEditingLessonId(null)
  }, [])

  const handleDuplicateLesson = useCallback(
    async (moduleId: string, lessonId: string) => {
      const module = modules.find((m) => m.id === moduleId)
      const originalLesson = module?.lessons.find((l) => l.id === lessonId)
      if (!originalLesson) return

      const tempId = `temp-dup-lesson-${Date.now()}`
      const duplicatedLesson: LocalLesson = {
        ...originalLesson,
        id: tempId,
        title: `${originalLesson.title} (copy)`,
        order: (module?.lessons.length ?? 0) + 1,
        _isOptimistic: true,
      }

      // Optimistic update
      setModules((prev) =>
        prev.map((m) => {
          if (m.id !== moduleId) return m
          const idx = m.lessons.findIndex((l) => l.id === lessonId)
          const newLessons = [...m.lessons]
          newLessons.splice(idx + 1, 0, duplicatedLesson)
          return { ...m, lessons: newLessons }
        }),
      )
      setProcessingLessonIds((prev) => new Set(prev).add(tempId))

      try {
        const created = await createLesson(projectId, courseId, moduleId, {
          title: duplicatedLesson.title,
          contentType: toPrimaryLessonContentType(originalLesson.contentType),
          description: originalLesson.description ?? undefined,
          textContent: originalLesson.textContent ?? undefined,
          videoUrl: originalLesson.videoUrl ?? undefined,
          fileUrl: originalLesson.fileUrl ?? undefined,
          isFree: originalLesson.isFree,
          duration: originalLesson.duration ?? undefined,
        })
        // Replace temp with real
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  lessons: m.lessons.map((l) =>
                    l.id === tempId ? { ...created, _isOptimistic: false } : l,
                  ),
                }
              : m,
          ),
        )
      } catch (error) {
        console.error('Failed to duplicate lesson:', error)
        // Rollback
        setModules((prev) =>
          prev.map((m) =>
            m.id === moduleId
              ? {
                  ...m,
                  lessons: m.lessons.filter((l) => l.id !== tempId),
                }
              : m,
          ),
        )
      } finally {
        setProcessingLessonIds((prev) => {
          const next = new Set(prev)
          next.delete(tempId)
          return next
        })
      }
    },
    [modules, projectId, courseId],
  )

  const handleDeleteLesson = useCallback(
    async (moduleId: string, lessonId: string) => {
      const module = modules.find((m) => m.id === moduleId)
      const lessonToDelete = module?.lessons.find((l) => l.id === lessonId)
      if (!lessonToDelete) return

      // Optimistic update
      setModules((prev) =>
        prev.map((m) =>
          m.id === moduleId
            ? {
                ...m,
                lessons: m.lessons.filter((l) => l.id !== lessonId),
              }
            : m,
        ),
      )

      try {
        await deleteLesson(projectId, courseId, moduleId, lessonId)
      } catch (error) {
        console.error('Failed to delete lesson:', error)
        // Rollback
        const originalModule = serverModules.find((m) => m.id === moduleId)
        const originalIdx =
          originalModule?.lessons.findIndex((l) => l.id === lessonId) ?? 0
        setModules((prev) =>
          prev.map((m) => {
            if (m.id !== moduleId) return m
            const newLessons = [...m.lessons]
            newLessons.splice(originalIdx, 0, lessonToDelete)
            return { ...m, lessons: newLessons }
          }),
        )
      }
    },
    [modules, projectId, courseId, serverModules],
  )

  return (
    <div className="space-y-6">
      {/* Empty State */}
      {modules.length === 0 ? (
        <div className="rounded-md border border-neutral-300 bg-white overflow-hidden">
          {/* New Module Button */}
          <div className="bg-neutral-50 border-b border-neutral-300">
            {isAddingModule ? (
              <div className="flex items-center gap-4 px-5 py-5">
                <RxDragHandleDots2 className="size-7 text-foreground/30" />
                <Input
                  autoFocus
                  placeholder="Enter module title..."
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddModule()
                    if (e.key === 'Escape') handleCancelAddModule()
                  }}
                  disabled={isCreatingModule}
                  className="flex-1 h-13 active:border-muted-foreground/70 rounded-sm border-muted-foreground/60 shadow-none bg-white text-lg"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAddModule}
                  disabled={isCreatingModule}
                  className="h-12 px-4 rounded-sm cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddModule}
                  disabled={!newModuleTitle.trim() || isCreatingModule}
                  className="h-12 px-4 rounded-sm bg-accent hover:bg-accent/90 text-white cursor-pointer"
                >
                  {isCreatingModule ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingModule(true)}
                className="flex bg-neutral-100 items-center gap-4 w-full px-5 py-4 text-left hover:bg-neutral-200/55 transition-colors cursor-pointer"
              >
                <IoMdAddCircleOutline className="size-7 text-accent" />
                <span className="text-lg font-medium text-accent">
                  New Module
                </span>
              </button>
            )}
          </div>
          <div className="px-5 py-10 text-center bg-white">
            <p className="text-sm text-foreground/50">
              No modules yet. Click &quot;New Module&quot; above to get started.
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* Modules List with Reorder */}
          <Reorder.Group
            axis="y"
            values={modules}
            onReorder={handleModuleReorder}
            className="space-y-6"
          >
            {modules.map((module, moduleIndex) => (
              <ModuleRow
                key={module.id}
                module={module}
                moduleIndex={moduleIndex}
                isAddingLesson={addingLessonToModuleId === module.id}
                newLessonTitle={
                  addingLessonToModuleId === module.id ? newLessonTitle : ''
                }
                onNewLessonTitleChange={setNewLessonTitle}
                onStartAddLesson={() => handleStartAddLesson(module.id)}
                onAddLesson={() => handleAddLesson(module.id)}
                onCancelAddLesson={handleCancelAddLesson}
                onRename={() => handleRenameModule(module.id)}
                onSaveRename={(title) =>
                  handleSaveModuleRename(module.id, title)
                }
                onCancelRename={handleCancelModuleRename}
                onDuplicate={() => handleDuplicateModule(module.id)}
                onDelete={() => handleDeleteModule(module.id)}
                onNavigateToLesson={handleNavigateToLesson}
                onRenameLesson={(lessonId) => handleRenameLesson(lessonId)}
                onSaveLessonRename={(lessonId, title) =>
                  handleSaveLessonRename(module.id, lessonId, title)
                }
                onCancelLessonRename={handleCancelLessonRename}
                onDuplicateLesson={(lessonId) =>
                  handleDuplicateLesson(module.id, lessonId)
                }
                onDeleteLesson={(lessonId) =>
                  handleDeleteLesson(module.id, lessonId)
                }
                onLessonReorder={(newLessons) =>
                  handleLessonReorder(module.id, newLessons)
                }
                isProcessing={
                  processingModuleIds.has(module.id) ||
                  !!(module as LocalModule)._isOptimistic
                }
                processingLessonIds={processingLessonIds}
                isEditing={editingModuleId === module.id}
                editingLessonId={editingLessonId}
                isReordering={isReordering}
              />
            ))}
          </Reorder.Group>

          {/* "+ New Module" button as a separate box below modules */}
          <div className="rounded-md border-2 border-neutral-300/70 bg-white overflow-hidden">
            {isAddingModule ? (
              <div className="flex items-center gap-4 px-5 py-4 rounded-md bg-neutral-100">
                <RxDragHandleDots2 className="size-7 text-foreground/60" />
                <Input
                  autoFocus
                  placeholder="Enter module title..."
                  value={newModuleTitle}
                  onChange={(e) => setNewModuleTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleAddModule()
                    if (e.key === 'Escape') handleCancelAddModule()
                  }}
                  disabled={isCreatingModule}
                  className="flex-1 h-13 shadow-none rounded-sm border-muted-foreground/60 bg-white text-lg"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCancelAddModule}
                  disabled={isCreatingModule}
                  className="h-11 px-4 rounded-sm hover:text-foreground cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddModule}
                  disabled={!newModuleTitle.trim() || isCreatingModule}
                  className="h-11 px-4 rounded-sm bg-accent hover:bg-accent/90 text-white cursor-pointer"
                >
                  {isCreatingModule ? (
                    <>
                      <Loader2 className="size-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save'
                  )}
                </Button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsAddingModule(true)}
                className="flex items-center gap-2 border-2 rounded-md border-dashed border-foreground/50 w-full px-5 py-4 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
              >
                <IoMdAddCircleOutline
                  strokeWidth={0.3}
                  className="size-7 text-accent/85"
                />
                <span className="text-lg font-medium text-accent">
                  New Module
                </span>
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Module Row Component with Reorder.Item
function ModuleRow({
  module,
  moduleIndex,
  isAddingLesson,
  newLessonTitle,
  onNewLessonTitleChange,
  onStartAddLesson,
  onAddLesson,
  onCancelAddLesson,
  onRename,
  onSaveRename,
  onCancelRename,
  onDuplicate,
  onDelete,
  onNavigateToLesson,
  onRenameLesson,
  onSaveLessonRename,
  onCancelLessonRename,
  onDuplicateLesson,
  onDeleteLesson,
  onLessonReorder,
  isProcessing,
  processingLessonIds,
  isEditing,
  editingLessonId,
  isReordering,
}: {
  module: LocalModule
  moduleIndex: number
  isAddingLesson: boolean
  newLessonTitle: string
  onNewLessonTitleChange: (title: string) => void
  onStartAddLesson: () => void
  onAddLesson: () => void
  onCancelAddLesson: () => void
  onRename: () => void
  onSaveRename: (title: string) => void
  onCancelRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  onNavigateToLesson: (lessonId: string) => void
  onRenameLesson: (lessonId: string) => void
  onSaveLessonRename: (lessonId: string, title: string) => void
  onCancelLessonRename: (lessonId: string) => void
  onDuplicateLesson: (lessonId: string) => void
  onDeleteLesson: (lessonId: string) => void
  onLessonReorder: (newLessons: LocalLesson[]) => void
  isProcessing: boolean
  processingLessonIds: Set<string>
  isEditing: boolean
  editingLessonId: string | null
  isReordering: boolean
}) {
  const [editTitle, setEditTitle] = useState(module.title)
  const [isAddingLessonLoading, setIsAddingLessonLoading] = useState(false)
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  const handleAddLessonWithLoading = async () => {
    setIsAddingLessonLoading(true)
    try {
      await onAddLesson()
    } finally {
      setIsAddingLessonLoading(false)
    }
  }

  return (
    <Reorder.Item
      value={module}
      id={module.id}
      style={{ y }}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        'rounded-md border border-neutral-300 bg-white overflow-hidden',
        isProcessing && 'opacity-60',
        isReordering && 'cursor-grabbing',
      )}
      whileDrag={{
        scale: 1.02,
        boxShadow: '0 8px 20px rgba(0,0,0,0.12)',
        zIndex: 50,
      }}
    >
      {/* Main flex container - module reorder on left, content on right */}
      <div className="flex items-stretch">
        {/* Module Reorder column - spans full height */}
        <div
          className="flex items-start justify-center py-5 px-1.5 bg-neutral-200/60 border-r border-slate-200 cursor-grab active:cursor-grabbing select-none"
          style={{ touchAction: 'none' }}
          onPointerDown={(e) => dragControls.start(e)}
        >
          <RxDragHandleDots2 className="size-6 text-foreground/85 hover:text-foreground" />
        </div>

        {/* Right side: Module header + Lessons */}
        <div className="flex-1">
          {/* Module Header */}
          <div className="flex items-center gap-4 px-5 py-4 bg-neutral-100/50 border-b border-neutral-300/80">
            {isEditing ? (
              <div className="flex items-center gap-3 flex-1">
                <Input
                  autoFocus
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') onSaveRename(editTitle)
                    if (e.key === 'Escape') onCancelRename()
                  }}
                  className="flex-1 h-13 rounded-sm border-muted-foreground/60 shadow-none bg-white text-lg"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onCancelRename}
                  className="h-11 px-4 rounded-sm cursor-pointer"
                >
                  Cancel
                </Button>
                <Button
                  size="sm"
                  onClick={() => onSaveRename(editTitle)}
                  disabled={!editTitle.trim()}
                  className="h-11 px-4 rounded-sm bg-accent hover:bg-accent/90 text-white cursor-pointer"
                >
                  Save
                </Button>
              </div>
            ) : (
              <>
                <div className="flex-1">
                  <p className="text-lg font-semibold text-foreground">
                    Module {moduleIndex + 1}: {module.title}
                  </p>
                  <p className="text-sm text-foreground/50 mt-0.5">
                    {module.lessons.length}{' '}
                    {module.lessons.length === 1 ? 'lesson' : 'lessons'}
                  </p>
                </div>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-9 w-9 p-0 cursor-pointer"
                      disabled={isProcessing}
                    >
                      {isProcessing ? (
                        <Loader2 className="size-5 animate-spin" />
                      ) : (
                        <BsThreeDotsVertical className="size-5" />
                      )}
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="p-1 space-y-0.5">
                    <DropdownMenuItem
                      onClick={onRename}
                      className="cursor-pointer hover:bg-neutral-100"
                    >
                      Rename module
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDuplicate}
                      className="cursor-pointer hover:bg-neutral-100"
                    >
                      Duplicate module
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={onDelete}
                      className="cursor-pointer text-destructive focus:text-destructive hover:bg-red-50"
                    >
                      Delete module
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>

          {/* Lessons with Reorder */}
          <div>
            {module.lessons.length > 0 && (
              <Reorder.Group
                axis="y"
                values={module.lessons as LocalLesson[]}
                onReorder={onLessonReorder}
                className="divide-y divide-neutral-200"
              >
                {module.lessons.map((lesson, lessonIndex) => (
                  <LessonRow
                    key={lesson.id}
                    lesson={lesson as LocalLesson}
                    lessonIndex={lessonIndex}
                    onNavigate={() => onNavigateToLesson(lesson.id)}
                    onRename={() => onRenameLesson(lesson.id)}
                    onSaveRename={(title) =>
                      onSaveLessonRename(lesson.id, title)
                    }
                    onCancelRename={() => onCancelLessonRename(lesson.id)}
                    onDuplicate={() => onDuplicateLesson(lesson.id)}
                    onDelete={() => onDeleteLesson(lesson.id)}
                    isProcessing={
                      processingLessonIds.has(lesson.id) ||
                      !!(lesson as LocalLesson)._isOptimistic
                    }
                    isEditing={editingLessonId === lesson.id}
                  />
                ))}
              </Reorder.Group>
            )}

            {/* Add Lesson Row */}
            <div className="border-t border-slate-200">
              {isAddingLesson ? (
                <div className="flex items-center gap-4 px-5 py-5">
                  <Input
                    autoFocus
                    placeholder="Enter lesson title..."
                    value={newLessonTitle}
                    onChange={(e) => onNewLessonTitleChange(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleAddLessonWithLoading()
                      if (e.key === 'Escape') onCancelAddLesson()
                    }}
                    disabled={isAddingLessonLoading}
                    className="flex-1 h-12 rounded-sm border-muted-foreground/60 shadow-none bg-white text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={onCancelAddLesson}
                    disabled={isAddingLessonLoading}
                    className="h-11 px-3 rounded-sm cursor-pointer text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleAddLessonWithLoading}
                    disabled={!newLessonTitle.trim() || isAddingLessonLoading}
                    className="h-11 px-3 rounded-sm bg-accent hover:bg-accent/90 text-white cursor-pointer text-sm"
                  >
                    {isAddingLessonLoading ? (
                      <>
                        <Loader2 className="size-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save'
                    )}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={onStartAddLesson}
                  className="flex items-center gap-3 w-full px-5 py-5 text-left hover:bg-neutral-50 transition-colors cursor-pointer"
                >
                  <CgAddR className="size-5 text-accent" strokeWidth={0.3} />
                  <span className="text-sm font-semibold text-accent">
                    New Lesson
                  </span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </Reorder.Item>
  )
}

// Helper to get content status display
function getContentStatusDisplay(lesson: LocalLesson) {
  const contentType = lesson.contentType?.toUpperCase()

  // Check for actual content based on content type
  if (contentType === 'VIDEO' && lesson.videoUrl) {
    return { icon: FaVideo, text: 'video', color: 'text-lime-800/70' }
  }
  if (contentType === 'TEXT' && lesson.textContent) {
    return {
      icon: MdTypeSpecimen,
      text: 'text',
      color: 'text-lime-800/70',
    }
  }
  if (contentType === 'FILE' && lesson.fileUrl) {
    return {
      icon: BsFileEarmarkPdfFill,
      text: 'pdf',
      color: 'text-lime-800/70',
    }
  }
  if (contentType === 'QUIZ') {
    return {
      icon: BsQuestionCircleFill,
      text: 'quiz',
      color: 'text-lime-800/70',
    }
  }
  if (contentType === 'MOCK_TEST') {
    return {
      icon: FaPenToSquare,
      text: 'mock test',
      color: 'text-lime-800/70',
    }
  }
  if (contentType === 'ASSIGNMENT') {
    return {
      icon: MdAssignment,
      text: 'assignment',
      color: 'text-lime-800/70',
    }
  }
  if (contentType === 'YOUTUBE') {
    return {
      icon: FaYoutube,
      text: 'YouTube video',
      color: 'text-lime-800/70',
    }
  }
  if (contentType === 'RESOURCES') {
    return { icon: FolderOpen, text: 'resources', color: 'text-lime-800/70' }
  }

  // Default: no content regardless of contentType
  return { icon: Circle, text: 'Empty', color: 'text-foreground/40' }
}

// Lesson Row Component with Reorder.Item
function LessonRow({
  lesson,
  lessonIndex,
  onNavigate,
  onRename,
  onSaveRename,
  onCancelRename,
  onDuplicate,
  onDelete,
  isProcessing,
  isEditing,
}: {
  lesson: LocalLesson
  lessonIndex: number
  onNavigate: () => void
  onRename: () => void
  onSaveRename: (title: string) => void
  onCancelRename: () => void
  onDuplicate: () => void
  onDelete: () => void
  isProcessing: boolean
  isEditing: boolean
}) {
  const [editTitle, setEditTitle] = useState(lesson.title)
  const contentStatus = getContentStatusDisplay(lesson)
  const ContentIcon = contentStatus.icon
  const y = useMotionValue(0)
  const dragControls = useDragControls()

  return (
    <Reorder.Item
      value={lesson}
      id={lesson.id}
      style={{ y }}
      dragListener={false}
      dragControls={dragControls}
      className={cn(
        'group flex items-center gap-4 px-3 py-4 bg-white',
        'hover:bg-neutral-50 transition-colors',
        isProcessing && 'opacity-60',
      )}
      whileDrag={{
        scale: 1.01,
        backgroundColor: '#f8fafc',
        boxShadow: '0 4px 12px rgba(0,0,0,0.08)',
        zIndex: 50,
      }}
    >
      {/* Lesson reorder handle - inline */}
      <div
        className="cursor-grab active:cursor-grabbing p-1 -m-1 select-none"
        style={{ touchAction: 'none' }}
        onPointerDown={(e) => dragControls.start(e)}
      >
        <RxDragHandleDots2 className="size-6 text-foreground/70 hover:text-foreground/60" />
      </div>

      {isEditing ? (
        <div className="flex items-center gap-3 flex-1">
          <Input
            autoFocus
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') onSaveRename(editTitle)
              if (e.key === 'Escape') onCancelRename()
            }}
            className="flex-1 h-12 rounded-sm border-muted-foreground/60 shadow-none bg-white text-sm"
          />
          <Button
            size="sm"
            variant="outline"
            onClick={onCancelRename}
            className="h-11 px-3 rounded-sm cursor-pointer text-sm"
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={() => onSaveRename(editTitle)}
            disabled={!editTitle.trim()}
            className="h-11 px-3 rounded-sm bg-accent hover:bg-accent/90 text-white cursor-pointer text-sm"
          >
            Save
          </Button>
        </div>
      ) : (
        <>
          <div className="flex-1">
            <button
              type="button"
              onClick={onNavigate}
              disabled={!!lesson._isOptimistic}
              className="text-sm text-foreground/80 underline hover:text-accent transition-colors cursor-pointer text-left disabled:cursor-default disabled:no-underline"
            >
              {lessonIndex + 1}. {lesson.title}
            </button>
            <p
              className={cn(
                'flex items-center gap-1 text-xs mt-1',
                contentStatus.color,
              )}
            >
              <ContentIcon className="size-3.5" />
              {contentStatus.text}
            </p>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0 cursor-pointer"
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <Loader2 className="size-5 animate-spin" />
                ) : (
                  <BsThreeDotsVertical className="size-5" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="p-1 space-y-0.5">
              <DropdownMenuItem
                onClick={onRename}
                className="cursor-pointer hover:bg-neutral-100"
              >
                Rename lesson
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDuplicate}
                className="cursor-pointer hover:bg-neutral-100"
              >
                Duplicate lesson
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={onDelete}
                className="cursor-pointer text-destructive focus:text-destructive hover:bg-red-50"
              >
                Delete lesson
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
    </Reorder.Item>
  )
}
