import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/actions/auth";
import { EditProfileClient } from "./edit-profile-client";

export const metadata: Metadata = {
  title: "Profile",
  description: "Update your profile information.",
};

export default async function EditProfilePage() {
  const profileData = await getProfile();

  if (!profileData) {
    redirect("/login");
  }

  return (
    <EditProfileClient
      initialName={profileData.profile.managedUser?.name ?? ""}
      email={profileData.profile.email}
    />
  );
}
