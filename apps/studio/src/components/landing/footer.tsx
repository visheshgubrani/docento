'use client'

import { useState } from 'react'
import Link from 'next/link'
import { FaGithub, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6'
import { HiMiniArrowRight } from 'react-icons/hi2'
import Image from 'next/image'

const navigation = {
  product: [
    { name: 'Home', href: '/' },
    { name: 'Pricing', href: '/pricing' },
  ],
  company: [
    { name: 'About', href: '/about' },
    { name: 'Blog', href: '/blog' },
    { name: 'Contact', href: '/contact' },
  ],
  resources: [
    { name: 'Book a Demo', href: '/contact' },
    { name: 'Pricing', href: '/pricing' },
    { name: 'Help Center', href: '/docs' },
    { name: 'Blog', href: '/blog' },
  ],
  legal: [
    { name: 'Privacy', href: '/privacy' },
    { name: 'Terms', href: '/terms' },
  ],
  social: [
    { name: 'X', href: 'https://x.com', icon: FaXTwitter },
    { name: 'LinkedIn', href: 'https://linkedin.com', icon: FaLinkedinIn },
    { name: 'GitHub', href: 'https://github.com', icon: FaGithub },
  ],
}

// Footer category component
function FooterCategory({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <div>
      <h3 className="text-sm font-bold text-foreground font-noto">{title}</h3>
      <ul role="list" className="mt-3.5 flex flex-col gap-3">
        {children}
      </ul>
    </div>
  )
}

// Footer link component
function FooterLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <li className="text-foreground/90">
      <Link
        href={href}
        className="text-sm font-medium font-inter hover:text-accent transition-colors"
      >
        {children}
      </Link>
    </li>
  )
}

// Social link component
function SocialLink({
  href,
  name,
  icon: Icon,
}: {
  href: string
  name: string
  icon: React.ComponentType<{ className?: string }>
}) {
  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={name}
      className="text-foreground/90 hover:text-accent transition-colors"
    >
      <Icon className="size-5.5" />
    </Link>
  )
}

// Newsletter form component
function NewsletterForm() {
  const [email, setEmail] = useState('')

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    console.log('Subscribe:', email)
    setEmail('')
  }

  return (
    <form onSubmit={handleSubscribe} className="flex max-w-sm flex-col gap-2">
      <div className="flex items-center gap-2">
        <Link href="/" className="flex items-center gap-2">
          <span className="relative shrink-0 size-7">
            <Image
              src="/docento-logo.svg"
              alt="Docento Logo"
              fill
              priority
              className="object-contain"
            />
          </span>
          <span className="font-comfortaa font-[900] tracking-tight text-[1.29rem] text-foreground">
            docento
          </span>
        </Link>
      </div>
      {/* <p className="text-sm/7 text-foreground font-inter mt-2">Stay in the loop</p> */}
      <div className="flex flex-col gap-4 mt-4 text-foreground/90 text-sm/7 font-inter">
        Get product updates, new features, and support tips delivered to your
        inbox.
      </div>
      <div className="flex items-center border-b border-foreground/25 py-2.5 has-[input:focus]:border-foreground mt-2">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          aria-label="Email"
          className="flex-1 text-sm text-foreground bg-transparent focus:outline-none font-inter placeholder:text-foreground/70"
          required
        />
        <button
          type="submit"
          aria-label="Subscribe"
          className="relative bg-accent-100 inline-flex size-7.5 items-center justify-center rounded-full hover:bg-foreground/10 transition-colors"
        >
          <HiMiniArrowRight className="size-4.5" />
        </button>
      </div>
    </form>
  )
}

export function LandingFooter() {
  return (
    <footer className="pt-16 w-full bg-accent-50">
      {/* Main footer content with subtle background */}
      <div className="pt-10 pb-4 text-foreground">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col gap-12">
          {/* Top section - Newsletter and Navigation */}
          <div className="grid grid-cols-1 gap-x-6 gap-y-16 text-sm/7 lg:grid-cols-2">
            {/* Newsletter Form */}
            <NewsletterForm />

            {/* Navigation Links */}
            <nav className="grid grid-cols-2 gap-6 sm:grid-cols-4">
              <FooterCategory title="Product">
                {navigation.product.map((item) => (
                  <FooterLink key={item.name} href={item.href}>
                    {item.name}
                  </FooterLink>
                ))}
              </FooterCategory>

              <FooterCategory title="Company">
                {navigation.company.map((item) => (
                  <FooterLink key={item.name} href={item.href}>
                    {item.name}
                  </FooterLink>
                ))}
              </FooterCategory>

              <FooterCategory title="Resources">
                {navigation.resources.map((item) => (
                  <FooterLink key={item.name} href={item.href}>
                    {item.name}
                  </FooterLink>
                ))}
              </FooterCategory>

              <div className="lg:ml-8">
                <FooterCategory title="Legal">
                  {navigation.legal.map((item) => (
                    <FooterLink key={item.name} href={item.href}>
                      {item.name}
                    </FooterLink>
                  ))}
                </FooterCategory>
              </div>
            </nav>
          </div>

          {/* Bottom section - Copyright and Social Icons */}
          <div className="flex lg:flex-row flex-col justify-between w-full items-center gap-16">
            {/* Large Docento branding at the very bottom */}
            <div className="order-2 lg:order-1">
              <div className="mx-auto max-w-7xl flex justify-center">
                <span
                  className="font-comfortaa text-[25vw] sm:text-[18vw] md:text-[16vw] lg:text-[12vw] font-bold tracking-tight leading-none select-none"
                  style={{
                    color: 'var(--color-accent-50)',
                    textShadow: ` 
                                            -0.0095em -0.0095em 0 var(--color-white),
                                            -0.0075em 0.0075em 0 var(--color-white),
                                            0.005em 0.005em 0 var(--color-accent-400),
                                            0.01em 0.01em 0 var(--color-accent-400),
                                            0.015em 0.015em 0 var(--color-accent-300),
                                            0.02em 0.02em 0 var(--color-accent-300),
                                            0.025em 0.025em 0 var(--color-accent-200),
                                            0.03em 0.03em 0 var(--color-accent-200),
                                            0.035em 0.035em 0 var(--color-accent-100)
                                        `,
                  }}
                >
                  docento
                </span>
              </div>
            </div>
            <div className="order-1 lg:order-2 flex flex-col items-center justify-center lg:items-end lg:justify-end gap-10 text-sm/7">
              <div className="flex items-center gap-6 sm:gap-10">
                {navigation.social.map((item) => (
                  <SocialLink
                    key={item.name}
                    href={item.href}
                    name={item.name}
                    icon={item.icon}
                  />
                ))}
              </div>
              <div className="text-foreground/65 font-inter">
                © 2026 Docento. All Rights Reserved.
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
