import type { Metadata } from "next";
import { Footer } from "@/components/marketing";

export const metadata: Metadata = {
  title: "Dashboard",
  description: "Your learning dashboard.",
};

export default function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="min-h-screen bg-background">
      {children}
      <Footer />
    </div>
  );
}
