'use client'

import { useState, useEffect, useCallback } from 'react'
import { useEditor, EditorContent, EditorContext } from '@tiptap/react'
import { StarterKit } from '@tiptap/starter-kit'
import { Image } from '@tiptap/extension-image'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import { TextAlign } from '@tiptap/extension-text-align'
import { Typography } from '@tiptap/extension-typography'
import { Highlight } from '@tiptap/extension-highlight'
import { Subscript } from '@tiptap/extension-subscript'
import { Superscript } from '@tiptap/extension-superscript'
import { Selection } from '@tiptap/extensions'
import { Underline } from '@tiptap/extension-underline'
import { Placeholder } from '@tiptap/extension-placeholder'

import { Spacer } from '@/components/tiptap-ui-primitive/spacer'
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from '@/components/tiptap-ui-primitive/toolbar'

import { ImageUploadNode } from '@/components/tiptap-node/image-upload-node/image-upload-node-extension'
import { HorizontalRule } from '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension'
import '@/components/tiptap-node/blockquote-node/blockquote-node.scss'
import '@/components/tiptap-node/code-block-node/code-block-node.scss'
import '@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss'
import '@/components/tiptap-node/list-node/list-node.scss'
import '@/components/tiptap-node/image-node/image-node.scss'
import '@/components/tiptap-node/heading-node/heading-node.scss'
import '@/components/tiptap-node/paragraph-node/paragraph-node.scss'

import { HeadingDropdownMenu } from '@/components/tiptap-ui/heading-dropdown-menu'
import { ImageUploadButton } from '@/components/tiptap-ui/image-upload-button'
import { ListDropdownMenu } from '@/components/tiptap-ui/list-dropdown-menu'
import { BlockquoteButton } from '@/components/tiptap-ui/blockquote-button'
import { CodeBlockButton } from '@/components/tiptap-ui/code-block-button'
import { ColorHighlightPopover } from '@/components/tiptap-ui/color-highlight-popover'
import { LinkPopover } from '@/components/tiptap-ui/link-popover'
import { MarkButton } from '@/components/tiptap-ui/mark-button'
import { TextAlignButton } from '@/components/tiptap-ui/text-align-button'
import { UndoRedoButton } from '@/components/tiptap-ui/undo-redo-button'

import { createLessonImageUploadHandler, MAX_FILE_SIZE } from '@/lib/tiptap-utils'
import { Button } from '@/components/ui/button'

import '@/components/tiptap-templates/simple/simple-editor.scss'

interface TextImagesEditorProps {
    lessonTitle: string
    projectId: string
    courseId: string
    moduleId: string
    lessonId: string
    initialContent?: string
    onSave: (content: string) => Promise<void>
    onCancel: () => void
    isSaving?: boolean
}

export function TextImagesEditor({
    lessonTitle,
    projectId,
    courseId,
    moduleId,
    lessonId,
    initialContent,
    onSave,
    onCancel,
    isSaving = false,
}: TextImagesEditorProps) {
    const [hasChanges, setHasChanges] = useState(false)

    // Parse initial content (it's stored as stringified JSON)
    const parsedInitialContent = initialContent
        ? (() => {
            try {
                return JSON.parse(initialContent)
            } catch {
                return initialContent
            }
        })()
        : ''

    const editor = useEditor({
        immediatelyRender: false,
        editorProps: {
            attributes: {
                autocomplete: 'off',
                autocorrect: 'off',
                autocapitalize: 'off',
                'aria-label': 'Lesson content editor',
                class: 'simple-editor',
            },
        },
        extensions: [
            StarterKit.configure({
                horizontalRule: false,
                link: {
                    openOnClick: false,
                    enableClickSelection: true,
                },
            }),
            HorizontalRule,
            TextAlign.configure({ types: ['heading', 'paragraph'] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Highlight.configure({ multicolor: true }),
            Image,
            Typography,
            Superscript,
            Subscript,
            Underline,
            Selection,
            Placeholder.configure({
                placeholder: 'Start writing your lesson content...',
            }),
            ImageUploadNode.configure({
                accept: 'image/*',
                maxSize: MAX_FILE_SIZE,
                limit: 5,
                upload: createLessonImageUploadHandler(
                    projectId,
                    courseId,
                    moduleId,
                    lessonId
                ),
                onError: (error) => console.error('Image upload failed:', error),
            }),
        ],
        content: parsedInitialContent,
        onUpdate: () => {
            setHasChanges(true)
        },
    })

    const handleSave = useCallback(async () => {
        if (!editor) return

        // Get the JSON content and stringify it
        const jsonContent = editor.getJSON()
        const stringifiedContent = JSON.stringify(jsonContent)

        await onSave(stringifiedContent)
        setHasChanges(false)
    }, [editor, onSave])

    const handleCancel = useCallback(() => {
        if (hasChanges) {
            const confirmed = window.confirm(
                'You have unsaved changes. Are you sure you want to cancel?'
            )
            if (!confirmed) return
        }
        onCancel()
    }, [hasChanges, onCancel])

    return (
        <div className="flex max-w-4xl mx-auto w-full border border-neutral-200 flex-col bg-neutral-50">
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white border-b border-neutral-200 px-6 py-4">
                <h1 className="text-2xl font-semibold font-literata">
                    Lesson: <span className="ml-1 text-foreground/90">{lessonTitle}</span>
                </h1>
            </div>

            {/* Content Block Header */}
            <div className="bg-neutral-50 border-b border-neutral-200 px-6 py-3">
                <h2 className="text-lg font-light text-foreground">Text and images</h2>
            </div>

            {/* Editor Area */}
            <div className="flex-1 overflow-auto bg-white">
                <div className="max-w-4xl w-full px-6 pt-3 pb-4">
                    <EditorContext.Provider value={{ editor }}>
                        <Toolbar className="mb-4 sticky top-0 z-20 bg-neutral-50 shadow-sm">
                            <ToolbarGroup>
                                <UndoRedoButton action="undo" />
                                <UndoRedoButton action="redo" />
                            </ToolbarGroup>

                            <ToolbarSeparator />

                            <ToolbarGroup>
                                <HeadingDropdownMenu levels={[1, 2, 3, 4]} />
                                <ListDropdownMenu
                                    types={['bulletList', 'orderedList', 'taskList']}
                                />
                                <BlockquoteButton />
                                <CodeBlockButton />
                            </ToolbarGroup>

                            <ToolbarSeparator />

                            <ToolbarGroup>
                                <MarkButton type="bold" />
                                <MarkButton type="italic" />
                                <MarkButton type="strike" />
                                <MarkButton type="underline" />
                                <MarkButton type="code" />
                                <ColorHighlightPopover />
                                <LinkPopover />
                            </ToolbarGroup>

                            <ToolbarSeparator />

                            <ToolbarGroup>
                                <MarkButton type="superscript" />
                                <MarkButton type="subscript" />
                            </ToolbarGroup>

                            <ToolbarSeparator />

                            <ToolbarGroup>
                                <TextAlignButton align="left" />
                                <TextAlignButton align="center" />
                                <TextAlignButton align="right" />
                                <TextAlignButton align="justify" />
                            </ToolbarGroup>

                            <ToolbarSeparator />

                            <ToolbarGroup>
                                <ImageUploadButton text="Add Image" />
                            </ToolbarGroup>

                            <Spacer />
                        </Toolbar>

                        <EditorContent
                            editor={editor}
                            role="presentation"
                            className="simple-editor-content min-h-[392px]"
                        />
                    </EditorContext.Provider>
                </div>
            </div>

            {/* Footer with Cancel and Save buttons */}
            <div className="sticky bottom-0 bg-neutral-50 border-t border-neutral-200 px-6 py-4">
                <div className="mx-auto flex justify-end gap-3">
                    <Button
                        variant="outline"
                        onClick={handleCancel}
                        disabled={isSaving}
                        className="px-6 rounded-md cursor-pointer hover:text-foreground"
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={handleSave}
                        disabled={isSaving || !hasChanges}
                        className="px-6 bg-accent/80 cursor-pointer hover:bg-accent/90 rounded-md"
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </Button>
                </div>
            </div>
        </div>
    )
}
