"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { useCourse, useUpdateCourse } from "@/lib/hooks/use-courses";
import { useProjectRouteId } from "@/lib/hooks/use-project-route-id";
import { Loader2 } from "lucide-react";

export default function CourseCertificatesPage() {
    const projectId = useProjectRouteId();
    const params = useParams();
    const courseId =
        typeof params?.courseId === "string" ? params.courseId : "";
    const { toast } = useToast();

    const { data: course, isLoading } = useCourse(projectId, courseId);
    const { mutateAsync: updateCourse, isPending: isUpdating } =
        useUpdateCourse(projectId, courseId);

    const [certificatesEnabled, setCertificatesEnabled] = useState(false);

    useEffect(() => {
        if (course?.certificatesEnabled !== undefined) {
            setCertificatesEnabled(course.certificatesEnabled);
        }
    }, [course?.certificatesEnabled]);

    const handleToggle = async (enabled: boolean) => {
        setCertificatesEnabled(enabled);

        try {
            await updateCourse({ certificatesEnabled: enabled });
            toast({
                title: enabled
                    ? "Certificates enabled"
                    : "Certificates disabled",
                description: enabled
                    ? "Students will receive certificates upon course completion."
                    : "Certificates are now disabled for this course.",
            });
        } catch (err) {
            // Revert on error
            setCertificatesEnabled(!enabled);
            toast({
                title: "Unable to update settings",
                description:
                    err instanceof Error ? err.message : "Please try again.",
                variant: "destructive",
            });
        }
    };

    if (!projectId || !courseId) {
        return (
            <div className="rounded-sm border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
                Missing course information.
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Page Header */}
            <div className="sticky top-0 z-10 -mx-4 md:-mx-6 xl:-mx-10 px-4 md:px-6 xl:px-10 pt-0 pb-4">
                <h2 className="text-3xl font-semibold font-literata tracking-wide">
                    Certificates
                </h2>
                <p className="text-lg font-stix text-foreground/80 mt-3 tracking-wide">
                    Configure completion certificates for this course.
                </p>
            </div>

            {/* Certificate Configuration */}
            <div className="rounded-md shadow-sm border border-neutral-100 bg-background p-8 max-w-3xl mx-auto">
                {isLoading ? (
                    <div className="space-y-4">
                        <div className="flex justify-center">
                            <div className="h-24 w-24 rounded-full bg-muted animate-pulse" />
                        </div>
                        <div className="h-6 rounded-sm bg-muted animate-pulse w-48 mx-auto" />
                        <div className="h-4 rounded-sm bg-muted animate-pulse w-full max-w-md mx-auto" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center text-center">
                        {/* Certificate Icon */}
                        <div className="mb-5">
                            <Image
                                src="/images/icons/certificate.svg"
                                alt="Certificate"
                                width={140}
                                height={140}
                                className="opacity-90"
                            />
                        </div>

                        {/* Title */}
                        <h3 className="text-2xl font-literata font-semibold text-foreground mb-4">
                            Course Completion Certificates
                        </h3>

                        {/* Description */}
                        <p className="text-foreground/70 max-w-3xl mb-10 leading-relaxed">
                            With this feature, you can award certificates of
                            completion to students who finish your course.
                            Certificates serve as proof of achievement and can
                            help motivate learners to complete the course.
                        </p>

                        {/* Toggle Section */}
                        <div className="flex items-center justify-center gap-4 p-6 rounded-lg bg-muted w-full max-w-lg">
                            <div className="flex-1 text-left">
                                <p className="font-medium text-foreground">
                                    {certificatesEnabled
                                        ? "Certificates Enabled"
                                        : "Certificates Disabled"}
                                </p>
                                <p className="text-sm text-foreground/60 mt-0.5">
                                    {certificatesEnabled
                                        ? "Students will receive certificates upon completion"
                                        : "Enable to award certificates to students"}
                                </p>
                            </div>
                            <div className="relative">
                                {/* {isUpdating && (
                                    <div className="absolute inset-0 flex items-center justify-center bg-background rounded-full">
                                        <Loader2 className="size-4 animate-spin text-accent" />
                                    </div>
                                )} */}
                                <Switch
                                    checked={certificatesEnabled}
                                    onCheckedChange={handleToggle}
                                    disabled={isUpdating}
                                    className="scale-125 cursor-pointer data-[state=checked]:bg-accent"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
