/**
 * Tailwind v4 config (CSS-first hybrid).
 *
 * Stage 66 §38.147 — yeni `src/components/animations/` PR0 base için
 * eklenmiştir. Mevcut Pulse §11 disipline (`@theme {}` block in globals.css
 * + inline hex `bg-[#C6F24E]`) intact; bu config sadece YENİ animation
 * component'leri için `bg-brand-lime` / `bg-brand-ink` / `bg-brand-bg`
 * utility class'larını üretir. Tailwind v4 hem @theme hem config dosyasını
 * paralel okur (drift sıfır).
 *
 * Mevcut callsite'lar (200+ inline hex `bg-[#C6F24E]`) DOKUNULMAZ.
 * Yeni animation component'leri `bg-brand-lime` paterni kullanır.
 */
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/app/**/*.{ts,tsx}',
    './src/components/**/*.{ts,tsx}',
    './src/lib/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        // Pulse §11 brand tokens — Stage 66 §38.147 yeni animation utility'leri
        brand: {
          lime: '#C6F24E',           // signature accent
          'lime-deep': '#A8D62E',    // hover state
          'lime-soft': '#EAF9B8',    // tint / arkaplan
          ink: '#0A0A0A',            // ana mürekkep / text
          bg: '#FAFAFA',             // ana yüzey alt-tier
          paper: '#FFFFFF',          // kart yüzeyi
          mute: '#525252',           // muted text
          'mute-soft': '#737373',    // light muted text
        },
      },
      keyframes: {
        // Stage 66 §38.147 — yeni animation component'leri için keyframes
        // Mevcut globals.css keyframes (marqueeSlide, bzFadeUp, ecgDraw, vb.)
        // INTACT — bu yeni keyframes sadece yeni animation surface'ler için.
        'brand-pulse': {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.85', transform: 'scale(1.05)' },
        },
        'brand-marquee': {
          from: { transform: 'translateX(0)' },
          to: { transform: 'translateX(-50%)' },
        },
        'brand-float': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        'brand-draw': {
          '0%': { strokeDashoffset: '500' },
          '60%, 100%': { strokeDashoffset: '0' },
        },
        'brand-slide-up': {
          from: { transform: 'translateY(20px)', opacity: '0' },
          to: { transform: 'translateY(0)', opacity: '1' },
        },
        'brand-slide-in': {
          from: { transform: 'translateX(-12px)', opacity: '0' },
          to: { transform: 'translateX(0)', opacity: '1' },
        },
      },
      animation: {
        'brand-pulse': 'brand-pulse 1.6s ease-in-out infinite',
        'brand-marquee': 'brand-marquee 22s linear infinite',
        'brand-float': 'brand-float 3.2s ease-in-out infinite',
        'brand-draw': 'brand-draw 2.4s ease-out infinite',
        'brand-slide-up': 'brand-slide-up 0.6s cubic-bezier(0.65,0,0.35,1)',
        'brand-slide-in': 'brand-slide-in 0.5s ease-out',
      },
    },
  },
};

export default config;
