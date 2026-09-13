import { AnimatedBlogCard } from '@/components/blog-card-animated'
import { getBlogPosts } from '@/lib/blog'
import { StaticSectionHeader } from '@/components/landing'
import { GridPattern } from '@/components/GridPattern'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Blog',
  description:
    'Stay updated with the latest insights on headless LMS architecture, learning infrastructure, creator tools, product updates, and the future of learning platforms. Learn how Docento helps businesses build custom learning experiences.',
  keywords: [
    'docento blog',
    'headless lms',
    'lms insights',
    'learning platform blog',
    'creator tools blog',
    'edtech blog',
    'learning infrastructure',
    'product updates',
  ],
  openGraph: {
    title:
      'Docento Blog — Latest Insights on LMS, Learning Infrastructure & Creator Tools',
    description:
      'Explore articles on headless LMS, custom learning platforms, creator enablement, and deep product insights from Docento.',
    url: '/blog',
    type: 'website',
    images: [
      {
        url: '/og/blog.png',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Docento Blog — Insights, Updates & Learning Architecture',
    description:
      'Thoughtful articles on building scalable learning experiences, LMS architecture, and creator-focused tools.',
    images: ['/og/blog.png'],
  },
}

export default async function Blog() {
  const allPosts = await getBlogPosts()

  const articles = await Promise.all(
    allPosts.sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)),
  )

  return (
    <>
      <div className="mx-auto overflow-hidden relative w-full">
        {/* Grid Pattern Background */}
        <div className="absolute -z-[1] inset-0 overflow-hidden pointer-events-none">
          <GridPattern
            className="absolute inset-0 h-full w-full fill-accent-100/30 stroke-neutral-950/3"
            style={{
              maskImage:
                'linear-gradient(to bottom left, white 40%, transparent 50%)',
              WebkitMaskImage:
                'linear-gradient(to bottom left, white 40%, transparent 50%)',
            }}
            yOffset={-200}
          />
        </div>
        <div
          aria-hidden="true"
          className="absolute top-10 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)] lg:top-[calc(50%-30rem)] lg:left-48 xl:left-[calc(50%-24rem)]"
        >
          <div
            style={{
              clipPath:
                'polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)',
            }}
            className="aspect-1108/632 w-290 bg-linear-to-r from-[#e4f9fb] via-[#fbfbe6] to-[#f2eefc] to-20% opacity-70"
          />
        </div>
        <div className="max-w-6xl mx-auto w-full md:py-20 py-16">
          <div className="text-left w-full mx-auto px-4 lg:px-6">
            <StaticSectionHeader
              badge="Blog"
              title="Updates from Docento"
              description="Explore creator advice, platform updates, and insights designed to help you build, teach, and grow with Docento."
              align="left"
            />
          </div>
          <div className="mx-auto grid w-full grid-cols-1 gap-8 px-2.5 pt-8 lg:grid-cols-2">
            {articles.map((data, idx) => (
              <AnimatedBlogCard
                key={data.slug}
                data={data}
                priority={idx <= 1}
                index={idx}
              />
            ))}
          </div>
        </div>
      </div>
    </>
  )
}
