import Image from "next/image";
import Link from "next/link";
import React from "react";

export type LogoSize = "big" | "small";

export type LogoProps = {
  size?: LogoSize;
  className?: string;
  priority?: boolean;
  showWordmark?: boolean;
};

const iconSizes: Record<LogoSize, string> = {
  big: "h-10 w-10",
  small: "h-6 w-6",
};

const wordmarkSizes: Record<LogoSize, string> = {
  big: "text-lg",
  small: "text-sm",
};

export const Logo: React.FC<LogoProps> = ({
  size = "big",
  className = "",
  priority = false,
  showWordmark = true,
}) => {
  return (
    <Link href="/" className={`flex items-center gap-2 ${className}`}>
      {/* Logo Icon */}
      <span className={`relative shrink-0 ${iconSizes[size]}`}>
        <Image
          src="/docento-logo.svg"
          alt="Docento Logo"
          fill
          priority={priority}
          className="object-contain"
        />
      </span>

      {/* Optional Wordmark */}
      {showWordmark && (
        <span
          className={`font-allerta tracking-tight text-xl text-foreground ${wordmarkSizes[size]}`}
        >
          Docento
        </span>
      )}
    </Link>
  );
};
