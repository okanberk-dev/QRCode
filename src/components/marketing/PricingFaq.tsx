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
    <section className="py-20 sm:py-32 px-5 sm:px-8 bg-white border-t-[3px] border-[#0A0A0A]">
      <div className="max-w-[800px] mx-auto">
        <div className="mb-12 sm:mb-16 text-center">
          <h2 className="text-[32px] sm:text-[52px] font-extrabold tracking-tight text-[#0A0A0A] leading-tight mb-4 uppercase">{title}</h2>
          <p className="text-[16px] sm:text-[18px] text-[#1A1A1A] font-bold">{subtitle}</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`rounded-[24px] sm:rounded-[32px] border transition-all overflow-hidden ${
                openFaq === index
                  ? 'bg-white border-[#0A0A0A] shadow-md'
                  : 'bg-[#FFFFFF] border-[#0A0A0A] shadow-md hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              <button
                id={`faq-btn-${index}`}
                onClick={() => setOpenFaq(openFaq === index ? null : index)}
                className="w-full px-8 py-6 sm:py-8 flex items-center justify-between text-left gap-6"
                aria-expanded={openFaq === index}
              >
                <span className="text-[16px] sm:text-[18px] font-black text-[#0A0A0A] tracking-tight leading-snug">{faq.q}</span>
                <div className={`w-10 h-10 rounded-xl border-2 border-[#0A0A0A] flex items-center justify-center transition-all ${openFaq === index ? 'bg-[#C6F24E] rotate-180' : 'bg-white'}`}>
                  <ChevronDown
                    size={20}
                    strokeWidth={2}
                    className={`${openFaq === index ? 'text-[#0A0A0A]' : 'text-[#0A0A0A]'}`}
                  />
                </div>
              </button>
              {openFaq === index && (
                <div className="px-8 pb-8 text-[15px] sm:text-[16px] text-[#1A1A1A] leading-relaxed font-bold border-t-[3px] border-[#0A0A0A] pt-6 bg-white">
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
