export function QuizSkeleton() {
    return (
        <div className='min-h-screen'>
            <div className='max-w-7xl mx-auto'>
                {/* Header Skeleton */}
                <div className='rounded-md border border-neutral-200 bg-white p-5 mb-6 animate-pulse'>
                    <div className='flex items-center justify-between gap-4'>
                        <div>
                            <div className='h-8 w-48 bg-neutral-200 rounded mb-2'></div>
                            <div className='h-4 w-96 bg-neutral-100 rounded'></div>
                        </div>
                        <div className='h-10 w-32 bg-neutral-200 rounded'></div>
                    </div>
                </div>

                {/* Two Column Grid */}
                <div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
                    {/* Left Column - Questions (2/3 width) */}
                    <div className='lg:col-span-2 space-y-4'>
                        {/* Questions Header */}
                        <div className='flex items-center justify-between'>
                            <div className='h-7 w-32 bg-neutral-200 rounded animate-pulse'></div>
                            <div className='h-10 w-40 bg-neutral-200 rounded animate-pulse'></div>
                        </div>

                        {/* Question Card Skeletons */}
                        {[1, 2].map((i) => (
                            <div
                                key={i}
                                className='rounded-md border border-neutral-200 bg-white p-5 space-y-4 animate-pulse'
                            >
                                {/* Question Header */}
                                <div className='flex items-start justify-between'>
                                    <div className='h-6 w-32 bg-neutral-200 rounded'></div>
                                    <div className='flex items-center gap-2'>
                                        <div className='h-8 w-16 bg-neutral-100 rounded'></div>
                                        <div className='h-8 w-8 bg-neutral-100 rounded'></div>
                                    </div>
                                </div>

                                {/* Question Type */}
                                <div className='flex items-center gap-3'>
                                    <div className='h-4 w-28 bg-neutral-100 rounded'></div>
                                    <div className='h-9 w-48 bg-neutral-100 rounded'></div>
                                </div>

                                {/* Question Text */}
                                <div className='space-y-2'>
                                    <div className='h-4 w-24 bg-neutral-100 rounded'></div>
                                    <div className='h-20 w-full bg-neutral-100 rounded'></div>
                                </div>

                                {/* Divider */}
                                <div className='border-t border-neutral-200'></div>

                                {/* Answers */}
                                <div className='space-y-3'>
                                    <div className='h-4 w-56 bg-neutral-100 rounded'></div>
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className='flex items-center gap-3'>
                                            <div className='h-10 flex-1 bg-neutral-100 rounded'></div>
                                            <div className='h-5 w-5 bg-neutral-100 rounded'></div>
                                            {j > 2 && <div className='h-9 w-9 bg-neutral-100 rounded'></div>}
                                        </div>
                                    ))}
                                </div>

                                {/* Explanation and Points */}
                                <div className='grid grid-cols-1 md:grid-cols-2 gap-4 pt-2'>
                                    <div className='space-y-2'>
                                        <div className='h-4 w-36 bg-neutral-100 rounded'></div>
                                        <div className='h-16 w-full bg-neutral-100 rounded'></div>
                                    </div>
                                    <div className='space-y-2'>
                                        <div className='h-4 w-20 bg-neutral-100 rounded'></div>
                                        <div className='h-10 w-full bg-neutral-100 rounded'></div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Right Column - Quiz Details (1/3 width) */}
                    <div className='lg:col-span-1'>
                        <div className='rounded-md border border-neutral-200 bg-white p-5 space-y-5 animate-pulse'>
                            {/* Header */}
                            <div className='flex items-center justify-between'>
                                <div className='h-6 w-32 bg-neutral-200 rounded'></div>
                                <div className='h-9 w-9 bg-neutral-100 rounded'></div>
                            </div>

                            {/* Quiz Details Fields */}
                            {[1, 2, 3, 4, 5].map((i) => (
                                <div key={i} className='space-y-2'>
                                    <div className='h-4 w-24 bg-neutral-100 rounded'></div>
                                    <div className='h-10 w-full bg-neutral-100 rounded'></div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
