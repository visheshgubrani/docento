export const BLUR_FADE_DELAY = 0.15;

export const siteConfig = {
  name: "Docento",
  description: "Modern Open-Source Headless LMS",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  keywords: ["LMS", "Headless LMS", "Open Source", "Next.js", "React", "Tailwind CSS"],
  links: {
    email: "support@docento.dev",
    twitter: "https://twitter.com/",
    discord: "https://discord.gg/",
    github: "https://github.com/visheshgubrani/docento",
    instagram: "https://instagram.com/",
  },
};

export type SiteConfig = typeof siteConfig;
