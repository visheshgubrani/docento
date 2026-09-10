import { Post } from "@/lib/blog";
import { formatDate } from "@/lib/utils";
import Image from "next/image";
import Link from "next/link";
import { RxTriangleRight } from "react-icons/rx";

export default function BlogCard({
  data,
  priority,
}: {
  data: Post;
  priority?: boolean;
}) {
  return (
    <Link href={`/blog/${data.slug}`} className="group block">
      <div className="bg-neutral-50/50 backdrop-blur-lg border border-neutral-200 rounded-lg p-4 mb-4 shadow-md shadow-accent-200 transition-shadow duration-200">
        {data.image && (
          <Image
            className="rounded-lg h-55 bg-[#f9f9f9] object-cover border shadow-lg"
            src={data.image}
            width={1200}
            height={530}
            alt={data.title}
            priority={priority}
          />
        )}
        {!data.image && <div className="bg-gray-200 h-[180px] mb-4 rounded" />}
        <p className="my-5">
          <time
            dateTime={data.publishedAt}
            className="text-sm text-muted-foreground"
          >
            {formatDate(data.publishedAt)}
          </time>
        </p>
        <h3 className="text-2xl/8 font-noto text-foreground/80 font-semibold mb-2 group-hover:text-foreground/90">{data.title}</h3>
        <p className="text-foreground/55 text-sm/6 mt-2.5 mb-6 line-clamp-2">{data.summary}</p>
        <span className="group inline-flex font-ibm items-center text-lg font-medium text-neutral-600 ">
          <span className="group-hover:text-neutral-900">Read More</span>
          <RxTriangleRight
            aria-hidden="true"
            className="size-6 text-neutral-600 group-hover:text-neutral-900 group-hover:translate-x-1 transition-all ease-in-out duration-200"
          />
        </span>
      </div>
    </Link>
  );
}
