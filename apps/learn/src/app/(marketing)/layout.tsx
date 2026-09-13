import { Header, Footer, CTA } from "@/components/marketing";

export default function MarketingLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Header />
      <main>{children}</main>
      <CTA />
      <Footer />
    </>
  );
}
