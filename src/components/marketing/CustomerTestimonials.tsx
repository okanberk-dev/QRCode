import { Star, ShieldCheck } from 'lucide-react';
import type { Locale } from '@/lib/translations';
import Link from 'next/link';

interface TestimonialProps {
  quote:       string;
  name:        string;
  role:        string;
  company:     string;
  avatarUrl?:  string;
  initials:    string;
  link?:       string;
  locale:      Locale;
}

function Testimonial({ quote, name, role, company, avatarUrl, initials, link, locale }: TestimonialProps) {
  const isTr = locale === 'tr';
  const Wrapper = link ? Link : 'div';
  
  return (
    <Wrapper 
      href={link || ''}
      className={`group relative w-full bg-white p-8 sm:p-10 rounded-2xl border border-[#0A0A0A] shadow-md flex flex-col z-10 transition-transform duration-300 hover:-translate-y-2 ${link ? 'cursor-pointer' : ''}`}
    >
      <div className="flex items-center justify-between mb-5">
        <div className="flex gap-1 text-[#C6F24E]">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star key={i} size={18} fill="currentColor" strokeWidth={0} />
          ))}
        </div>
        <div className="bg-[#0A0A0A] rounded-full p-1 border border-[#0A0A0A] shadow-sm">
          <div className="bg-white rounded-full p-1 text-[#0A0A0A]">
            <ShieldCheck size={12} />
          </div>
        </div>
      </div>
      
      <blockquote className="text-[15px] sm:text-[16px] text-[#0A0A0A] mb-8 leading-relaxed font-bold italic">
        "{quote}"
      </blockquote>

      <div className="mt-auto flex items-center gap-3 border-t border-[#EDEDED] pt-5">
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt={name}
            width={44}
            height={44}
            className="h-11 w-11 rounded-full object-cover border-2 border-[#0A0A0A]"
          />
        ) : (
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#C6F24E] text-sm font-black text-[#0A0A0A] border-2 border-[#0A0A0A] shadow-md">
            {initials}
          </div>
        )}
        <div className="min-w-0">
          <p className="text-[14px] font-black text-[#0A0A0A] truncate">{name}</p>
          <p className="text-[11px] font-bold text-[#1A1A1A] uppercase tracking-wider truncate">
            {role}, {company}
          </p>
        </div>
        {link && (
          <div className="ml-auto text-[10px] font-black text-[#C6F24E] uppercase tracking-widest hidden sm:flex items-center gap-1 group-hover:translate-x-1 transition-transform">
            {isTr ? 'HİKAYEYİ OKU' : 'VIEW CASE'}
          </div>
        )}
      </div>
    </Wrapper>
  );
}

interface CustomerTestimonialsProps {
  locale: Locale;
}

export default function CustomerTestimonials({ locale }: CustomerTestimonialsProps) {
  const isTr = locale === 'tr';

  const testimonials = [
    {
      name: isTr ? 'Mert Altınbaş' : 'Mert Altinbas',
      role: isTr ? 'Kurucu' : 'Founder',
      company: 'Gourmet Eats',
      initials: 'MA',
      quote: isTr 
        ? "Buaze, tüm yorum platformlarımızı tek bir panelde birleştirerek ekibimize inanılmaz zaman kazandırdı. Şubelerimizdeki müşteri memnuniyetini anlık olarak izleyebiliyoruz."
        : "Buaze has saved our team incredible time by consolidating all review platforms into one dashboard. We can monitor customer satisfaction across locations in real-time.",
    },
    {
      name: isTr ? 'Selin Başar' : 'Selin Basar',
      role: isTr ? 'Operasyon Direktörü' : 'Operations Director',
      company: 'Pizza Locale',
      initials: 'SB',
      link: `/${locale}/case-study/pizza-locale`,
      quote: isTr
        ? "Akıllı bildirim sistemi ve olumsuz yorum filtresi Pizza Locale için gerçek bir dönüm noktası oldu. Krizleri büyümeden çözme şansı veriyor."
        : "The smart notification system and negative review filter have been a real turning point for Pizza Locale. It gives us the chance to resolve crises before they grow.",
    }
  ];

  return (
    <section className="py-20 sm:py-32 px-5 sm:px-8 bg-[#FFFFFF]">
      <div className="max-w-[800px] mx-auto text-center mb-16 sm:mb-24">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border-2 border-[#0A0A0A] rounded-full shadow-md mb-6">
           <span className="text-[10px] font-black uppercase tracking-widest text-[#0A0A0A]">{isTr ? 'REFERANSLARIMIZ' : 'OUR TESTIMONIALS'}</span>
        </div>
        <h2 className="text-[36px] sm:text-[60px] font-extrabold text-[#0A0A0A] tracking-tight leading-none">
          {isTr ? 'Yüzlerce işletme ' : 'Hundreds of businesses '}
          <span className="text-[#C6F24E]">{isTr ? 'Buaze' : 'trust Buaze'}</span>
          {isTr ? 'ye güveniyor' : ''}
        </h2>
      </div>

      <div className="max-w-[1240px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        {testimonials.map((t, i) => (
          <Testimonial key={i} {...t} locale={locale} />
        ))}
      </div>
    </section>
  );
}

