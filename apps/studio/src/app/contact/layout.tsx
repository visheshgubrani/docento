import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    "Have questions about Docento? Get in touch with our team for support, partnerships, or product inquiries. We're here to help you build and scale your learning platform.",
  keywords: [
    'contact docento',
    'docento support',
    'lms help',
    'contact edtech team',
    'docento customer service',
    'docento inquiries',
  ],
  openGraph: {
    title: 'Contact Docento',
    description:
      "Reach out to the Docento team for support, sales, or general inquiries. We're always happy to help.",
    url: 'https://docento.dev/contact',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'Contact Docento',
    description:
      'Get in touch with the Docento team for any questions or support needs.',
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {' '}
      <main>{children}</main>
    </>
  )
}
