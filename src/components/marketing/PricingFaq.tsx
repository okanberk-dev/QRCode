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
    <section className="px-6 sm:px-10 py-16 sm:py-24">
      <div className="max-w-[800px] mx-auto">
        {(title || subtitle) && (
          <div className="mb-12 sm:mb-14 text-center">
            {title && (
              <h2 className="text-[32px] sm:text-[48px] font-medium tracking-[-0.035em] text-[#0A0A0A] leading-[1.02]">
                {title}
              </h2>
            )}
            {subtitle && <p className="mt-4 text-[16px] text-[#525252] leading-relaxed">{subtitle}</p>}
          </div>
        )}

        <div className="divide-y divide-[#EDEDED] border-y border-[#EDEDED]">
          {faqs.map((faq, index) => {
            const isOpen = openFaq === index;
            return (
              <div key={index}>
                <button
                  id={`faq-btn-${index}`}
                  onClick={() => setOpenFaq(isOpen ? null : index)}
                  className="w-full py-5 sm:py-6 flex items-center justify-between text-left gap-6 group"
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                >
                  <span className="text-[16px] sm:text-[17px] font-medium text-[#0A0A0A] leading-snug">
                    {faq.q}
                  </span>
                  <span
                    className={`shrink-0 w-8 h-8 rounded-full border border-[#EDEDED] flex items-center justify-center transition-all ${
                      isOpen ? 'bg-[#C6F24E] border-[#C6F24E] rotate-180' : 'bg-white group-hover:bg-[#FAFAFA]'
                    }`}
                  >
                    <ChevronDown size={16} strokeWidth={2.25} className="text-[#0A0A0A]" />
                  </span>
                </button>
                {/* Always in the markup (see FaqAccordion): collapsed with [hidden], not unmounted. */}
                <div
                  id={`faq-panel-${index}`}
                  hidden={!isOpen}
                  className="pb-6 pr-14 text-[15px] text-[#525252] leading-[1.6]"
                >
                  {faq.a}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
