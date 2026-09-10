"use client";

import { useState } from "react";
import Link from "next/link";
import {
    ArrowRight,
    ExternalLink,
    MoreVertical,
    Pencil,
    RefreshCw,
    Trash2,
} from "lucide-react";
import { IoCreate } from "react-icons/io5";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { IoMdAddCircle } from "react-icons/io";
import { type Project } from "@/lib/api";
import {
    useProjects,
    useUpdateProject,
    useDeleteProject,
} from "@/lib/hooks/use-projects";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function ProjectsPage() {
    const {
        data: projects = [],
        isLoading,
        isError,
        error,
        refetch,
        isFetching,
    } = useProjects();

    const hasProjects = projects.length > 0;

    const handleRetry = () => {
        void refetch();
    };

    return (
        <div className="space-y-12 bg-dashboard-bg">
            {/* Header */}
            <div className="sticky top-0 z-10 flex flex-wrap items-end justify-between gap-4 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
                <div className="space-y-3">
                    <h1 className="text-3xl font-semibold font-literata tracking-wide text-foreground">
                        Projects
                    </h1>
                    <p className="text-lg font-stix text-foreground/80 tracking-wide">
                        Manage and organize your LMS tenants
                    </p>
                </div>
                <div className="flex items-center gap-3.5">
                    <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 rounded-sm text-foreground/85 bg-muted cursor-pointer hover:text-foreground"
                        onClick={handleRetry}
                    >
                        <RefreshCw
                            className={cn(
                                "size-4.5",
                                (isLoading || isFetching) && "animate-spin",
                            )}
                        />
                        <span className="hidden sm:inline">Refresh</span>
                    </Button>
                    <Button
                        size="sm"
                        className="gap-2 rounded-sm bg-accent cursor-pointer hover:bg-accent/90 text-white"
                        asChild
                    >
                        <Link href="/projects/new">
                            <IoMdAddCircle className="size-5" />
                            New Project
                        </Link>
                    </Button>
                </div>
            </div>

            {/* Content */}
            {isLoading ? (
                <LoadingState />
            ) : isError ? (
                <ErrorState
                    message={
                        error?.message ??
                        "Failed to fetch projects. Please try again."
                    }
                    onRetry={handleRetry}
                />
            ) : hasProjects ? (
                <ProjectGrid projects={projects} />
            ) : (
                <EmptyState />
            )}
        </div>
    );
}

function LoadingState() {
    return (
        <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
            {[...Array(6)].map((_, i) => (
                <div
                    key={i}
                    className="rounded-xl border border-neutral-200 bg-white p-5 animate-pulse"
                >
                    {/* Header skeleton */}
                    <div className="flex items-start justify-between gap-3 mb-4">
                        <div className="flex-1 space-y-2">
                            <div className="h-5 w-3/4 rounded bg-neutral-200" />
                            <div className="h-3 w-1/2 rounded bg-neutral-100" />
                        </div>
                        <div className="h-8 w-8 rounded bg-neutral-100" />
                    </div>
                    {/* Content skeleton */}
                    <div className="space-y-3 mt-5">
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-20 rounded bg-neutral-100" />
                            <div className="h-3 w-32 rounded bg-neutral-100" />
                        </div>
                        <div className="flex items-center justify-between">
                            <div className="h-3 w-20 rounded bg-neutral-100" />
                            <div className="h-3 w-24 rounded bg-neutral-100" />
                        </div>
                    </div>
                    {/* Footer skeleton */}
                    <div className="mt-5 pt-3 border-t border-neutral-100">
                        <div className="flex justify-between items-center">
                            <div className="h-4 w-28 rounded bg-neutral-200" />
                            <div className="h-5 w-16 rounded-full bg-neutral-100" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ErrorState({
    message,
    onRetry,
}: {
    message: string;
    onRetry: () => void;
}) {
    return (
        <Card className="border-destructive/20 bg-destructive/5">
            <CardHeader className="pb-3">
                <CardTitle className="text-base text-destructive">
                    Unable to load projects
                </CardTitle>
                <CardDescription className="text-destructive/70">
                    {message}
                </CardDescription>
            </CardHeader>
            <CardFooter className="pt-0">
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="gap-2 cursor-pointer"
                >
                    <RefreshCw className="size-4" />
                    Try again
                </Button>
            </CardFooter>
        </Card>
    );
}

function EmptyState() {
    return (
        <div className="flex min-h-[50vh] items-center justify-center bg-white/70 border rounded-xl">
            <div className="flex max-w-md flex-col items-center text-center">
                <div className="mb-6 flex size-20 items-center justify-center rounded-md bg-muted-foreground/10">
                    <IoCreate className="size-14 text-foreground/80" />
                </div>
                <h2 className="mb-4 text-3xl font-medium text-foreground">
                    Create your first project
                </h2>
                <p className="mb-7 text-sm leading-relaxed text-foreground/70">
                    Projects keep courses, students, and branding isolated per
                    tenant. Spin one up in seconds to start building.
                </p>
                <div className="flex flex-wrap items-center justify-center gap-5">
                    <Button
                        className="gap-1.5 bg-sidebar py-5 cursor-pointer hover:bg-sidebar/90 text-white"
                        asChild
                    >
                        <Link href="/projects/new">
                            <IoMdAddCircle className="size-5" />
                            New project
                        </Link>
                    </Button>
                    <Button
                        asChild
                        variant="outline"
                        className="gap-2 text-foreground/80 py-5 cursor-pointer hover:bg-transparent hover:text-foreground"
                    >
                        <a
                            href="https://docs.example.com"
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            View docs
                            <ExternalLink className="size-5" />
                        </a>
                    </Button>
                </div>
            </div>
        </div>
    );
}

function ProjectGrid({ projects }: { projects: Project[] }) {
    const { toast } = useToast();
    const { mutateAsync: updateProject, isPending: isUpdating } =
        useUpdateProject();
    const { mutateAsync: deleteProject, isPending: isDeleting } =
        useDeleteProject();

    const [editingProject, setEditingProject] = useState<Project | null>(null);
    const [editName, setEditName] = useState("");
    const [editDescription, setEditDescription] = useState("");
    const [deletingProject, setDeletingProject] = useState<Project | null>(
        null,
    );

    const handleEditClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setEditingProject(project);
        setEditName(project.name);
        setEditDescription(project.description || "");
    };

    const handleDeleteClick = (e: React.MouseEvent, project: Project) => {
        e.preventDefault();
        e.stopPropagation();
        setDeletingProject(project);
    };

    const handleEditSave = async () => {
        if (!editingProject || !editName.trim()) return;

        try {
            await updateProject({
                projectId: editingProject.id,
                input: { name: editName.trim() },
            });
            toast({
                title: "Project updated",
                description: `"${editName.trim()}" has been updated successfully.`,
            });
            setEditingProject(null);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to update project. Please try again.",
                variant: "destructive",
            });
        }
    };

    const handleDeleteConfirm = async () => {
        if (!deletingProject) return;

        try {
            await deleteProject(deletingProject.id);
            toast({
                title: "Project deleted",
                description: `"${deletingProject.name}" has been deleted successfully.`,
            });
            setDeletingProject(null);
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to delete project. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <>
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {projects.map((project) => (
                    <Link
                        key={project.id}
                        href={`/p/${project.id}/overview`}
                        className="group block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2"
                    >
                        <Card className="h-full border-border/80 hover:border-muted-foreground/40 bg-card transition-all duration-200 hover:shadow-sm">
                            <CardHeader className="pb-3">
                                <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0 flex-1">
                                        <CardTitle className="truncate text-lg font-noto font-semibold text-foreground uppercase">
                                            {project.name}
                                        </CardTitle>
                                        <CardDescription className="mt-1 truncate text-xs text-muted-foreground">
                                            {project.slug}
                                        </CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            asChild
                                            onClick={(e) => e.preventDefault()}
                                        >
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="size-6 text-foreground/70 hover:text-foreground hover:bg-muted cursor-pointer"
                                                onClick={(e) =>
                                                    e.stopPropagation()
                                                }
                                            >
                                                <MoreVertical className="size-5" />
                                                <span className="sr-only">
                                                    More options
                                                </span>
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent
                                            align="end"
                                            className="w-40"
                                        >
                                            <DropdownMenuItem
                                                onClick={(e) =>
                                                    handleEditClick(e, project)
                                                }
                                                className="cursor-pointer hover:bg-muted"
                                            >
                                                <Pencil className="mr-2 size-4" />
                                                Edit Project
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={(e) =>
                                                    handleDeleteClick(
                                                        e,
                                                        project,
                                                    )
                                                }
                                                className="cursor-pointer hover:bg-muted text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="mr-2 size-4" />
                                                Delete Project
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-2.5 mt-2 pt-0">
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-foreground/80">
                                        Project ID
                                    </span>
                                    <span className="font-noto text-foreground/40">
                                        {project.id}
                                    </span>
                                </div>
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-foreground/80">
                                        Created At
                                    </span>
                                    <time
                                        dateTime={project.createdAt}
                                        className="text-foreground/40"
                                    >
                                        {new Date(
                                            project.createdAt,
                                        ).toLocaleDateString("en-US", {
                                            month: "short",
                                            day: "numeric",
                                            year: "numeric",
                                        })}
                                    </time>
                                </div>
                            </CardContent>
                            <CardFooter className="pt-3 pb-4">
                                <div className="flex w-full items-center justify-between">
                                    <div className="flex items-center gap-1 text-sm font-semibold font-noto text-accent transition-all group-hover:text-violet-800">
                                        <span>Open dashboard</span>
                                        <ArrowRight className="size-4 transition-transform duration-150 ease-in-out group-hover:translate-x-0.5" />
                                    </div>
                                    <span className="font-noto tracking-tight rounded-full bg-muted px-3 py-0.5 text-[10px] font-medium capitalize text-foreground/55">
                                        {project.authMode.toLowerCase()}
                                    </span>
                                </div>
                            </CardFooter>
                        </Card>
                    </Link>
                ))}
            </div>

            {/* Edit Project Dialog */}
            <Dialog
                open={!!editingProject}
                onOpenChange={(open) => !open && setEditingProject(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Edit Project</DialogTitle>
                        <DialogDescription className="text-foreground/70">
                            Update your project name.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 pb-4">
                        <div className="space-y-2">
                            {/* <Label htmlFor="edit-name">Project Name</Label> */}
                            <Input
                                id="edit-name"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Enter project name"
                                className="bg-white py-6 rounded-sm"
                            />
                        </div>
                        {/* <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                placeholder="Enter project description (optional)"
                rows={3}
                className="bg-white"
              />
            </div> */}
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setEditingProject(null)}
                            disabled={isUpdating}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleEditSave}
                            disabled={isUpdating || !editName.trim()}
                            className="bg-accent hover:bg-accent/90 text-white cursor-pointer"
                        >
                            {isUpdating ? "Saving..." : "Save Changes"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={!!deletingProject}
                onOpenChange={(open) => !open && setDeletingProject(null)}
            >
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Delete Project</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete{" "}
                            <strong>"{deletingProject?.name}"</strong>? This
                            action cannot be undone. All courses, students, and
                            data associated with this project will be
                            permanently deleted.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setDeletingProject(null)}
                            disabled={isDeleting}
                            className="cursor-pointer"
                        >
                            Cancel
                        </Button>
                        <Button
                            onClick={handleDeleteConfirm}
                            disabled={isDeleting}
                            className="bg-destructive hover:bg-destructive/90 text-white cursor-pointer"
                        >
                            {isDeleting ? "Deleting..." : "Delete Project"}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
}
