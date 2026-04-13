'use client';

import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

interface FaqItem {
  q: string;
  a: string;
}

interface PricingFaqProps {
  faqs: FaqItem[];
  title: string;
  subtitle: string;
}

export default function PricingFaq({ faqs, title, subtitle }: PricingFaqProps) {
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  return (
    <section className="py-16 sm:py-20 px-5 sm:px-8">
      <div className="max-w-[720px] mx-auto">
        <div className="mb-10">
          <h2 className="text-[28px] sm:text-[34px] font-extrabold tracking-[-0.02em] text-[#1f1e1d] mb-2">{title}</h2>
          <p className="text-[14px] text-[#6b6760]">{subtitle}</p>
        </div>

        <div className="space-y-2">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-xl border transition-all overflow-hidden ${
                openFaq === index
                  ? 'bg-white border-[#FDBF1D]/30 shadow-sm'
                  : 'bg-white border-[#e8e4de] hover:border-[#d4cfc8]'
              }`}
            >
              <button
                id={`faq-btn-${index}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-6 py-5 flex items-center justify-between text-left gap-4"
                aria-expanded={openFaq === index}
              >
                <span className="text-[14px] sm:text-[15px] font-semibold text-[#1f1e1d] leading-snug">{faq.q}</span>
                <ChevronDown
                  size={18}
                  className={`flex-shrink-0 transition-transform duration-200 ${
                    openFaq === index ? 'rotate-180 text-[#FDBF1D]' : 'text-[#ada89f]'
                  }`}
                />
              </button>
              {openFaq === index && (
                <div className="px-6 pb-5 text-[14px] text-[#6b6760] leading-relaxed border-t border-[#e8e4de]/60 pt-4">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
