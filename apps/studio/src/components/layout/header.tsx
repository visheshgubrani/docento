'use client'

import React, { ReactNode, useEffect, useState } from 'react'
import Link from 'next/link'
import { ChevronRightIcon } from '@heroicons/react/20/solid'
import { authClient } from '@/lib/auth'
import {
  FiChevronDown,
  FiBriefcase,
  FiBook,
  FiCode,
  FiFile,
  FiBox,
  FiInfo,
  FiBookOpen,
  FiLifeBuoy,
  FiMail,
} from 'react-icons/fi'

import { AnimatePresence, motion, MotionConfig } from 'framer-motion'

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

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [session, setSession] = useState<SessionData | null>(null)

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

  return (
    <>
      <div className="w-full z-50 border-b border-black/10 bg-white/60 backdrop-blur-md sticky top-0">
        <nav className="mx-auto max-w-7xl px-4 md:px-6 py-3">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="text-xl font-noto font-bold text-black">
              Docento
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden lg:block">
              <Tabs />
            </div>
            <div className="flex items-center gap-2.5">
              {session?.user ? (
                <Link
                  href="/projects"
                  className="group cursor-pointer rounded-sm bg-gradient-to-b from-foreground/65 border border-foreground/95 from-5% to-foreground/95 hover:from-foreground/60 transition-colors duration-200 ease-in-out px-2.5 py-[5px] text-xs/6 font-[500] font-noto text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 flex items-center gap-0.5"
                >
                  <span>Dashboard</span>
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-5 text-white group-hover:translate-x-0.5 transition-all ease-in-out duration-300"
                  />
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    className="cursor-pointer rounded-sm py-1.5 px-3 hover:bg-muted text-xs/6 font-[550] font-noto text-foreground/90"
                  >
                    Login
                  </Link>
                  <Link
                    href="/docs"
                    className="group cursor-pointer rounded-sm bg-gradient-to-b from-foreground/65 border border-foreground/95 from-5% to-foreground/95 hover:from-foreground/60 transition-colors duration-200 ease-in-out px-2.5 py-[5px] text-xs/6 font-[500] font-noto text-white shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-600 flex items-center  gap-0.5"
                  >
                    <span>Start Building</span>
                    <ChevronRightIcon
                      aria-hidden="true"
                      className="size-5 text-white group-hover:translate-x-0.5 transition-all ease-in-out duration-300"
                    />
                  </Link>
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
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, x: '100%' }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: '100%' }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="fixed inset-0 z-50 overflow-y-auto bg-neutral-950 lg:hidden"
          >
            <div className="mx-auto max-w-7xl px-4 py-4">
              <div className="flex items-center justify-between">
                <Link href="/" className="text-xl font-bold text-white">
                  Docento
                </Link>

                <div className="flex items-center gap-4">
                  {session?.user ? (
                    <Link
                      href="/projects"
                      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-foreground"
                    >
                      Dashboard
                    </Link>
                  ) : (
                    <Link
                      href="/login"
                      className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-foreground"
                    >
                      Login
                    </Link>
                  )}

                  <AnimatedHamburgerButton
                    active={mobileMenuOpen}
                    setActive={setMobileMenuOpen}
                  />
                </div>
              </div>

              <MobileMenu setMobileMenuOpen={setMobileMenuOpen} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

/* -----------------------------------------------------------
   Hamburger Button
----------------------------------------------------------- */
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
        duration: 0.5,
        ease: 'easeInOut',
      }}
    >
      <motion.button
        initial={false}
        animate={active ? 'open' : 'closed'}
        onClick={() => setActive(!active)}
        className="relative h-12 w-12 rounded-full bg-white/0 transition-colors "
      >
        <motion.span
          variants={VARIANTS.top}
          className="absolute w-6 bg-neutral-500"
          style={{
            y: '-50%',
            left: '50%',
            x: '-50%',
            top: '35%',
            height: '2.5px',
          }}
        />
        <motion.span
          variants={VARIANTS.middle}
          className="absolute w-6 bg-neutral-500"
          style={{
            left: '50%',
            x: '-50%',
            top: '50%',
            y: '-50%',
            height: '2.5px',
          }}
        />
        <motion.span
          variants={VARIANTS.bottom}
          className="absolute w-4 bg-neutral-500"
          style={{
            x: '-50%',
            y: '50%',
            bottom: '35%',
            left: 'calc(50% + 5px)',
            height: '2.5px',
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
      left: 'calc(50% + 5px)',
    },
  },
}

/* -----------------------------------------------------------
   Mobile Menu
----------------------------------------------------------- */
const MobileMenu = ({
  setMobileMenuOpen,
}: {
  setMobileMenuOpen: (val: boolean) => void
}) => {
  const [expandedSection, setExpandedSection] = useState<number | null>(null)

  return (
    <div className="mt-4 rounded-lg border border-neutral-700/80 bg-neutral-800/80 p-4">
      {TABS.map((tab) => (
        <div
          key={tab.id}
          className="border-b border-neutral-700/70 last:border-b-0"
        >
          {tab.hasDropdown ? (
            <>
              <button
                onClick={() =>
                  setExpandedSection(expandedSection === tab.id ? null : tab.id)
                }
                className="flex w-full items-center justify-between py-3 text-left text-neutral-200 transition-colors hover:text-white"
              >
                <span>{tab.title}</span>
                <FiChevronDown
                  className={`transition-transform ${
                    expandedSection === tab.id ? 'rotate-180' : ''
                  }`}
                />
              </button>

              <AnimatePresence>
                {expandedSection === tab.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden"
                  >
                    <div className="pb-3">
                      <tab.Component />
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <Link
              href={tab.href || '#'}
              className="block py-3 text-neutral-200 transition-colors hover:text-white"
            >
              {tab.title}
            </Link>
          )}
        </div>
      ))}
    </div>
  )
}

/* -----------------------------------------------------------
   Tabs Navigation
----------------------------------------------------------- */
const Tabs = () => {
  const [selected, setSelected] = useState<number | null>(null)
  const [dir, setDir] = useState<null | 'l' | 'r'>(null)

  const handleSetSelected = (val: number | null) => {
    if (typeof selected === 'number' && typeof val === 'number') {
      setDir(selected > val ? 'r' : 'l')
    } else if (val === null) {
      setDir(null)
    }
    setSelected(val)
  }

  return (
    <div
      onMouseLeave={() => handleSetSelected(null)}
      className="relative flex h-fit gap-2"
    >
      {TABS.map((t) => {
        return (
          <Tab
            key={t.id}
            selected={selected}
            handleSetSelected={handleSetSelected}
            tab={t.id}
            hasDropdown={t.hasDropdown}
            href={t.href}
          >
            {t.title}
          </Tab>
        )
      })}

      <AnimatePresence>
        {selected && <Content dir={dir} selected={selected} />}
      </AnimatePresence>
    </div>
  )
}

/* -----------------------------------------------------------
   Individual Tab
----------------------------------------------------------- */
const Tab = ({
  children,
  tab,
  handleSetSelected,
  selected,
  hasDropdown,
  href,
}: {
  children: ReactNode
  tab: number
  handleSetSelected: (val: number | null) => void
  selected: number | null
  hasDropdown: boolean
  href?: string
}) => {
  return hasDropdown ? (
    <button
      id={`shift-tab-${tab}`}
      onMouseEnter={() => handleSetSelected(tab)}
      onClick={() => handleSetSelected(tab)}
      className={`flex cursor-pointer font-[550] font-noto items-center gap-1 rounded-full px-3 py-1.5 text-sm duration-200 ease-in-out transition-colors ${
        selected === tab
          ? 'bg-neutral-800/95 text-white duration-200 ease-in-out transition-colors'
          : 'text-neutral-800 hover:text-indigo-700'
      }`}
    >
      <span>{children}</span>
      <FiChevronDown
        className={`transition-transform ${
          selected === tab ? 'rotate-180' : ''
        }`}
      />
    </button>
  ) : (
    <Link
      href={href || '#'}
      className="flex cursor-pointer font-[550] font-noto items-center gap-1 rounded-full px-3 py-1.5 text-sm transition-colors text-neutral-800 hover:text-indigo-700"
    >
      {children}
    </Link>
  )
}

/* -----------------------------------------------------------
   Dropdown Content
----------------------------------------------------------- */
const Content = ({
  selected,
  dir,
}: {
  selected: number | null
  dir: null | 'l' | 'r'
}) => {
  return (
    <motion.div
      id="overlay-content"
      initial={{
        opacity: 0,
        y: 8,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      exit={{
        opacity: 0,
        y: 8,
      }}
      className="absolute left-1/2 top-[calc(100%_+_24px)] w-[850px] xl:w-[900px] -translate-x-1/2 rounded-lg border border-muted bg-gradient-to-br from-neutral-900 to-neutral-800 p-6"
    >
      <Bridge />
      <Nub selected={selected} />

      {TABS.map((t) => {
        return (
          <div className="overflow-hidden" key={t.id}>
            {selected === t.id && (
              <motion.div
                initial={{
                  opacity: 0,
                  x: dir === 'l' ? 100 : dir === 'r' ? -100 : 0,
                }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.25, ease: 'easeInOut' }}
              >
                <t.Component />
              </motion.div>
            )}
          </div>
        )
      })}
    </motion.div>
  )
}

const Bridge = () => (
  <div className="absolute -top-[24px] left-0 right-0 h-[24px]" />
)

/* -----------------------------------------------------------
   Little Arrow (Nub)
----------------------------------------------------------- */
const Nub = ({ selected }: { selected: number | null }) => {
  const [left, setLeft] = useState(0)

  useEffect(() => {
    moveNub()
  }, [selected])

  const moveNub = () => {
    if (selected) {
      const hoveredTab = document.getElementById(`shift-tab-${selected}`)
      const overlayContent = document.getElementById('overlay-content')

      if (!hoveredTab || !overlayContent) return

      const tabRect = hoveredTab.getBoundingClientRect()
      const { left: contentLeft } = overlayContent.getBoundingClientRect()

      const tabCenter = tabRect.left + tabRect.width / 2 - contentLeft

      setLeft(tabCenter)
    }
  }

  return (
    <motion.span
      style={{
        clipPath: 'polygon(0 0, 100% 0, 50% 50%, 0% 100%)',
      }}
      animate={{ left }}
      transition={{ duration: 0.25, ease: 'easeInOut' }}
      className="absolute left-1/2 top-0 h-4 w-4 -translate-x-1/2 -translate-y-1/2 rotate-45 rounded-tl border border-neutral-700 bg-neutral-800"
    />
  )
}

/* -----------------------------------------------------------
   FeatureCard + ListItem
----------------------------------------------------------- */
const FeatureCard = ({
  icon: Icon,
  title,
  description,
  href = '#',
}: {
  icon: any
  title: string
  description: string
  href?: string
}) => {
  return (
    <Link
      href={href}
      className="
        group relative overflow-hidden 
        cursor-pointer flex flex-col justify-between h-full rounded-xl p-4 
        bg-neutral-800/70 border border-neutral-700 
        transition-colors hover:bg-neutral-800
      "
    >
      {/* --- GRID BACKGROUND --- */}
      <div
        className="
          absolute inset-0 pointer-events-none opacity-0 
          group-hover:opacity-100 transition-opacity duration-500
        "
        style={{
          backgroundImage: `
            linear-gradient(to right, rgba(160,160,160,0.12) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(160,160,160,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '37px 37px',
          WebkitMaskImage:
            'radial-gradient(circle at 60% 5%, black 0%, black 25%, transparent 70%)',
          maskImage:
            'radial-gradient(circle at 60% 5%, black 0%, black 25%, transparent 60%)',
        }}
      ></div>

      {/* --- PURPLE-WHITE SHINE EFFECT --- */}
      <div
        className="
          pointer-events-none absolute inset-0 opacity-0 
          group-hover:opacity-100 transition-opacity duration-500
        "
      >
        <div
          className="
            absolute left-1/2 top-1/2 
            w-[150%] aspect-square -translate-x-1/2 -translate-y-1/2
            rounded-full blur-[60px]
            bg-[radial-gradient(circle,rgba(220,200,255,0.6),rgba(255,255,255,0.12),transparent)]
          "
        ></div>
      </div>

      {/* --- SCANNING LINE --- */}
      <div
        className="
          pointer-events-none absolute top-0 left-0 right-0 bg-white/20 
          translate-y-[-100%] group-hover:translate-y-[300%]
          transition-transform duration-[2200ms] ease-out
        "
      />

      {/* --- CONTENT --- */}
      <Icon className="mb-auto text-2xl text-neutral-300 transition-colors group-hover:text-white" />

      <div className="mt-4">
        <h4 className="mb-1.5 text-sm font-medium text-neutral-50">{title}</h4>
        <p className="text-xs/5 text-neutral-300/85 font-ibm">{description}</p>
      </div>
    </Link>
  )
}

const ListItem = ({
  icon: Icon,
  text,
  href = '#',
}: {
  icon: any
  text: string
  href?: string
}) => {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-md px-2 py-2 text-sm text-neutral-300 transition-colors hover:bg-neutral-700/30 hover:text-neutral-100"
    >
      <div className="flex h-9 w-9 items-center justify-center rounded-md bg-neutral-700/50">
        <Icon className="text-accent size-4.5" />
      </div>
      <span>{text}</span>
    </Link>
  )
}

/* -----------------------------------------------------------
   Dropdown Sections (Products / Developers / etc.)
----------------------------------------------------------- */
// const Products = () => {
//   return (
//     <div className="group flex flex-col gap-6 lg:flex-row">
//       <div className="flex-1">
//         <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
//           Features
//         </h3>

//         <div className="lg:h-60 grid grid-cols-1 gap-3 sm:grid-cols-3">
//           <FeatureCard
//             icon={FiVideo}
//             title="Video on Demand"
//             description="Stream high-quality educational content seamlessly"
//             href="/video-on-demand"
//           />
//           <FeatureCard
//             icon={FiUsers}
//             title="User Management"
//             description="Comprehensive tools for managing learners efficiently"
//             href="/user-management"
//           />
//           <FeatureCard
//             icon={FiFileText}
//             title="CMS"
//             description="Powerful content management for your platform"
//             href="/cms"
//           />
//         </div>
//       </div>

//       <div className="hidden w-px bg-neutral-700 lg:block" />

//       <div className="lg:w-56">
//         <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
//           More
//         </h3>
//         <div className="space-y-1">
//           <ListItem icon={FiTrendingUp} text="Learner's Progress" href="/progress" />
//           <ListItem icon={FiEdit} text="Quiz/Assignments" href="/quizzes" />
//           <ListItem icon={FiAward} text="Certifications" href="/certifications" />
//           <ListItem icon={FiFileText} text="AI Notes Summarization" href="/ai-notes" />
//         </div>
//       </div>
//     </div>
//   );
// };

const Docs = () => {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Explore
        </h3>

        <div className="lg:h-60 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={FiBook}
            title="Docs"
            description="Comprehensive documentation and guides"
            href="/docs"
          />
          <FeatureCard
            icon={FiCode}
            title="API Reference"
            description="Complete API documentation and examples"
            href="/api-reference"
          />
          <FeatureCard
            icon={FiFile}
            title="Starter Template"
            description="Get started quickly with templates"
            href="/starter-template"
          />
        </div>
      </div>

      <div className="hidden w-px bg-neutral-700 lg:block" />

      <div className="lg:w-56">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Resources
        </h3>
        <div className="space-y-1">
          <ListItem icon={FiBox} text="SDKs" href="/sdks" />
          <ListItem icon={FiCode} text="Code Samples" href="/samples" />
          <ListItem
            icon={FiBriefcase}
            text="Build a Custom LMS"
            href="/custom-lms"
          />
        </div>
      </div>
    </div>
  )
}

const Company = () => {
  return (
    <div className="flex flex-col gap-6 lg:flex-row">
      <div className="flex-1">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
          Company
        </h3>

        <div className="lg:h-60 grid grid-cols-1 gap-3 sm:grid-cols-3">
          <FeatureCard
            icon={FiBookOpen}
            title="Blog"
            description="Insights and updates from our team"
            href="/blog"
          />
          <FeatureCard
            icon={FiInfo}
            title="About"
            description="Learn more about our mission"
            href="/about"
          />
          {/* <FeatureCard
            icon={FiLifeBuoy}
            title="Help Center"
            description="Get support when you need it"
            href="/help"
          /> */}
          <FeatureCard
            icon={FiMail}
            title="Contact"
            description="Reach out to our support team"
            href="/contact"
          />
        </div>
      </div>
    </div>
  )
}

/* -----------------------------------------------------------
   Tab Definitions
----------------------------------------------------------- */
const TABS = [
  // {
  //   title: "Products",
  //   Component: Products,
  //   hasDropdown: true,
  // },
  {
    title: 'Docs',
    Component: Docs,
    hasDropdown: true,
  },
  {
    title: 'Company',
    Component: Company,
    hasDropdown: true,
  },

  {
    title: 'Pricing',
    Component: () => null,
    hasDropdown: false,
    href: '/pricing',
  },
].map((n, idx) => ({ ...n, id: idx + 1 }))
