"use client";

import { useState, useRef } from "react";
import { X, Upload, Loader2, File } from "lucide-react";
import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { uploadResourceFile } from "../../../components/helpers/upload-resources";

interface ResourcesUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  onUploadComplete: () => void;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

// Allowed file extensions and their MIME types
const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".txt",
  ".csv",
  ".xlsx",
  ".json",
  ".jpg",
  ".jpeg",
  ".png",
  ".svg",
  ".pptx",
  ".zip",
];
const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/json",
  "image/jpeg",
  "image/png",
  "image/svg+xml",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  "application/zip",
  "application/x-zip-compressed",
];

function isAllowedFileType(file: File): boolean {
  // Check by extension
  const fileName = file.name.toLowerCase();
  const hasAllowedExtension = ALLOWED_EXTENSIONS.some((ext) =>
    fileName.endsWith(ext)
  );

  // Check by MIME type (as fallback)
  const hasAllowedMimeType = ALLOWED_MIME_TYPES.includes(file.type);

  return hasAllowedExtension || hasAllowedMimeType;
}

function getAcceptString(): string {
  return ALLOWED_EXTENSIONS.join(",") + "," + ALLOWED_MIME_TYPES.join(",");
}

export function ResourcesUploadModal({
  isOpen,
  onClose,
  projectId,
  courseId,
  moduleId,
  lessonId,
  onUploadComplete,
}: ResourcesUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [currentFileProgress, setCurrentFileProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB in bytes

  const handleFileSelection = (files: FileList | null) => {
    if (!files || files.length === 0) return;

    const newFiles: File[] = [];
    const errors: string[] = [];

    Array.from(files).forEach((file) => {
      // Validate file type
      if (!isAllowedFileType(file)) {
        errors.push(`${file.name} is not a supported file type`);
        return;
      }

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        errors.push(`${file.name} exceeds ${formatFileSize(MAX_FILE_SIZE)}`);
        return;
      }

      // Check if file with same name already exists
      const exists = selectedFiles.some((f) => f.name === file.name);
      if (!exists) {
        newFiles.push(file);
      }
    });

    if (errors.length > 0) {
      setErrorMessage(errors.join(", "));
    } else {
      setErrorMessage(null);
    }

    if (newFiles.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newFiles]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileSelection(e.dataTransfer.files);
  };

  const handleBrowseClick = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
    setErrorMessage(null);
  };

  const handleRemoveAllFiles = () => {
    setSelectedFiles([]);
    setErrorMessage(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setUploadState("uploading");
    setCurrentFileIndex(0);
    setCurrentFileProgress(0);
    setErrorMessage(null);

    try {
      // Upload files sequentially
      for (let i = 0; i < selectedFiles.length; i++) {
        setCurrentFileIndex(i);
        setCurrentFileProgress(0);

        await uploadResourceFile(
          selectedFiles[i],
          { projectId, courseId, moduleId, lessonId },
          (progressValue: number) => {
            setCurrentFileProgress(progressValue);
          }
        );
      }

      setUploadState("success");
      setTimeout(() => {
        onUploadComplete();
        handleClose();
      }, 500);
    } catch (error) {
      console.error("Upload error:", error);
      setUploadState("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Failed to upload resources"
      );
    }
  };

  const handleClose = () => {
    if (uploadState === "uploading") return; // Prevent closing during upload
    setSelectedFiles([]);
    setUploadState("idle");
    setCurrentFileIndex(0);
    setCurrentFileProgress(0);
    setErrorMessage(null);
    onClose();
  };

  // Calculate overall progress
  const overallProgress =
    selectedFiles.length > 0
      ? Math.round(
          ((currentFileIndex + currentFileProgress / 100) /
            selectedFiles.length) *
            100
        )
      : 0;

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Upload Resources</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* File input - accepts multiple files with format restrictions */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept={getAcceptString()}
            onChange={(e) => handleFileSelection(e.target.files)}
            className="hidden"
          />

          {/* Upload area - always show to allow adding more files */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleBrowseClick}
            className={`
                            border-2 border-dashed rounded-lg p-6
                            flex flex-col items-center justify-center
                            cursor-pointer transition-colors
                            ${
                              isDragging
                                ? "border-accent bg-accent/10"
                                : "border-muted-foreground/70 bg-muted/70 hover:border-accent/50"
                            }
                        `}
          >
            <div className="flex items-center justify-center mb-4">
              <Image
                src="/images/icons/resources.svg"
                alt="Resources"
                width={52}
                height={52}
              />
            </div>
            <p className="text-sm font-medium mb-1.5">
              Drop your files here or click to browse
            </p>
            <p className="text-xs text-muted-foreground text-center">
              PDF, TXT, CSV, XLSX, JSON, JPG, PNG, SVG, PPTX, ZIP
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max size: {formatFileSize(MAX_FILE_SIZE)} per file
            </p>
          </div>

          {/* Selected files list */}
          {selectedFiles.length > 0 && (
            <div className="border rounded-md bg-muted/30 overflow-hidden">
              <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b">
                <span className="text-sm font-medium">
                  {selectedFiles.length} file
                  {selectedFiles.length > 1 ? "s" : ""} selected
                </span>
                {uploadState !== "uploading" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoveAllFiles();
                    }}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remove all
                  </button>
                )}
              </div>
              <div className="max-h-48 overflow-y-auto">
                {selectedFiles.map((file, index) => (
                  <div
                    key={`${file.name}-${index}`}
                    className="flex items-center gap-3 px-4 py-2.5 border-b last:border-b-0 hover:bg-muted/20"
                  >
                    <File className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{file.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                    </div>
                    {/* {uploadState === 'uploading' && currentFileIndex === index && (
                                            <span className="text-xs text-accent">
                                                {currentFileProgress}%
                                            </span>
                                        )} */}
                    {uploadState === "uploading" &&
                      currentFileIndex > index && (
                        <span className="text-xs text-green-600">Done</span>
                      )}
                    {uploadState !== "uploading" && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveFile(index);
                        }}
                        className="text-muted-foreground hover:text-foreground flex-shrink-0"
                        aria-label="Remove file"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upload progress */}
          {uploadState === "uploading" && (
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Uploading file {currentFileIndex + 1} of{" "}
                  {selectedFiles.length}
                </span>
                <span className="font-medium">{overallProgress}%</span>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-300"
                  style={{ width: `${overallProgress}%` }}
                />
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
              disabled={uploadState === "uploading"}
              className="cursor-pointer rounded-md hover:text-foreground"
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              className="bg-accent/80 hover:bg-accent/90 cursor-pointer rounded-md"
              disabled={
                selectedFiles.length === 0 || uploadState === "uploading"
              }
            >
              {uploadState === "uploading" ? (
                <>
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-1" />
                  Upload{" "}
                  {selectedFiles.length > 0 ? `(${selectedFiles.length})` : ""}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
