'use client'

import { useState } from 'react'
import {
  Button,
  Sheet,
  SheetClose,
  SheetContent,
  SheetTrigger,
} from '@docento/ui'
import { MenuIcon } from 'lucide-react'

import { navigation } from '@/content/landing'
import { site } from '@/lib/site'

import { useSmoothScrollLock } from '../motion/smooth-scroll'

/**
 * The small-screen menu.
 *
 * A Radix sheet, so the focus trap, the Escape key, the focus restoration and the
 * `aria-modal` semantics are not reimplemented — a hand-rolled drawer gets at
 * least one of those wrong, and the one it gets wrong is usually focus.
 *
 * Two additions on top of the primitive. Smooth scrolling is paused while the
 * sheet is open, because Radix locks the page but knows nothing about Lenis, and
 * without this the page keeps drifting behind the sheet. And each link closes the
 * sheet, so a visitor who taps "Hosting" gets the section rather than the section
 * with a menu over it.
 *
 * The primary action is inside the menu. On a phone the header has room for a
 * button or a menu, not both, and the menu is where the navigation has to live —
 * so the call to action goes with it rather than being dropped.
 */
export function MobileNav() {
  const [open, setOpen] = useState(false)

  useSmoothScrollLock(open)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <MenuIcon aria-hidden="true" className="size-5" />
          <span className="sr-only">Open menu</span>
        </Button>
      </SheetTrigger>

      <SheetContent side="right" title="Menu" className="gap-6 pt-16">
        <nav aria-label="Sections" className="flex flex-col">
          {navigation.map((item) => (
            <SheetClose key={item.href} asChild>
              <a
                href={item.href}
                className="border-border-decorative text-ink hover:text-brand border-b py-4 text-base font-medium"
                {...(item.href.startsWith('http')
                  ? { rel: 'noreferrer', target: '_blank' }
                  : {})}
              >
                {item.label}
              </a>
            </SheetClose>
          ))}
        </nav>

        <div className="flex flex-col gap-3">
          <Button asChild size="marketing" className="w-full">
            <a href={site.links.selfHost}>Start self-hosting</a>
          </Button>

          <SheetClose asChild>
            <a
              href={site.repository}
              rel="noreferrer"
              target="_blank"
              className="text-ink-muted hover:text-ink text-center text-sm"
            >
              GitHub
            </a>
          </SheetClose>
        </div>
      </SheetContent>
    </Sheet>
  )
}
