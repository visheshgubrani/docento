'use client'

import { motion } from 'framer-motion'
import BlogCard from './blog-card'
import { Post } from '@/lib/blog'

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' as const },
  },
}

export function AnimatedBlogCard({
  data,
  priority,
  index,
}: {
  data: Post
  priority: boolean
  index: number
}) {
  return (
    <motion.div
      variants={itemVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: index * 0.1 }}
    >
      <BlogCard data={data} priority={priority} />
    </motion.div>
  )
}
