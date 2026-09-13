"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { FiArrowRight, FiMail, FiUser } from "react-icons/fi";
import { updateMyProfile } from "@/actions/auth";
import { noisePattern } from "@/components/noise-pattern";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { siteConfig } from "@/config/site";

type EditProfileClientProps = {
  initialName: string;
  email: string;
};

type FormErrors = {
  name?: string;
  form?: string;
};

export function EditProfileClient({ initialName, email }: EditProfileClientProps) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [successMessage, setSuccessMessage] = useState("");

  const hasNameChanged = useMemo(
    () => name.trim() !== (initialName || "").trim(),
    [name, initialName]
  );

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nextErrors: FormErrors = {};

    if (!name.trim()) {
      nextErrors.name = "Name is required";
    }

    if (!hasNameChanged) {
      nextErrors.form = "No changes to save.";
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      setSuccessMessage("");
      return;
    }

    setIsSubmitting(true);
    setErrors({});
    setSuccessMessage("");

    try {
      if (hasNameChanged) {
        const response = await updateMyProfile({ name: name.trim() });
        if (!response.success) {
          setErrors({ form: response.error || "Failed to update profile." });
          setIsSubmitting(false);
          return;
        }
      }

      setSuccessMessage("Profile updated successfully.");
      router.refresh();
    } catch {
      setErrors({ form: "Something went wrong while saving profile." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="relative flex min-h-screen bg-background">
      <Link
        href="/dashboard"
        className="absolute top-4 left-4 z-50 flex items-center gap-1 text-sm text-foreground transition-colors hover:underline font-semibold"
      >
        <FiArrowRight className="w-4 h-4 rotate-180" />
        Dashboard
      </Link>

      <div className="hidden lg:flex lg:w-1/2 relative bg-linear-to-b from-[#9ca88f] to-[#596352] dark:from-[#333a2b] dark:to-[#26361b]">
        <div
          className="absolute inset-0 opacity-30 mix-blend-overlay dark:opacity-25"
          style={{
            backgroundPosition: "center",
            backgroundImage: noisePattern,
          }}
        />
        <div className="relative flex flex-col items-center justify-center p-12 w-full">
          <div className="max-w-lg text-center">
            <p className="text-white text-3xl font-extrabold leading-tight">
              &ldquo;Small profile updates build big learning confidence.&rdquo;
            </p>
            <p className="text-white/70 text-xl font-medium mt-4">— Acme Learning Team</p>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-4 lg:p-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
              <Image src={siteConfig.logo} alt={siteConfig.name} width={32} height={32} />
              <span className="font-brand font-extrabold text-[1.25rem] lowercase text-foreground">
                acme learning
              </span>
            </Link>
            <h1 className="text-2xl font-bold text-foreground mb-2">Edit Profile</h1>
            <p className="text-foreground/70">Update your display name</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {errors.form ? (
              <div className="p-3 rounded-md bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">{errors.form}</p>
              </div>
            ) : null}

            {successMessage ? (
              <div className="p-3 rounded-md bg-emerald-50 border border-emerald-200">
                <p className="text-sm text-emerald-700">{successMessage}</p>
              </div>
            ) : null}

            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="text"
                placeholder="Display name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                disabled={isSubmitting}
                className={`pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5 ${
                  errors.name ? "border-red-700" : ""
                }`}
              />
            </div>
            {errors.name ? <p className="text-sm text-red-700">{errors.name}</p> : null}

            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/70" />
              <Input
                type="email"
                value={email}
                disabled
                className="pl-10 border border-muted-foreground placeholder:text-muted-foreground py-5 bg-muted/40"
              />
            </div>
            <p className="text-xs text-foreground/60">Email cannot be changed from this page.</p>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="mt-2 w-full py-5.5 cursor-pointer hover:opacity-90 disabled:opacity-50"
            >
              <span className="flex items-center justify-center font-semibold gap-2">
                {isSubmitting ? "Saving..." : "Save Changes"}
                <FiArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
