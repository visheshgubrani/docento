import { getProfile, isAuthenticated } from "@/actions/auth";
import { NavigationHeader } from "@/components/common/navigation-header";

export async function Header() {
  const authenticated = await isAuthenticated();
  if (!authenticated) {
    return <NavigationHeader />;
  }

  const profile = await getProfile();

  if (!profile) {
    return <NavigationHeader user={{ name: "User" }} />;
  }

  const userName = profile.profile.managedUser?.name || profile.profile.email.split("@")[0];

  return (
    <NavigationHeader
      user={{
        name: userName,
        email: profile.profile.email,
      }}
    />
  );
}
