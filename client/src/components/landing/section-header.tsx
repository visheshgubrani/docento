"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SectionButton {
    label: string;
    href: string;
    variant?: "primary" | "text";
    icon?: React.ReactNode;
}

interface SectionHeaderProps {
    badge?: string;
    title: string | React.ReactNode;
    description?: string;
    buttons?: SectionButton[];
    align?: "center" | "left";
    theme?: "light" | "dark";
    className?: string;
    titleClassName?: string;
    descriptionClassName?: string;
    animated?: boolean;
}

export function SectionHeader({
    badge,
    title,
    description,
    buttons,
    align = "center",
    theme = "light",
    className,
    titleClassName,
    descriptionClassName,
    animated = true,
}: SectionHeaderProps) {
    const Wrapper = animated ? motion.div : "div";
    const animationProps = animated
        ? {
            initial: { opacity: 0, y: 20 },
            whileInView: { opacity: 1, y: 0 },
            viewport: { once: true, margin: "-100px" },
            transition: { duration: 0.5 },
        }
        : {};

    const isDark = theme === "dark";

    return (
        <Wrapper
            {...animationProps}
            className={cn(
                "flex flex-col gap-4 mb-16",
                align === "center" && "items-center text-center",
                align === "left" && "items-start text-left",
                className,
            )}
        >
            {badge && (
                <span
                    className={cn(
                        "inline-flex items-center rounded-full bg-accent-100 border border-accent-400 px-4 py-1.5 text-sm font-semibold font-inter",
                        isDark
                            ? "bg-white/10 text-accent-300"
                            : "bg-accent-100 text-violet-700",
                    )}
                >
                    {badge}
                </span>
            )}

            <h2
                className={cn(
                    "font-serif text-5xl md:text-6xl leading-[1.1]",
                    isDark ? "text-white" : "text-foreground",
                    titleClassName,
                )}
            >
                {title}
            </h2>

            {description && (
                <p
                    className={cn(
                        "text-[1.125rem] font-inter max-w-2xl leading-[1.5]",
                        isDark ? "text-white/70" : "text-foreground/70",
                        align === "center" && "mx-auto",
                        descriptionClassName,
                    )}
                >
                    {description}
                </p>
            )}

            {buttons && buttons.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 mt-2">
                    {buttons.map((button, index) => (
                        <Button
                            key={index}
                            asChild
                            variant={
                                button.variant === "text" ? "ghost" : "default"
                            }
                            className={cn(
                                "rounded-full font-inter font-semibold transition-all duration-300",
                                button.variant === "text"
                                    ? isDark
                                        ? "text-white hover:bg-transparent hover:text-accent-300"
                                        : "text-foreground hover:bg-transparent hover:text-accent"
                                    : isDark
                                        ? "bg-white text-foreground hover:bg-white/90 px-6"
                                        : "bg-foreground text-background hover:bg-foreground/90 px-6",
                            )}
                        >
                            <Link
                                href={button.href}
                                className="flex items-center gap-2"
                            >
                                {button.icon}
                                {button.label}
                            </Link>
                        </Button>
                    ))}
                </div>
            )}
        </Wrapper>
    );
}
