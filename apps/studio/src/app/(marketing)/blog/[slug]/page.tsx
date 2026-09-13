import { getPost } from "@/lib/blog";
import { siteConfig } from "@/lib/site";
import { formatDate } from "@/lib/utils";
import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Link from "next/link";
import { RxTriangleLeft } from "react-icons/rx";
import Newsletter from "@/components/newsletter";

export async function generateMetadata({
  params,
}: {
  params: {
    slug: string;
  };
}): Promise<Metadata | undefined> {
  const { slug } = await params;

  const post = await getPost(slug);
  if (!post) return;

  const {
    title,
    publishedAt: publishedTime,
    summary: description,
    image,
  } = post.metadata;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime,
      url: `${siteConfig.url}/blog/${post.slug}`,
      images: [
        {
          url: image,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

export default async function Blog({
  params,
}: {
  params: {
    slug: string;
  };
}) {
  const { slug } = await params;

  const post = await getPost(slug);
  if (!post) return;

  return (
    <section id="blog" className="relative bg-white w-full z-10 overflow-hidden">
      <div
        aria-hidden="true"
        className="absolute -top-14 left-[calc(50%-4rem)] -z-10 transform-gpu blur-3xl sm:left-[calc(50%-18rem)]  lg:left-48 xl:left-[calc(50%-24rem)]"
      >
        <div
          style={{
            clipPath:
              "polygon(73.6% 51.7%, 91.7% 11.8%, 100% 46.4%, 97.4% 82.2%, 92.5% 84.9%, 75.7% 64%, 55.3% 47.5%, 46.5% 49.4%, 45% 62.9%, 50.3% 87.2%, 21.3% 64.1%, 0.1% 100%, 5.4% 51.1%, 21.4% 63.9%, 58.9% 0.2%, 73.6% 51.7%)",
          }}
          className="aspect-1108/632 w-290 bg-linear-to-r from-[#ddfcff] via-[#fcfcdd] to-[#f1ebff] to-20% opacity-70"
        />
      </div>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BlogPosting",
            headline: post.metadata.title,
            datePublished: post.metadata.publishedAt,
            dateModified: post.metadata.publishedAt,
            description: post.metadata.summary,
            image: post.metadata.image
              ? `${siteConfig.url}${post.metadata.image}`
              : `${siteConfig.url}/blog/${post.slug}/opengraph-image`,
            url: `${siteConfig.url}/blog/${post.slug}`,
            author: {
              "@type": "Person",
              name: siteConfig.name,
            },
          }),
        }}
      />
      <div className="mx-auto z-10 w-full border-x max-w-[900px] px-4 sm:px-6 md:px-8 lg:px-10">
        <div className="w-full border-x px-4 sm:px-6 md:px-8 lg:px-10">
          <div className="py-12 space-y-4">
            {/* back to blog button */}
            <div className="mb-6 md:mb-10">
              <Link
                href="/blog"
                className="group inline-flex items-center text-sm font-medium text-foreground/80 hover:text-foreground transition-all duration-200 ease-in-out"
              >
                <RxTriangleLeft className="size-[22px] group-hover:-translate-x-1 transition-all duration-200 ease-in-out" />{" "}
                Back to Blog
              </Link>
            </div>
            {/* Date */}
            <div className="flex justify-between items-center text-sm">
              <Suspense fallback={<p className="h-5" />}>
                <div className="flex items-center space-x-2">
                  <time
                    dateTime={post.metadata.publishedAt}
                    className="text-sm text-gray-500"
                  >
                    {formatDate(post.metadata.publishedAt)}
                  </time>
                </div>
              </Suspense>
            </div>
            {/* Title/Summary */}
            <div className="flex flex-col">
              <h1 className="title font-semibold mt-5 text-4xl tracking-tighter">
                {post.metadata.title}
              </h1>
              <p className="mt-4 font-noto text-lg text-foreground/70">
                {post.metadata.summary}
              </p>
            </div>
            {/* Blog Image */}
            {post.metadata.image && (
              <div className="mt-8 mb-12">
                <Image
                  width={1920}
                  height={1080}
                  src={post.metadata.image}
                  alt={post.metadata.title}
                  className="w-full h-auto rounded-lg border shadow-md"
                />
              </div>
            )}
            {/* Content */}
            <article
              className="prose mx-auto max-w-full"
              dangerouslySetInnerHTML={{ __html: post.source }}
            ></article>
          </div>
        </div>
      </div>
      <Newsletter />
    </section>
  );
}
