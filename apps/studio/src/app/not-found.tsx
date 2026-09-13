import { ChevronRightIcon } from '@heroicons/react/20/solid'
import {
  BookmarkSquareIcon,
  BookOpenIcon,
  QueueListIcon,
  RssIcon,
} from '@heroicons/react/24/solid'
import SectionHeading from '@/components/section-heading'
import { FaArrowLeftLong } from 'react-icons/fa6'
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: '404',
  description:
    'The page you’re looking for doesn’t exist or may have been moved. Explore Docento to discover powerful tools for learning businesses, course creators, and training teams.',
  keywords: [
    '404',
    'page not found',
    'missing page',
    'Docento error page',
    'resource not found',
    'invalid URL',
  ],
  openGraph: {
    title: '404 | Docento',
    description:
      "We couldn't find the page you're trying to reach. Continue exploring Docento’s platform for creators, educators, and training teams.",
    url: '/404',
    type: 'website',
  },
  robots: {
    index: false,
    follow: true,
  },
}

const links = [
  {
    name: 'Documentation',
    href: '#',
    description: 'Learn how to integrate our tools with your app.',
    icon: BookOpenIcon,
  },
  {
    name: 'API Reference',
    href: '#',
    description: 'A complete API reference for our libraries.',
    icon: QueueListIcon,
  },
  {
    name: 'Blog',
    href: '/blog',
    description: 'Read our latest news and articles.',
    icon: RssIcon,
  },
]

export default function Example() {
  return (
    <div className=" relative w-full mx-auto">
      <svg
        aria-hidden="true"
        className="absolute inset-0 -z-10 size-full mask-[radial-gradient(100%_100%_at_top_right,white,transparent)] stroke-gray-200"
      >
        <defs>
          <pattern
            x="50%"
            y={-1}
            id="983e3e4c-de6d-4c3f-8d64-b9761d1534cc"
            width={200}
            height={200}
            patternUnits="userSpaceOnUse"
          >
            <path d="M.5 200V.5H200" fill="none" />
          </pattern>
        </defs>
        <svg x="50%" y={-1} className="overflow-visible fill-gray-50">
          <path
            d="M-200 0h201v201h-201Z M600 0h201v201h-201Z M-400 600h201v201h-201Z M200 800h201v201h-201Z"
            strokeWidth={0}
          />
        </svg>
        <rect
          fill="url(#983e3e4c-de6d-4c3f-8d64-b9761d1534cc)"
          width="100%"
          height="100%"
          strokeWidth={0}
        />
      </svg>
      <main className="mx-auto w-full max-w-7xl px-6 pt-5 pb-16 sm:pb-24 lg:px-8">
        <div className="mx-auto mt-20 max-w-2xl text-center sm:mt-14">
          <p className="text-lg/8 font-semibold text-accent">404</p>
          <SectionHeading
            heading="This page does not exist"
            subheading="Sorry, we couldn’t find the page you’re looking for."
            alignment="center"
          />
        </div>
        <div className="mx-auto mt-16 flow-root max-w-lg sm:mt-20">
          <h2 className="sr-only">Popular pages</h2>
          <ul
            role="list"
            className="-mt-6 divide-y divide-gray-900/5 border-b border-gray-900/5"
          >
            {links.map((link, linkIdx) => (
              <li key={linkIdx} className="relative flex gap-x-6 py-6">
                <div className="flex size-10 flex-none items-center justify-center rounded-lg shadow-xs outline-1 outline-gray-900/10">
                  <link.icon
                    aria-hidden="true"
                    className="size-6 text-accent"
                  />
                </div>
                <div className="flex-auto">
                  <h3 className="text-sm/6 font-semibold text-gray-900">
                    <a href={link.href}>
                      <span aria-hidden="true" className="absolute inset-0" />
                      {link.name}
                    </a>
                  </h3>
                  <p className="mt-2 text-sm/6 text-gray-600">
                    {link.description}
                  </p>
                </div>
                <div className="flex-none self-center">
                  <ChevronRightIcon
                    aria-hidden="true"
                    className="size-5 text-gray-400"
                  />
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-10 flex justify-center">
            <a
              href="/"
              className="text-sm/6 flex items-center justify-center gap-2.5 font-semibold text-accent"
            >
              <span aria-hidden="true">
                <FaArrowLeftLong className="size-4" />
              </span>{' '}
              Back to home
            </a>
          </div>
        </div>
      </main>
    </div>
  )
}
