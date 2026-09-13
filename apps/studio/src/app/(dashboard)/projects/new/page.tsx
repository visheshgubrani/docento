"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { useCreateProject } from "@/lib/hooks/use-projects";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

const createProjectSchema = z.object({
    name: z
        .string()
        .min(1, "Project name is required")
        .max(100, "Project name must be less than 100 characters"),
    description: z
        .string()
        .max(500, "Description must be less than 500 characters")
        .optional(),
    authMode: z.enum(["MANAGED", "DELEGATED"], {
        message: "Authentication mode is required",
    }),
});

type CreateProjectFormData = z.infer<typeof createProjectSchema>;

export default function NewProjectPage() {
    const router = useRouter();
    const { toast } = useToast();
    const { mutateAsync: createProjectMutation, isPending } =
        useCreateProject();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors },
    } = useForm<CreateProjectFormData>({
        resolver: zodResolver(createProjectSchema),
        defaultValues: {
            name: "",
            description: "",
            authMode: "MANAGED",
        },
    });

    const onSubmit = async (data: CreateProjectFormData) => {
        try {
            await createProjectMutation({
                name: data.name,
                description: data.description,
                authMode: data.authMode,
            });

            toast({
                title: "Project created",
                description: `"${data.name}" has been created successfully.`,
            });

            router.push("/projects");
            router.refresh();
        } catch (error) {
            toast({
                title: "Error",
                description: "Failed to create project. Please try again.",
                variant: "destructive",
            });
        }
    };

    return (
        <div className="space-y-8 bg-dashboard-bg">
            {/* Header */}
            <div className="sticky top-0 z-10 space-y-3 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
                <h1 className="text-3xl font-semibold font-literata tracking-wide text-foreground">
                    Create New Project
                </h1>
                <p className="text-lg font-stix text-foreground/80 tracking-wide">
                    Set up a new project to organize your courses and manage
                    student enrollments
                </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
                {/* Project Name */}
                <div className="space-y-2">
                    <Label
                        htmlFor="name"
                        className="text-base font-medium text-foreground"
                    >
                        Project Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                        id="name"
                        placeholder="My Learning Project"
                        {...register("name")}
                        className={`w-full mt-2 bg-white border border-muted-foreground/70 shadow-none ${
                            errors.name ? "border-destructive" : ""
                        }`}
                    />
                    <p className="text-sm text-foreground/60">
                        Choose a unique name that identifies your project
                    </p>
                    {errors.name && (
                        <p className="text-sm text-destructive">
                            {errors.name.message}
                        </p>
                    )}
                </div>

                {/* Description */}
                <div className="space-y-2">
                    <Label
                        htmlFor="description"
                        className="text-base font-medium text-foreground"
                    >
                        Description
                    </Label>
                    <Textarea
                        id="description"
                        placeholder="A brief description of your project..."
                        rows={4}
                        {...register("description")}
                        className={`w-full mt-2 bg-white border border-muted-foreground/70 shadow-none ${
                            errors.description ? "border-destructive" : ""
                        }`}
                    />
                    <p className="text-sm text-foreground/60">
                        Briefly describe what this project is about (optional)
                    </p>
                    {errors.description && (
                        <p className="text-sm text-destructive">
                            {errors.description.message}
                        </p>
                    )}
                </div>

                {/* Auth Mode */}
                <div className="space-y-2">
                    <Label
                        htmlFor="authMode"
                        className="text-base font-medium text-foreground"
                    >
                        Authentication Mode{" "}
                        <span className="text-destructive">*</span>
                    </Label>
                    <select
                        id="authMode"
                        className={`w-full mt-2 rounded-md border border-muted-foreground/70 bg-white px-3 py-2 text-sm shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                            errors.authMode ? "border-destructive" : ""
                        }`}
                        {...register("authMode")}
                    >
                        <option value="MANAGED">
                            Managed (Docento handles auth)
                        </option>
                        <option value="DELEGATED">
                            Delegated (your system manages auth)
                        </option>
                    </select>
                    <p className="text-sm text-foreground/60">
                        Choose how users will authenticate to access this
                        project
                    </p>
                    <p className="text-xs text-foreground/50">
                        <strong className="text-foreground/70 font-medium">
                            Managed:
                        </strong>{" "}
                        Docento stores and manages student credentials.{" "}
                        <br />
                        <strong className="text-foreground/70 font-medium">
                            Delegated:
                        </strong>{" "}
                        You send authenticated users from your own system.
                    </p>
                    {errors.authMode && (
                        <p className="text-sm text-destructive">
                            {errors.authMode.message}
                        </p>
                    )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-4 pt-4">
                    <Button
                        type="button"
                        variant="outline"
                        className="bg-muted cursor-pointer text-foreground/85 rounded-sm hover:text-foreground"
                        onClick={() => reset()}
                        disabled={isPending}
                    >
                        Reset
                    </Button>
                    <Button
                        type="submit"
                        disabled={isPending}
                        className="bg-accent cursor-pointer rounded-sm hover:bg-accent/90 text-white"
                    >
                        {isPending ? "Creating..." : "Create Project"}
                    </Button>
                </div>
            </form>
        </div>
    );
}
