import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About",
  description: "Learn more about Acme Learning.",
};

export default function AboutLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
