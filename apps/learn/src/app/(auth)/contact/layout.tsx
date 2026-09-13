import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact",
  description: "Contact Acme Learning support.",
};

export default function ContactLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return children;
}
