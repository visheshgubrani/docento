import { siteConfig } from '@/config/site'
// ===== Navigation =====
export const navLinks = [
  { label: 'Courses', href: '/courses' },
  { label: 'About', href: '/about' },
]

// ===== Footer =====
export const footerData = {
  description:
    'Subscribe for brief updates on new courses and product improvements.',
  subscribe: {
    formAction: '/contact',
    placeholder: 'Enter your email',
    buttonLabel: 'Subscribe',
  },
  columns: [
    {
      title: 'Explore',
      links: [
        { label: 'My Dashboard', href: '/dashboard' },
        { label: 'Courses', href: '/courses' },
        { label: 'About', href: '/about' },
      ],
    },
    {
      title: 'Account',
      links: [
        { label: 'Settings', href: '/profile/edit' },
        { label: 'Contact', href: '/contact' },
        { label: 'Purchase History', href: '/dashboard/purchases' },
      ],
    },
    {
      title: 'Legal',
      links: [
        { label: 'Privacy', href: '/privacy' },
        { label: 'Terms', href: '/terms' },
        { label: 'Refund-policy', href: '/refund-policy' },
      ],
    },
  ],
  social: [
    {
      label: 'GitHub',
      href: 'https://github.com/visheshgubrani/docento',
      icon: 'github',
    },
    { label: 'LinkedIn', href: 'https://www.linkedin.com', icon: 'linkedin' },
    { label: 'X', href: 'https://x.com', icon: 'x' },
  ],

  copyright: `© ${new Date().getFullYear()} ${siteConfig.name}. All rights reserved.`,
}
