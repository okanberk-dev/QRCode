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
    <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white border-t-[3px] border-[#0F2348]">
      <div className="max-w-[800px] mx-auto">
        <div className="mb-12 sm:mb-16 text-center">
          <h2 className="text-[32px] sm:text-[52px] font-black tracking-tight text-[#0F2348] leading-tight mb-4 uppercase">{title}</h2>
          <p className="text-[16px] sm:text-[18px] text-[#243554] font-bold">{subtitle}</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-[24px] sm:rounded-[32px] border-[3px] transition-all overflow-hidden ${
                openFaq === index
                  ? 'bg-white border-[#0F2348] shadow-[8px_10px_0_0_#0F2348]'
                  : 'bg-[#F5F4F1] border-[#0F2348] shadow-[4px_4px_0_0_#0F2348] hover:shadow-[6px_6px_0_0_#0F2348] hover:-translate-y-0.5'
              }`}
            >
              <button
                id={`faq-btn-${index}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-8 py-6 sm:py-8 flex items-center justify-between text-left gap-6"
                aria-expanded={openFaq === index}
              >
                <span className="text-[16px] sm:text-[18px] font-black text-[#0F2348] tracking-tight leading-snug">{faq.q}</span>
                <div className={`w-10 h-10 rounded-xl border-2 border-[#0F2348] flex items-center justify-center transition-all ${openFaq === index ? 'bg-[#FF9A14] rotate-180' : 'bg-white'}`}>
                  <ChevronDown
                    size={20}
                    strokeWidth={3}
                    className={`${openFaq === index ? 'text-[#0F2348]' : 'text-[#0F2348]'}`}
                  />
                </div>
              </button>
              {openFaq === index && (
                <div className="px-8 pb-8 text-[15px] sm:text-[16px] text-[#243554] leading-relaxed font-bold border-t-[3px] border-[#0F2348] pt-6 bg-white">
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
