'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

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
    <section className="py-24 px-6 max-w-3xl mx-auto font-medium">
      <div className="text-center mb-16 space-y-2">
        <h2 className="text-4xl font-black mb-4">{title}</h2>
        <p className="text-gray-400 font-bold">{subtitle}</p>
      </div>

      <div className="space-y-4">
        {faqs.map((faq, index) => (
          <div key={index} className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
            <button
              id={`faq-btn-${index}`}
              onClick={() => setOpenFaq(openFaq === index ? null : index)}
              className="w-full px-8 py-6 flex items-center justify-between hover:bg-gray-50 transition-colors text-left"
              aria-expanded={openFaq === index}
            >
              <span className="text-lg font-black text-[#111827]">{faq.q}</span>
              {openFaq === index
                ? <ChevronUp size={20} className="text-[#FDBF1D] flex-shrink-0" />
                : <ChevronDown size={20} className="text-gray-400 flex-shrink-0" />
              }
            </button>
            {openFaq === index && (
              <div className="px-8 pb-8 text-gray-500 font-bold leading-relaxed">
                {faq.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
