"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useScroll, type Variants } from "motion/react";
import { FaGithub } from "react-icons/fa6";
import {
  HiArrowRightOnRectangle,
  HiBars3,
  HiPencilSquare,
  HiQuestionMarkCircle,
  HiShoppingBag,
  HiXMark,
} from "react-icons/hi2";
import { signOut } from "@/actions/auth";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { navLinks } from "@/config/navigation";
import { siteConfig } from "@/config/site";
import { cn } from "@/lib/utils";

export type NavigationHeaderUser = {
  name: string;
  email?: string;
  avatar?: string | null;
};

type NavigationHeaderProps = {
  user?: NavigationHeaderUser | null;
};

const userMenuLinks = [
  {
    label: "Purchase History",
    href: "/dashboard/purchases",
    icon: HiShoppingBag,
  },
  {
    label: "Contact",
    href: "/contact",
    icon: HiQuestionMarkCircle,
  },
  {
    label: "Edit Profile",
    href: "/profile/edit",
    icon: HiPencilSquare,
  },
];

const overlayVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 },
} satisfies Variants;

const drawerVariants = {
  hidden: { opacity: 0, y: 90 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      damping: 18,
      stiffness: 220,
      staggerChildren: 0.03,
    },
  },
  exit: {
    opacity: 0,
    y: 90,
    transition: { duration: 0.12 },
  },
} satisfies Variants;

const drawerItemVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0 },
} satisfies Variants;

function getInitials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function isActive(pathname: string, href: string) {
  if (href === "/dashboard") {
    return pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  }

  return pathname === href;
}

function UserAvatarMenu({ userName }: { userName: string }) {
  return (
    <>
      <form id="header-user-menu-logout" action={signOut} />

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-10 p-0 overflow-hidden rounded-full border-3 border-primary/60 bg-primary/95 hover:text-white cursor-pointer text-base font-semibold uppercase tracking-wide text-white hover:bg-primary/90"
            aria-label="Open user menu"
          >
            {getInitials(userName) || "U"}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-56 mt-1 py-2 flex flex-col gap-1.5 shadow-sm shadow-muted/30 border border-muted-foreground/20 bg-sidebar"
        >
          <DropdownMenuLabel className="font-medium text-foreground">{userName}</DropdownMenuLabel>
          <DropdownMenuSeparator />

          {userMenuLinks.map((item) => (
            <DropdownMenuItem key={item.label} asChild>
              <Link
                href={item.href}
                className="flex w-full cursor-pointer items-center gap-2.5 dark:hover:bg-muted hover:bg-muted-foreground/10"
              >
                <item.icon className="size-5 text-foreground/70" />
                <span>{item.label}</span>
              </Link>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator />
          <DropdownMenuItem asChild variant="destructive">
            <button
              type="submit"
              form="header-user-menu-logout"
              className="flex w-full hover:bg-destructive/10 cursor-pointer items-center gap-2.5 py-2 text-left"
            >
              <HiArrowRightOnRectangle className="size-5" />
              <span>Log Out</span>
            </button>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

export function NavigationHeader({ user }: NavigationHeaderProps) {
  const pathname = usePathname();
  const { scrollY } = useScroll();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const isLoggedIn = Boolean(user);

  const links = useMemo(
    () => (isLoggedIn ? [{ label: "My Dashboard", href: "/dashboard" }, ...navLinks] : navLinks),
    [isLoggedIn]
  );

  useEffect(() => {
    const unsubscribe = scrollY.on("change", (latest) => {
      setIsScrolled(latest > 10);
    });

    return unsubscribe;
  }, [scrollY]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setIsMenuOpen(false);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!isMenuOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsMenuOpen(false);
    };

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMenuOpen]);

  return (
    <header className={cn("sticky w-full top-0 z-50 transition-all duration-300")}>
      <motion.div
        className={cn(
          "w-full transition-all duration-300",
          isScrolled
            ? "backdrop-blur-xl supports-backdrop-filter:bg-primary/15 shadow-sm"
            : "bg-background"
        )}
      >
        <nav className="mx-auto flex h-21 max-w-7xl items-center gap-4 px-6 lg:px-10">
          <div className="hidden flex-1 gap-10 lg:flex">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-base font-semibold transition-colors",
                  isActive(pathname, link.href)
                    ? "text-foreground font-bold"
                    : "text-foreground/85 hover:text-primary hover:underline"
                )}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <Link href="/" className="flex items-center gap-2.5">
            <Image src={siteConfig.logo} alt={siteConfig.name} width={32} height={32} />
            <span className="hidden font-brand text-[1.25rem] font-extrabold lowercase text-foreground md:flex">
              {siteConfig.name}
            </span>
          </Link>

          <div className="flex flex-1 items-center justify-end gap-4">
            {!isLoggedIn ? (
              <div className="hidden items-center gap-2 lg:flex">
                <Button
                  asChild
                  variant="ghost"
                  size="icon"
                  className="rounded-full text-foreground/90 hover:text-foreground"
                >
                  <a
                    href={siteConfig.links.github}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="GitHub"
                  >
                    <FaGithub className="size-6" />
                  </a>
                </Button>
              </div>
            ) : null}

            {isLoggedIn ? (
              <UserAvatarMenu userName={user?.name || "User"} />
            ) : (
              <>
                <Button
                  asChild
                  variant="ghost"
                  className="hidden rounded-full px-4 py-5 font-sans text-sm font-semibold underline hover:bg-transparent hover:text-primary md:inline-flex"
                >
                  <Link href="/login">Log in</Link>
                </Button>

                <Button
                  asChild
                  size="lg"
                  className="hidden rounded-full bg-foreground px-6 py-4.5 font-sans text-sm font-medium md:inline-flex"
                >
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}

            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="rounded-full lg:hidden"
              onClick={() => setIsMenuOpen((prev) => !prev)}
              aria-label="Toggle menu"
              aria-expanded={isMenuOpen}
              aria-controls="mobile-nav-drawer"
            >
              {isMenuOpen ? <HiXMark className="size-6.5" /> : <HiBars3 className="size-6.5" />}
            </Button>

            <ThemeToggle />
          </div>
        </nav>
      </motion.div>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.button
              type="button"
              className="fixed inset-0 z-40 bg-background/70 backdrop-blur-sm lg:hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={overlayVariants}
              transition={{ duration: 0.2 }}
              onClick={() => setIsMenuOpen(false)}
              aria-label="Close menu"
            />

            <motion.div
              id="mobile-nav-drawer"
              className="fixed inset-x-4 bottom-4 z-50 rounded-2xl border border-border bg-background p-5 shadow-lg sm:p-6 lg:hidden"
              initial="hidden"
              animate="visible"
              exit="exit"
              variants={drawerVariants}
            >
              <div className="flex items-center justify-between">
                <Link
                  href="/"
                  className="flex items-center gap-2.5"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Image src={siteConfig.logo} alt={siteConfig.name} width={32} height={32} />
                  <span className="font-brand text-[1.125rem] font-extrabold lowercase text-foreground">
                    {siteConfig.name}
                  </span>
                </Link>

                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                  onClick={() => setIsMenuOpen(false)}
                  aria-label="Close menu"
                >
                  <HiXMark className="size-5" />
                </Button>
              </div>

              <motion.ul className="mt-10 overflow-hidden rounded-xl border border-border">
                {links.map((link) => (
                  <motion.li
                    key={link.href}
                    variants={drawerItemVariants}
                    className="border-b border-border last:border-b-0"
                  >
                    <Link
                      href={link.href}
                      onClick={() => setIsMenuOpen(false)}
                      className={cn(
                        "block px-4 py-3 text-base font-medium transition-colors",
                        isActive(pathname, link.href)
                          ? "bg-muted text-foreground"
                          : "text-foreground/85 hover:bg-accent hover:text-foreground"
                      )}
                    >
                      {link.label}
                    </Link>
                  </motion.li>
                ))}
              </motion.ul>

              <motion.div variants={drawerItemVariants} className="mt-8 flex flex-col gap-2">
                {isLoggedIn ? (
                  <>
                    {userMenuLinks.map((item) => (
                      <Button
                        key={item.label}
                        asChild
                        variant="ghost"
                        className="justify-start rounded-lg py-4 text-base font-medium"
                      >
                        <Link href={item.href} onClick={() => setIsMenuOpen(false)}>
                          <item.icon className="size-4" />
                          <span>{item.label}</span>
                        </Link>
                      </Button>
                    ))}

                    <form action={signOut}>
                      <Button
                        type="submit"
                        variant="ghost"
                        className="w-full justify-start rounded-lg py-4 text-base font-semibold text-destructive hover:bg-destructive/10 hover:text-destructive"
                      >
                        <HiArrowRightOnRectangle className="size-4" />
                        <span>Log Out</span>
                      </Button>
                    </form>
                  </>
                ) : (
                  <>
                    <Button
                      asChild
                      variant="ghost"
                      className="justify-start rounded-lg py-4 text-base font-semibold underline hover:bg-transparent dark:hover:bg-transparent"
                    >
                      <Link href="/login" onClick={() => setIsMenuOpen(false)}>
                        Log in
                      </Link>
                    </Button>

                    <Button
                      asChild
                      className="rounded-full bg-foreground py-5 text-base font-medium hover:bg-foreground/95"
                    >
                      <Link href="/signup" onClick={() => setIsMenuOpen(false)}>
                        Get started
                      </Link>
                    </Button>
                  </>
                )}
              </motion.div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
