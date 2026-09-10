"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"
import { Underline } from "@tiptap/extension-underline"
import { Placeholder } from "@tiptap/extension-placeholder"

// --- UI Primitives ---
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import {
    ColorHighlightPopover,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
    LinkPopover,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

interface RichTextEditorProps {
    content?: string
    onChange?: (html: string) => void
    placeholder?: string
    className?: string
    editable?: boolean
}

export function RichTextEditor({
    content = "",
    onChange,
    placeholder = "Start typing...",
    className,
    editable = true,
}: RichTextEditorProps) {
    const toolbarRef = useRef<HTMLDivElement>(null)

    const editor = useEditor({
        immediatelyRender: false,
        editable,
        editorProps: {
            attributes: {
                autocomplete: "off",
                autocorrect: "off",
                autocapitalize: "off",
                "aria-label": "Editor content area",
                class: "simple-editor",
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
            TextAlign.configure({ types: ["heading", "paragraph"] }),
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
                placeholder,
            }),
            ImageUploadNode.configure({
                accept: "image/*",
                maxSize: MAX_FILE_SIZE,
                limit: 3,
                upload: handleImageUpload,
                onError: (error) => console.error("Upload failed:", error),
            }),
        ],
        content,
        onUpdate: ({ editor }) => {
            onChange?.(editor.getHTML())
        },
    })

    // Update editor content when prop changes
    useEffect(() => {
        if (editor && content !== editor.getHTML()) {
            editor.commands.setContent(content)
        }
    }, [content, editor])

    return (
        <div className={`simple-editor-wrapper embedded ${className || ""}`}>
            <EditorContext.Provider value={{ editor }}>
                {editable && (
                    <Toolbar ref={toolbarRef}>
                        <ToolbarGroup>
                            <UndoRedoButton action="undo" />
                            <UndoRedoButton action="redo" />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <HeadingDropdownMenu levels={[1, 2, 3]} />
                            <ListDropdownMenu types={["bulletList", "orderedList", "taskList"]} />
                            <BlockquoteButton />
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
                            <TextAlignButton align="left" />
                            <TextAlignButton align="center" />
                            <TextAlignButton align="right" />
                        </ToolbarGroup>

                        <ToolbarSeparator />

                        <ToolbarGroup>
                            <ImageUploadButton text="Image" />
                        </ToolbarGroup>

                        <Spacer />
                    </Toolbar>
                )}

                <EditorContent
                    editor={editor}
                    role="presentation"
                    className="simple-editor-content"
                />
            </EditorContext.Provider>
        </div>
    )
}

// Read-only viewer for displaying rich text content
export function RichTextViewer({ content, className }: { content: string; className?: string }) {
    return (
        <RichTextEditor
            content={content}
            editable={false}
            className={className}
        />
    )
}
