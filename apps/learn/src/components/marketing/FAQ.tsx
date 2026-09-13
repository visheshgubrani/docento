'use client'

import { useState } from 'react'
import { faqData } from '@/config/marketing/home'
import { HiPlus, HiMinus } from 'react-icons/hi2'

interface FaqItemProps {
  id: string
  question: string
  answer: string
  isOpen: boolean
  onToggle: () => void
}

function FaqItem({ id, question, answer, isOpen, onToggle }: FaqItemProps) {
  return (
    <div id={id}>
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start justify-between gap-6 py-4 text-left text-base/7 text-foreground"
        aria-expanded={isOpen}
      >
        <span className="font-medium">{question}</span>
        {isOpen ? (
          <HiMinus className="h-6 w-6 shrink-0" />
        ) : (
          <HiPlus className="h-6 w-6 shrink-0" />
        )}
      </button>
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="-mt-2 pr-12 pb-4 text-sm/7 text-foreground/75">
          {answer}
        </div>
      </div>
    </div>
  )
}

export function FAQ() {
  const [openId, setOpenId] = useState<string | null>(null)

  const handleToggle = (id: string) => {
    setOpenId(openId === id ? null : id)
  }

  return (
    <section className="pt-16 pb-12 md:pt-20">
      <div className="mx-auto w-full max-w-2xl px-6 md:max-w-3xl lg:max-w-7xl lg:px-10">
        <div className="grid grid-cols-1 gap-x-2 gap-y-8 lg:grid-cols-2">
          <div className="flex flex-col gap-6">
            <h2 className="text-foreground font-display text-[2rem]/10 tracking-tight text-pretty sm:text-5xl/[1.2]">
              {faqData.headline}
            </h2>
          </div>

          <div className="divide-y divide-border border-y border-border">
            {faqData.faqs.map((faq) => (
              <FaqItem
                key={faq.id}
                id={faq.id}
                question={faq.question}
                answer={faq.answer}
                isOpen={openId === faq.id}
                onToggle={() => handleToggle(faq.id)}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
