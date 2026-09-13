import { CalendarDaysIcon, HandRaisedIcon } from "@heroicons/react/24/outline";
import SectionHeading from "./section-heading";

export default function Newsletter() {
  return (
    <div className="relative isolate overflow-hidden bg-white border-y py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="mx-auto grid max-w-2xl grid-cols-1 gap-x-8 gap-y-16 lg:max-w-none lg:grid-cols-2">
          <div className="max-w-xl">
            <SectionHeading
              heading="Our newsletter"
              subheading="Get updates about Docento, new features, helpful guides, and
              product news. Straight to your inbox."
            />
            <div className="mt-6 flex max-w-md gap-x-4">
              <label htmlFor="email-address" className="sr-only">
                Email address
              </label>
              <input
                id="email-address"
                name="email"
                type="email"
                required
                placeholder="Enter your email"
                autoComplete="email"
                className="min-w-0 flex-auto rounded-md bg-white px-3.5 py-2 text-base text-gray-900 outline-1 -outline-offset-1 outline-gray-300 placeholder:text-gray-500 focus:outline-2 focus:-outline-offset-2 focus:outline-indigo-600 sm:text-sm/6"
              />
              <button
                type="submit"
                className="flex-none rounded-md bg-accent px-3.5 py-2.5 text-sm font-semibold text-white cursor-pointer shadow-xs hover:bg-accent-foreground/90 transition-colors duration-200 ease-in-out focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
              >
                Subscribe
              </button>
            </div>
          </div>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-10 sm:grid-cols-2 lg:pt-2">
            <div className="flex flex-col items-start">
              <div className="rounded-md bg-white/50 p-2 ring-1 ring-gray-200">
                <CalendarDaysIcon
                  aria-hidden="true"
                  className="size-6 text-gray-600"
                />
              </div>
              <dt className="mt-4 text-base font-semibold text-gray-900">
                Weekly insights
              </dt>
              <dd className="mt-2 text-base/7 text-gray-600">
                Learn about product releases, tips for building learning
                experiences, and simple guides to help you get more out of
                Docento.
              </dd>
            </div>

            <div className="flex flex-col items-start">
              <div className="rounded-md bg-white/50 p-2 ring-1 ring-gray-200">
                <HandRaisedIcon
                  aria-hidden="true"
                  className="size-6 text-gray-600"
                />
              </div>
              <dt className="mt-4 text-base font-semibold text-gray-900">
                No spam, ever
              </dt>
              <dd className="mt-2 text-base/7 text-gray-600">
                We only share helpful content. No clutter and you can
                unsubscribe anytime.
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div
        aria-hidden="true"
        className="absolute top-0 left-1/2 -z-10 -translate-x-1/2 blur-3xl xl:-top-6"
      >
        <div
          style={{
            clipPath:
              "polygon(74.1% 44.1%, 100% 61.6%, 97.5% 26.9%, 85.5% 0.1%, 80.7% 2%, 72.5% 32.5%, 60.2% 62.4%, 52.4% 68.1%, 47.5% 58.3%, 45.2% 34.5%, 27.5% 76.7%, 0.1% 64.9%, 17.9% 100%, 27.6% 76.8%, 76.1% 97.7%, 74.1% 44.1%)",
          }}
          className="aspect-1155/678 w-288.75 bg-linear-to-tr from-[#ff80b5] to-[#9089fc] opacity-20"
        />
      </div>
    </div>
  );
}
