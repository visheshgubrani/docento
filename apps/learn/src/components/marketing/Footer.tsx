import Image from 'next/image'
import Link from 'next/link'
import { FaGithub, FaLinkedinIn, FaXTwitter } from 'react-icons/fa6'

import { footerData } from '@/config/navigation'
import { siteConfig } from '@/config/site'

export function Footer() {
  const socialIconMap = {
    github: FaGithub,
    linkedin: FaLinkedinIn,
    x: FaXTwitter,
  } as const

  return (
    <footer className="bg-linear-to-b from-muted/20 border-t border-muted-foreground/10 to-muted dark:to-muted/80 text-foreground">
      <div className="mx-auto w-full max-w-7xl px-4 pt-12 pb-6 sm:px-6 lg:px-10">
        <div className="flex w-full flex-col items-start gap-10 lg:flex-row lg:justify-between lg:gap-28">
          <div className="w-full max-w-md lg:flex-none">
            <Link href="/" className="inline-flex items-center gap-2">
              <Image
                src={siteConfig.logo}
                alt={siteConfig.name}
                width={30}
                height={30}
              />
              <span className="font-brand text-lg font-extrabold lowercase text-foreground">
                {siteConfig.name}
              </span>
            </Link>
            <p className="mt-3 max-w-sm text-sm text-foreground/80">
              {footerData.description}
            </p>

            <div className="mt-6">
              <form
                action={footerData.subscribe.formAction}
                method="get"
                className="mt-3 flex w-full max-w-sm gap-2"
              >
                <label htmlFor="newsletter-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="newsletter-email"
                  type="email"
                  name="email"
                  required
                  placeholder={footerData.subscribe.placeholder}
                  className="h-10 dark:bg-muted/90 w-full rounded-full border border-muted-foreground/25 bg-background px-4 text-sm text-foreground/90 outline-none transition-colors placeholder:text-foreground/50 focus:border-primary"
                />
                <button
                  type="submit"
                  className="h-10 shrink-0 rounded-full bg-foreground px-4 text-sm font-medium text-background transition-colors hover:bg-primary"
                >
                  {footerData.subscribe.buttonLabel}
                </button>
              </form>
            </div>
          </div>

          <div className="grid w-full grid-cols-1 gap-8 sm:grid-cols-2 sm:gap-x-10 sm:gap-y-8 lg:ml-auto lg:grid-cols-3 lg:max-w-3xl lg:gap-x-20">
            {footerData.columns.map((column) => (
              <div key={column.title}>
                <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-foreground">
                  {column.title}
                </h3>
                <ul className="space-y-3 text-sm">
                  {column.links.map((link) => (
                    <li key={link.href}>
                      <Link
                        href={link.href}
                        className="text-foreground/80 transition-colors hover:text-foreground"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-border pt-5 sm:flex-row sm:items-center">
          <p className="text-xs text-foreground/70 sm:text-sm">
            {footerData.copyright}
          </p>
          <div className="flex items-center gap-4">
            {footerData.social.map((social) => {
              const Icon =
                socialIconMap[social.icon as keyof typeof socialIconMap]
              return (
                <Link
                  key={social.label}
                  href={social.href}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={social.label}
                  className="inline-flex size-10 bg-primary/80 hover:bg-primary text-white items-center justify-center rounded-full border border-foreground/20 transition-colors"
                >
                  <Icon className="size-5" />
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </footer>
  )
}
