"use client";

import { Download, ExternalLink, File, Trash2, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { type Upload } from "@/lib/api";

interface ResourcesContentPreviewProps {
    uploads: Upload[];
    onDeleteUpload?: (uploadId: string) => void;
    deletingUploadId?: string | null;
}

// Get file icon based on file type
function getFileIcon(type: string): string {
    if (type.includes("pdf")) {
        return "/images/icons/pdf.svg";
    }
    return "/images/icons/resources.svg";
}

// Get file type label
function getFileTypeLabel(type: string): string {
    if (type.includes("pdf")) return "PDF Document";
    if (type.includes("image")) return "Image";
    if (type.includes("video")) return "Video";
    if (type.includes("audio")) return "Audio";
    if (type.includes("text")) return "Text File";
    if (type.includes("zip") || type.includes("rar") || type.includes("tar"))
        return "Archive";
    if (type.includes("word") || type.includes("doc")) return "Word Document";
    if (
        type.includes("excel") ||
        type.includes("sheet") ||
        type.includes("xls")
    )
        return "Spreadsheet";
    if (
        type.includes("powerpoint") ||
        type.includes("presentation") ||
        type.includes("ppt")
    )
        return "Presentation";
    return "File";
}

// Extract display name from title or URL
function getDisplayName(upload: Upload): string {
    if (upload.title) {
        return upload.title;
    }
    const rawName = upload.fileUrl.split("/").pop()?.split("?")[0] || "file";
    return rawName;
}

export function ResourcesContentPreview({
    uploads,
    onDeleteUpload,
    deletingUploadId,
}: ResourcesContentPreviewProps) {
    const handleView = (fileUrl: string) => {
        window.open(fileUrl, "_blank", "noopener,noreferrer");
    };

    const handleDownload = async (fileUrl: string, fileName: string) => {
        try {
            const response = await fetch(fileUrl);
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = fileName;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
        } catch (error) {
            console.error("Download failed:", error);
            // Fallback: open in new tab
            window.open(fileUrl, "_blank", "noopener,noreferrer");
        }
    };

    if (uploads.length === 0) {
        return (
            <div className="rounded-md border bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                    No resources uploaded yet.
                </p>
            </div>
        );
    }

    return (
        <div className="rounded-md border bg-card overflow-hidden">
            <div className="divide-y">
                {uploads.map((upload) => {
                    const displayName = getDisplayName(upload);
                    const fileType = getFileTypeLabel(upload.type);
                    const iconSrc = getFileIcon(upload.type);

                    return (
                        <div
                            key={upload.id}
                            className="p-4 hover:bg-muted/30 transition-colors"
                        >
                            <div className="flex items-start gap-4">
                                {/* File Icon */}
                                <div className="flex mt-1 items-center justify-center flex-shrink-0">
                                    {iconSrc.includes("pdf") ? (
                                        <Image
                                            src={iconSrc}
                                            alt={fileType}
                                            width={36}
                                            height={36}
                                        />
                                    ) : (
                                        <div className="w-9 h-9 flex items-center justify-center bg-muted rounded">
                                            <File className="w-5 h-5 text-muted-foreground" />
                                        </div>
                                    )}
                                </div>

                                {/* File Info */}
                                <div className="flex-1 min-w-0">
                                    <h4 className="text-sm font-medium mb-0.5 truncate">
                                        {displayName}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mb-3">
                                        {fileType}
                                    </p>

                                    {/* Action Buttons */}
                                    <div className="flex flex-wrap items-center gap-2">
                                        <Button
                                            onClick={() =>
                                                handleView(upload.fileUrl)
                                            }
                                            size="sm"
                                            variant="default"
                                            className="bg-accent/70 hover:bg-accent/80 rounded-sm cursor-pointer h-8 text-xs"
                                        >
                                            <ExternalLink className="w-3.5 h-3.5 mr-1" />
                                            View
                                        </Button>
                                        <Button
                                            onClick={() =>
                                                handleDownload(
                                                    upload.fileUrl,
                                                    displayName
                                                )
                                            }
                                            size="sm"
                                            variant="outline"
                                            className="rounded-sm cursor-pointer hover:text-foreground h-8 text-xs"
                                        >
                                            <Download className="w-3.5 h-3.5 mr-1" />
                                            Download
                                        </Button>
                                        {onDeleteUpload && (
                                            <Button
                                                onClick={() =>
                                                    onDeleteUpload(upload.id)
                                                }
                                                size="sm"
                                                variant="ghost"
                                                disabled={
                                                    deletingUploadId !== null
                                                }
                                                className="rounded-sm cursor-pointer text-muted-foreground hover:text-destructive h-8 text-xs"
                                            >
                                                {deletingUploadId ===
                                                upload.id ? (
                                                    <>
                                                        <Loader2 className="w-3.5 h-3.5 mr-0.5 animate-spin" />
                                                        Removing...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Trash2 className="w-3.5 h-3.5 mr-0.5" />
                                                        Remove
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
