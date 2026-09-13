'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { authClient } from '@/lib/auth'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type SessionData = (typeof authClient)['$Infer']['Session']
type SessionPayload = SessionData | { session: SessionData } | null

const resolveSession = (payload: SessionPayload): SessionData | null => {
  if (!payload) return null
  if (
    typeof payload === 'object' &&
    payload !== null &&
    'user' in (payload as Record<string, unknown>)
  ) {
    return payload as SessionData
  }

  if (
    typeof payload === 'object' &&
    'session' in (payload as Record<string, unknown>)
  ) {
    const nested = (payload as { session?: SessionData })?.session
    if (nested) {
      return nested
    }
  }

  return null
}

const NAV_LINKS = [
  { label: 'Pricing', href: '/pricing' },
  { label: 'Contact', href: '/contact' },
  { label: 'Blog', href: '/blog' },
]

export default function LandingHeader() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    let isMounted = true

    const fetchSession = async () => {
      try {
        const response = await authClient.getSession()
        const nextSession = resolveSession(
          (response?.data ?? null) as SessionPayload,
        )

        if (isMounted) {
          setSession(nextSession)
        }
      } catch {
        if (isMounted) {
          setSession(null)
        }
      }
    }

    fetchSession()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20)
    }

    window.addEventListener('scroll', handleScroll)
    handleScroll() // Check initial state

    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <>
      <header
        className={cn(
          'w-full z-50 sticky top-0 transition-all duration-300',
          scrolled
            ? 'bg-accent-100 backdrop-blur-md border-b-2 border-b-accent-200'
            : 'bg-transparent border-b border-transparent',
        )}
      >
        <nav className="mx-auto max-w-7xl px-4 md:px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Left Navigation */}
            <div className="hidden lg:flex items-center gap-1">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="px-4 py-2 text-base font-semibold font-inter text-foreground hover:text-accent transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Center Logo */}
            <Link
              href="/"
              className="flex items-center gap-2 lg:absolute lg:left-1/2 lg:-translate-x-1/2"
            >
              <span className="relative shrink-0 size-7.5">
                <Image
                  src="/docento-logo.svg"
                  alt="Docento Logo"
                  fill
                  priority
                  className="object-contain"
                />
              </span>
              <span className="font-comfortaa sm:block hidden mt-0.5 font-[900] tracking-tight text-[1.3rem] text-foreground">
                docento
              </span>
            </Link>

            {/* Right Navigation */}
            <div className="flex items-center gap-4">
              {session?.user ? (
                <Button
                  asChild
                  className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-inter font-medium px-4"
                >
                  <Link href="/projects" className="flex items-center gap-1">
                    <span>Go to Dashboard</span>
                    <ChevronRightIcon className="w-4 h-4" />
                  </Link>
                </Button>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="hidden sm:block px-4 py-2 text-sm font-semibold underline font-inter text-foreground hover:text-accent transition-colors"
                  >
                    Login
                  </Link>
                  {/* <Link
                                        href="/signup"
                                        className="hidden sm:block px-2 py-2 text-sm font-medium font-inter text-foreground/70 hover:text-foreground transition-colors"
                                    >
                                        Signup
                                    </Link> */}
                  <Button
                    asChild
                    className="rounded-full bg-foreground text-background hover:bg-foreground/90 font-inter font-medium px-6 py-5"
                  >
                    <Link href="/contact" className="flex items-center gap-1">
                      <span>Book a Demo</span>
                      <ChevronRightIcon className="w-4 h-4" />
                    </Link>
                  </Button>
                </>
              )}

              {/* Mobile Menu Button */}
              <div className="lg:hidden">
                <AnimatedHamburgerButton
                  active={mobileMenuOpen}
                  setActive={setMobileMenuOpen}
                />
              </div>
            </div>
          </div>
        </nav>
      </header>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
            className="fixed inset-x-0 top-[70px] z-50 bg-accent-100 border-b border-black/5 shadow-lg lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-6">
              <div className="flex flex-col gap-2">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className="px-4 py-3 text-base font-semibold font-inter text-foreground hover:text-foreground hover:underline rounded-lg transition-colors"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="border-t border-white/70 mt-2 pt-4 flex flex-col gap-2">
                  {!session?.user && (
                    <>
                      <Link
                        href="/login"
                        onClick={() => setMobileMenuOpen(false)}
                        className="px-4 py-3 text-base font-medium font-inter text-foreground/80 hover:text-foreground hover:underline rounded-lg transition-colors"
                      >
                        Login
                      </Link>
                      {/* <Link
                                                href="/signup"
                                                onClick={() =>
                                                    setMobileMenuOpen(false)
                                                }
                                                className="px-4 py-3 text-base font-medium font-inter text-foreground/80 hover:text-foreground hover:underline rounded-lg transition-colors"
                                            >
                                                Signup
                                            </Link> */}
                    </>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* Hamburger Button */
const AnimatedHamburgerButton = ({
  active,
  setActive,
}: {
  active: boolean
  setActive: (val: boolean) => void
}) => {
  return (
    <MotionConfig
      transition={{
        duration: 0.3,
        ease: 'easeInOut',
      }}
    >
      <motion.button
        initial={false}
        animate={active ? 'open' : 'closed'}
        onClick={() => setActive(!active)}
        className="relative h-10 w-10 rounded-full hover:bg-muted transition-colors"
      >
        <motion.span
          variants={VARIANTS.top}
          className="absolute w-5 bg-foreground rounded-full"
          style={{
            y: '-50%',
            left: '50%',
            x: '-50%',
            top: '35%',
            height: '2px',
          }}
        />
        <motion.span
          variants={VARIANTS.middle}
          className="absolute w-5 bg-foreground rounded-full"
          style={{
            left: '50%',
            x: '-50%',
            top: '50%',
            y: '-50%',
            height: '2px',
          }}
        />
        <motion.span
          variants={VARIANTS.bottom}
          className="absolute w-3.5 bg-foreground rounded-full"
          style={{
            x: '-50%',
            y: '50%',
            bottom: '35%',
            left: 'calc(50% + 3px)',
            height: '2px',
          }}
        />
      </motion.button>
    </MotionConfig>
  )
}

const VARIANTS = {
  top: {
    open: {
      rotate: ['0deg', '0deg', '45deg'],
      top: ['35%', '50%', '50%'],
    },
    closed: {
      rotate: ['45deg', '0deg', '0deg'],
      top: ['50%', '50%', '35%'],
    },
  },
  middle: {
    open: { rotate: ['0deg', '0deg', '-45deg'] },
    closed: { rotate: ['-45deg', '0deg', '0deg'] },
  },
  bottom: {
    open: {
      rotate: ['0deg', '0deg', '45deg'],
      bottom: ['35%', '50%', '50%'],
      left: '50%',
    },
    closed: {
      rotate: ['45deg', '0deg', '0deg'],
      bottom: ['50%', '50%', '35%'],
      left: 'calc(50% + 3px)',
    },
  },
}
