"use client";

import { useState, useRef, type DragEvent } from "react";
import Image from "next/image";
import { X, Loader2, Sparkles } from "lucide-react";
import { BsStars } from "react-icons/bs";
import { CiCircleAlert } from "react-icons/ci";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { uploadVideoFile } from "@/app/(dashboard)/p/[projectId]/courses/[courseId]/components/helpers/upload-video";
import { TbLoaderQuarter } from "react-icons/tb";

type VideoUploadModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonTitle: string;
  projectId: string;
  courseId: string;
  moduleId: string;
  lessonId: string;
  onUploadComplete?: () => void;
};

function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}

export function VideoUploadModal({
  open,
  onOpenChange,
  lessonTitle,
  projectId,
  courseId,
  moduleId,
  lessonId,
  onUploadComplete,
}: VideoUploadModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [progress, setProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [generateSubtitle, setGenerateSubtitle] = useState(false);
  const [generateChapters, setGenerateChapters] = useState(false);

  const handleFileSelection = (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("video/")) {
      setErrorMessage("Please select a video file");
      return;
    }

    // Validate file size (5GB max)
    const maxSize = 5 * 1024 * 1024 * 1024; // 5GB
    if (file.size > maxSize) {
      setErrorMessage("File size must be less than 5 GB");
      return;
    }

    setSelectedFile(file);
    setErrorMessage(null);
    setUploadState("idle");
    setProgress(0);
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFileSelection(event.dataTransfer.files);
  };

  const handleBrowse = () => {
    fileInputRef.current?.click();
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    setUploadState("idle");
    setProgress(0);
    setErrorMessage(null);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadState("uploading");
    setProgress(0);
    setErrorMessage(null);

    try {
      await uploadVideoFile(
        selectedFile,
        {
          projectId,
          courseId,
          moduleId,
          lessonId,
          generateSubtitle,
          generateChapters,
        },
        (nextProgress) => {
          setProgress(nextProgress);
        }
      );

      setUploadState("success");
      setProgress(100);

      // Close modal and notify parent after a brief delay
      setTimeout(() => {
        onOpenChange(false);
        setSelectedFile(null);
        setUploadState("idle");
        setProgress(0);
        onUploadComplete?.();
      }, 1000);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Upload failed";
      setErrorMessage(message);
      setUploadState("error");
    }
  };

  const handleClose = () => {
    if (uploadState === "uploading") return; // Prevent closing during upload
    onOpenChange(false);
    // Reset state when closing
    setSelectedFile(null);
    setUploadState("idle");
    setProgress(0);
    setErrorMessage(null);
    setGenerateSubtitle(false);
    setGenerateChapters(false);
  };

  const isUploading = uploadState === "uploading";

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-semibold">Add Video</DialogTitle>
          <DialogDescription className="text-foreground/70">
            Upload videos for your lesson. Each file can be up to 5 GB.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Upload Box */}
          {selectedFile ? (
            <div className="relative rounded-lg border border-neutral-200 bg-neutral-50 p-6">
              {/* Close button */}
              <button
                type="button"
                onClick={handleRemoveFile}
                disabled={isUploading}
                className={cn(
                  "absolute right-3 top-3 p-1 rounded-md hover:bg-neutral-200 transition-colors",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                <X className="size-4 text-foreground/70" />
              </button>

              <div className="flex flex-col items-center">
                {/* Video Icon */}
                <div className="size-16 mb-3">
                  <Image
                    src="/images/icons/video-play.svg"
                    alt="Video"
                    width={64}
                    height={64}
                    className="w-full h-full object-contain"
                  />
                </div>

                {/* File Name */}
                <p className="text-sm font-medium text-foreground text-center truncate max-w-full">
                  {selectedFile.name}
                </p>

                {/* File Size */}
                <p className="text-xs text-foreground/60 mt-1">
                  {formatFileSize(selectedFile.size)}
                </p>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                "rounded-lg border-2 border-dashed border-neutral-300 bg-neutral-50 p-10 text-center transition-colors cursor-pointer",
                isDragging && "border-accent bg-accent/5"
              )}
              onDragOver={(event) => {
                event.preventDefault();
                setIsDragging(true);
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={handleBrowse}
            >
              <div className="flex flex-col items-center">
                <div className="size-16 mb-4">
                  <Image
                    src="/images/icons/video-play.svg"
                    alt="Video"
                    width={64}
                    height={64}
                    className="w-full h-full object-contain opacity-60"
                  />
                </div>
                <p className="text-sm font-medium text-foreground">
                  Drop your video here or click to browse
                </p>
                <p className="text-xs text-foreground/60 mt-1">
                  MP4, MOV, WebM up to 5 GB
                </p>
              </div>
            </div>
          )}

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={(e) => {
              handleFileSelection(e.target.files);
              e.target.value = "";
            }}
          />

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-xs text-foreground/80">
                <TbLoaderQuarter className="size-4 animate-spin" />
                <span>{Math.round(progress)}%</span>
              </div>
              <div className="h-2 w-full rounded-full bg-neutral-200">
                <div
                  className="h-2 rounded-full bg-accent transition-[width] duration-300"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Success Message */}
          {uploadState === "success" && (
            <div className="flex items-center gap-2 text-sm text-emerald-600">
              <span>✓</span>
              <span>Upload completed! Video is now processing...</span>
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="text-sm text-destructive">{errorMessage}</div>
          )}

          {/* AI Processing Options */}
          <div className="rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-4">
            <div className="mb-4 w-full bg-neutral-200/40 py-2 px-1 rounded-lg flex items-center gap-1.5">
              <BsStars className="size-5 text-violet-500" />
              <p className="text-sm font-semibold text-foreground">
                AI processing
              </p>
            </div>
            <div className="space-y-3">
              <div className="flex items-start border-b pb-2 gap-3">
                <Checkbox
                  id="modal-generate-subtitle"
                  checked={generateSubtitle}
                  onCheckedChange={(checked) => {
                    const next = checked === true;
                    setGenerateSubtitle(next);
                    if (!next) setGenerateChapters(false);
                  }}
                  disabled={isUploading}
                  className="cursor-pointer border-foreground/50 bg-white mt-1 shadow-sm"
                />
                <div>
                  <Label
                    htmlFor="modal-generate-subtitle"
                    className="cursor-pointer text-sm font-medium text-foreground"
                  >
                    AI-generated subtitles
                  </Label>
                  <p className="mt-1 text-xs text-foreground/70">
                    Automatically transcribe and add captions to this video.
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Checkbox
                  id="modal-generate-chapters"
                  checked={generateChapters}
                  onCheckedChange={(checked) =>
                    setGenerateChapters(checked === true)
                  }
                  disabled={isUploading || !generateSubtitle}
                  className="cursor-pointer border-foreground/50 mt-1"
                />
                <div>
                  <Label
                    htmlFor="modal-generate-chapters"
                    className={cn(
                      "cursor-pointer text-sm font-medium",
                      !generateSubtitle
                        ? "text-foreground/50"
                        : "text-foreground"
                    )}
                  >
                    AI-generated chapters
                  </Label>
                  <p className="text-xs text-foreground/70 mt-1">
                    {generateSubtitle
                      ? "Break the video into titled chapters automatically."
                      : "Requires AI subtitles to be enabled."}
                    {!generateSubtitle && (
                      <CiCircleAlert className="ml-1 inline-block size-4 align-[-1px] text-foreground/70" />
                    )}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className="w-full bg-accent hover:bg-accent/90 text-white cursor-pointer"
          >
            {isUploading ? (
              <>
                {/* <Loader2 className="mr-2 size-4 animate-spin" /> */}
                Uploading...
              </>
            ) : (
              "Upload Video"
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
