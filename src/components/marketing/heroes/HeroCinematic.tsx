'use client';

/**
 * Stage 41 §38.122 — HANDOFF §8 step 8 (Heroes) — Variant v1.
 *
 * 9 saniyelik loop, 5 sahne ile ürünün özünü hikâyeleştirir:
 *  - 0.0–2.0s  Sahne 1 — QR pulse (logo + ring expand)
 *  - 1.8–3.8s  Sahne 2 — tarama (telefon + lazer çizgisi)
 *  - 3.6–5.6s  Sahne 3 — form (yıldızlar + textarea preview)
 *  - 5.4–7.4s  Sahne 4 — AI yanıt (graphite chip + lime sparkle)
 *  - 7.2–9.0s  Sahne 5 — 4.8★ pop (büyük rating + delta)
 *
 * Animation engine: §38.115 `<Stage>` + `<Sprite>` reuse — tab pause
 * (§5.1) + reduced-motion (§5.2) disipline otomatik.
 *
 * Pulse §11 disipline:
 *  - Space Grotesk + tight tracking (italic REDDEDILDI §38.114)
 *  - lime CTA + graphite ink + lime-soft chip
 *  - lucide-react icon set (QrCode, Scan, Sparkles, Star, MessageSquare)
 *  - inline hex (#0A0A0A / #C6F24E / #A8D62E / #EAF9B8) + Tailwind class
 */

import Link from 'next/link';
import { ArrowRight, Play, QrCode, Scan, Sparkles, Star } from 'lucide-react';
import { Stage } from '@/lib/anim/stage';
import { Sprite } from '@/lib/anim/sprite';
import { interpolate, animate, clamp } from '@/lib/anim/interpolate';
import { Easing } from '@/lib/anim/easing';
import { CINEMATIC_DURATION, CINEMATIC_SCENES } from './hero-helpers';

interface Props {
  locale: 'tr' | 'en';
}

const COPY = {
  tr: {
    eyebrow: 'BUAZE PULSE — DİJİTAL İTİBAR İŞLETİM SİSTEMİ',
    title: 'Her yorum bir nabız.\nHer yanıt bir rakip.',
    subtitle:
      'QR ile geri bildirim topla, tek panelden yönet, Pulse AI taslakları ile saniyeler içinde yanıt ver.',
    primaryCta: '14 gün ücretsiz dene',
    secondaryCta: 'Nasıl çalışır?',
    sceneLabels: {
      qrPulse: 'QR OLUŞTUR',
      scan: 'MÜŞTERİ TARAR',
      form: 'YORUM BIRAKIR',
      aiReply: 'AI TASLAĞI HAZIR',
      starPop: 'PUAN ARTAR',
    },
    captions: {
      qrPulse: 'QR oluştur',
      scan: 'Müşteri tarar',
      form: 'Yorum bırakır',
      aiReply: 'AI taslak hazır',
      starPop: '+1.2 puan',
    },
    ratingLabel: 'GENEL PUAN',
    deltaLabel: '90 GÜN İÇİNDE',
    formExample: '"Tatlılar muhteşem, yine geleceğim!"',
    aiPreview: 'Çok teşekkürler! Sizi tekrar görmek için sabırsızlanıyoruz.',
    aiBadge: 'PULSE AI',
    aiTone: 'Sıcak · Onaylı',
  },
  en: {
    eyebrow: 'BUAZE PULSE — DIGITAL REPUTATION OS',
    title: 'Every review is a pulse.\nEvery reply is a moat.',
    subtitle:
      'Collect feedback via QR, manage it from one dashboard, reply in seconds with Pulse AI drafts.',
    primaryCta: 'Start 14-day free trial',
    secondaryCta: 'How it works?',
    sceneLabels: {
      qrPulse: 'GENERATE QR',
      scan: 'CUSTOMER SCANS',
      form: 'LEAVES REVIEW',
      aiReply: 'AI DRAFT READY',
      starPop: 'RATING CLIMBS',
    },
    captions: {
      qrPulse: 'Generate QR',
      scan: 'Customer scans',
      form: 'Leaves review',
      aiReply: 'AI draft ready',
      starPop: '+1.2 stars',
    },
    ratingLabel: 'AVG. RATING',
    deltaLabel: 'IN 90 DAYS',
    formExample: '"Desserts amazing, coming back for sure!"',
    aiPreview: 'Thank you so much! We can\'t wait to welcome you back.',
    aiBadge: 'PULSE AI',
    aiTone: 'Warm · approved',
  },
} as const;

export default function HeroCinematic({ locale }: Props): React.ReactElement {
  const copy = COPY[locale];

  return (
    <section
      className="relative min-h-[640px] overflow-hidden bg-[#FAFAFA]"
      aria-label={locale === 'tr' ? 'Buaze tanıtım sahnesi' : 'Buaze cinematic hero'}
    >
      {/* Soft lime glow corner — pointer-events:none, dekoratif */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-[180px] -top-[140px] h-[420px] w-[420px] rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgba(198,242,78,0.45), transparent 70%)',
        }}
      />

      <div className="relative mx-auto flex min-h-[640px] max-w-[1280px] flex-col items-center gap-10 px-5 py-[60px] sm:px-10 lg:flex-row lg:items-center lg:gap-16 lg:py-[88px]">
        {/* SOL: copy */}
        <div className="relative z-10 w-full max-w-[560px]">
          <span
            className="pulse-eyebrow inline-flex items-center gap-2"
            style={{ color: '#525252' }}
          >
            <span
              aria-hidden
              className="inline-block h-1.5 w-1.5 rounded-full"
              style={{ background: '#C6F24E' }}
            />
            {copy.eyebrow}
          </span>

          <h1
            className="bz-h-tight-2 mt-4 whitespace-pre-line text-[38px] sm:text-[52px] md:text-[64px] lg:text-[72px]"
            style={{
              color: '#0A0A0A',
              lineHeight: 0.95,
              letterSpacing: '-0.03em',
            }}
          >
            {copy.title}
          </h1>

          <p
            className="mt-6 max-w-[480px] text-[16px] leading-[1.55] text-[#525252] sm:text-[17px]"
          >
            {copy.subtitle}
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href={`/${locale}/auth/register`}
              className="bz-btn-primary inline-flex items-center gap-2 rounded-full px-6 py-3.5 text-[14px] font-semibold"
            >
              {copy.primaryCta}
              <ArrowRight size={16} aria-hidden />
            </Link>
            <Link
              href={`/${locale}/how-it-works`}
              className="bz-btn-ghost inline-flex items-center gap-2 rounded-full border border-[#EDEDED] bg-white px-5 py-3.5 text-[14px] font-semibold text-[#0A0A0A] hover:bg-[#F5F5F5]"
            >
              <Play size={14} aria-hidden />
              {copy.secondaryCta}
            </Link>
          </div>

          {/* Live caption strip — sahne adı progress'e göre değişir */}
          <div className="mt-8 hidden h-7 items-center gap-3 sm:flex">
            <span
              aria-hidden
              className="bz-pulse-dot inline-block h-2 w-2 rounded-full"
              style={{ background: '#C6F24E' }}
            />
            <Stage duration={CINEMATIC_DURATION} loop>
              <SceneCaptionStrip captions={copy.captions} />
            </Stage>
          </div>
        </div>

        {/* SAĞ: cinematic stage */}
        <div className="relative w-full max-w-[480px] lg:max-w-[520px]">
          <div
            className="relative aspect-square overflow-hidden rounded-[28px] border border-[#EDEDED] bg-white shadow-[0_24px_60px_-30px_rgba(10,10,10,0.25)]"
            aria-hidden
          >
            <Stage duration={CINEMATIC_DURATION} loop>
              {/* Sahne 1 — QR pulse */}
              <Sprite
                start={CINEMATIC_SCENES.qrPulse.start}
                end={CINEMATIC_SCENES.qrPulse.end}
              >
                {({ progress }) => <SceneQrPulse progress={progress} label={copy.sceneLabels.qrPulse} />}
              </Sprite>

              {/* Sahne 2 — tarama */}
              <Sprite
                start={CINEMATIC_SCENES.scan.start}
                end={CINEMATIC_SCENES.scan.end}
              >
                {({ progress }) => <SceneScan progress={progress} label={copy.sceneLabels.scan} />}
              </Sprite>

              {/* Sahne 3 — form */}
              <Sprite
                start={CINEMATIC_SCENES.form.start}
                end={CINEMATIC_SCENES.form.end}
              >
                {({ progress }) => (
                  <SceneForm
                    progress={progress}
                    label={copy.sceneLabels.form}
                    example={copy.formExample}
                  />
                )}
              </Sprite>

              {/* Sahne 4 — AI yanıt */}
              <Sprite
                start={CINEMATIC_SCENES.aiReply.start}
                end={CINEMATIC_SCENES.aiReply.end}
              >
                {({ progress }) => (
                  <SceneAiReply
                    progress={progress}
                    label={copy.sceneLabels.aiReply}
                    badge={copy.aiBadge}
                    tone={copy.aiTone}
                    preview={copy.aiPreview}
                  />
                )}
              </Sprite>

              {/* Sahne 5 — 4.8★ pop */}
              <Sprite
                start={CINEMATIC_SCENES.starPop.start}
                end={CINEMATIC_SCENES.starPop.end}
              >
                {({ progress }) => (
                  <SceneStarPop
                    progress={progress}
                    label={copy.sceneLabels.starPop}
                    ratingLabel={copy.ratingLabel}
                    deltaLabel={copy.deltaLabel}
                  />
                )}
              </Sprite>
            </Stage>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────────────────────────────────────────────────────
// Sahne 1 — QR pulse
// ─────────────────────────────────────────────────────────────

function SceneQrPulse({ progress, label }: { progress: number; label: string }) {
  const ringScale = animate({ from: 0.6, to: 1.4, ease: Easing.easeOutCubic })(progress);
  const ringOpacity = animate({ from: 0.6, to: 0, start: 0.1, end: 1 })(progress);
  const cardOpacity = animate({ from: 0, to: 1, end: 0.3 })(progress);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
      <span className="pulse-eyebrow" style={{ color: '#737373' }}>
        {label}
      </span>
      <div className="relative mt-6 flex h-[180px] w-[180px] items-center justify-center">
        {/* Pulse ring */}
        <span
          aria-hidden
          className="absolute inset-0 rounded-3xl"
          style={{
            border: '2px solid #C6F24E',
            transform: `scale(${ringScale.toFixed(3)})`,
            opacity: ringOpacity,
          }}
        />
        {/* QR card */}
        <div
          className="relative flex h-[140px] w-[140px] items-center justify-center rounded-2xl border border-[#EDEDED] bg-white"
          style={{ opacity: cardOpacity }}
        >
          <QrCode size={84} strokeWidth={1.6} color="#0A0A0A" aria-hidden />
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sahne 2 — tarama (telefon + lazer)
// ─────────────────────────────────────────────────────────────

function SceneScan({ progress, label }: { progress: number; label: string }) {
  const laserY = interpolate([0, 1], [0, 100])(progress);
  const cardLift = animate({ from: 20, to: 0, ease: Easing.easeOutCubic, end: 0.4 })(progress);
  const cardOpacity = animate({ from: 0, to: 1, end: 0.4 })(progress);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
      <span className="pulse-eyebrow" style={{ color: '#737373' }}>
        {label}
      </span>
      <div
        className="relative mt-6 h-[200px] w-[120px] overflow-hidden rounded-[28px] border-[6px] border-[#0A0A0A] bg-[#FAFAFA]"
        style={{
          opacity: cardOpacity,
          transform: `translateY(${cardLift.toFixed(1)}px)`,
        }}
      >
        {/* Phone notch */}
        <span
          aria-hidden
          className="absolute left-1/2 top-1.5 h-1.5 w-12 -translate-x-1/2 rounded-full bg-[#0A0A0A]"
        />
        {/* QR within */}
        <div className="absolute inset-x-3 top-8 bottom-3 flex items-center justify-center rounded-xl bg-white">
          <Scan size={56} strokeWidth={1.4} color="#0A0A0A" aria-hidden />
        </div>
        {/* Laser line */}
        <span
          aria-hidden
          className="absolute left-3 right-3 h-[2px] rounded-full"
          style={{
            top: `${laserY.toFixed(1)}%`,
            background: '#C6F24E',
            boxShadow: '0 0 12px 2px rgba(198,242,78,0.7)',
          }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sahne 3 — form (yıldızlar + textarea preview)
// ─────────────────────────────────────────────────────────────

function SceneForm({
  progress,
  label,
  example,
}: {
  progress: number;
  label: string;
  example: string;
}) {
  // 5 yıldız sırayla doluyor (yıldız tıklamasından önce)
  const filled = Math.floor(clamp(progress * 1.4, 0, 1) * 5);
  const textProgress = animate({ from: 0, to: 1, start: 0.5, end: 0.95 })(progress);
  const textChars = Math.floor(textProgress * example.length);
  // Bubble entry — yıldızlar dolduktan sonra fade-up
  const bubbleProgress = animate({ from: 0, to: 1, start: 0.45, end: 0.7, ease: Easing.easeOutCubic })(progress);
  const bubbleOpacity = bubbleProgress;
  const bubbleLift = (1 - bubbleProgress) * 12;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-6">
      <span className="pulse-eyebrow" style={{ color: '#737373' }}>
        {label}
      </span>

      {/* Stars — sırayla doluyor (lime fill + lime-deep stroke) */}
      <div className="mt-6 flex items-center justify-center gap-1.5">
        {Array.from({ length: 5 }, (_, i) => (
          <Star
            key={i}
            size={32}
            strokeWidth={1.5}
            fill={i < filled ? '#C6F24E' : 'none'}
            color={i < filled ? '#A8D62E' : '#D4D4D4'}
            aria-hidden
            className="transition-transform"
            style={{
              transform: i < filled ? 'scale(1.05)' : 'scale(1)',
            }}
          />
        ))}
      </div>

      {/* Stage 45 §38.126 — yorum metni LIME chat bubble.
          Kullanıcı talebi: "yorum yazısını lime renginde yap".
          Pulse §11 + WCAG AAA: graphite bubble (#0A0A0A) + lime
          ink (#C6F24E) → 13.4:1 contrast (AAA pass).
          - Bubble: graphite + 18px radius + lime corner accent +
            lime quote mark
          - Typing cursor lime + bzCaretBlink keyframe
          - Fade-up entry (bubbleLift translateY) */}
      <div
        className="relative mt-5 w-full max-w-[300px] rounded-2xl bg-[#0A0A0A] p-4 shadow-[0_18px_40px_-15px_rgba(10,10,10,0.45),0_0_0_1px_rgba(198,242,78,0.12)]"
        style={{
          opacity: bubbleOpacity,
          transform: `translateY(${bubbleLift.toFixed(1)}px)`,
        }}
      >
        {/* Lime accent corner glow */}
        <span
          aria-hidden
          className="pointer-events-none absolute -right-[60px] -top-[60px] h-[120px] w-[120px] rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(198,242,78,0.32), transparent 65%)',
            opacity: bubbleOpacity * 0.7,
          }}
        />

        {/* Quote mark — sol-üst köşede italik lime */}
        <span
          aria-hidden
          className="absolute -left-1 -top-3 text-[36px] leading-none text-[#C6F24E]/40"
          style={{
            fontFamily: 'var(--font-heading)',
            fontStyle: 'italic',
            fontWeight: 500,
          }}
        >
          “
        </span>

        {/* Yorum metni — LIME ink (kullanıcı talebi) */}
        <p
          className="relative text-[14px] leading-[1.55]"
          style={{
            fontFamily: 'var(--font-heading)',
            fontStyle: 'italic',
            fontWeight: 500,
            color: '#C6F24E',
            letterSpacing: '-0.005em',
            margin: 0,
            minHeight: '44px',
          }}
        >
          {example.slice(0, textChars)}
          {textChars < example.length && (
            <span
              aria-hidden
              className="ml-0.5 inline-block h-[14px] w-[2px] -translate-y-[1px] align-middle"
              style={{ background: '#C6F24E', animation: 'bzCaretBlink 0.9s steps(2) infinite' }}
            />
          )}
        </p>

        {/* Footer — mini star confirmation + author attribution */}
        <div className="relative mt-3 flex items-center justify-between border-t border-white/[0.06] pt-2.5">
          <span className="inline-flex items-center gap-0.5">
            {Array.from({ length: 5 }, (_, i) => (
              <Star
                key={i}
                size={11}
                fill={i < filled ? '#C6F24E' : 'none'}
                color={i < filled ? '#C6F24E' : '#3a3a3a'}
                strokeWidth={2}
                aria-hidden
              />
            ))}
          </span>
          <span className="font-mono text-[9.5px] uppercase tracking-[0.18em] text-white/45">
            {filled > 0 ? `${filled}.0/5` : ''}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sahne 4 — AI yanıt (graphite chip + lime sparkle)
// ─────────────────────────────────────────────────────────────

function SceneAiReply({
  progress,
  label,
  badge,
  tone,
  preview,
}: {
  progress: number;
  label: string;
  badge: string;
  tone: string;
  preview: string;
}) {
  const lift = animate({ from: 16, to: 0, ease: Easing.easeOutCubic, end: 0.4 })(progress);
  const opacity = animate({ from: 0, to: 1, end: 0.4 })(progress);
  const sparkleRot = interpolate([0, 1], [0, 12])(progress);

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white px-6">
      <span className="pulse-eyebrow" style={{ color: '#737373' }}>
        {label}
      </span>
      <div
        className="relative mt-5 w-full max-w-[300px] rounded-2xl bg-[#0A0A0A] p-4 text-white shadow-[0_24px_60px_-25px_rgba(10,10,10,0.45)]"
        style={{
          opacity,
          transform: `translateY(${lift.toFixed(1)}px)`,
        }}
      >
        <div className="flex items-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1"
            style={{ background: 'rgba(198,242,78,0.15)' }}
          >
            <Sparkles
              size={12}
              color="#C6F24E"
              aria-hidden
              style={{ transform: `rotate(${sparkleRot.toFixed(1)}deg)` }}
            />
            <span
              className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em]"
              style={{ color: '#C6F24E' }}
            >
              {badge}
            </span>
          </span>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-white/50">
            {tone}
          </span>
        </div>
        <p className="mt-3 text-[13px] leading-[1.55] text-white/85">{preview}</p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Sahne 5 — 4.8★ pop
// ─────────────────────────────────────────────────────────────

function SceneStarPop({
  progress,
  label,
  ratingLabel,
  deltaLabel,
}: {
  progress: number;
  label: string;
  ratingLabel: string;
  deltaLabel: string;
}) {
  const scale = animate({ from: 0.6, to: 1, ease: Easing.easeOutBack, end: 0.5 })(progress);
  const opacity = animate({ from: 0, to: 1, end: 0.3 })(progress);
  const burstOpacity = animate({ from: 0, to: 1, start: 0.2, end: 0.5 })(progress);

  // Stage 45 §38.126 — sparkle particle burst (deterministik 8 dot,
  // Math.random YOK). Bigger burst opacity + sparkle dots (8'er rotate).
  const sparkles = Array.from({ length: 8 }, (_, i) => {
    const angle = (i / 8) * Math.PI * 2;
    // Particles fly out from center as scene progresses
    const radius = animate({ from: 0, to: 90, ease: Easing.easeOutCubic, end: 0.7 })(progress);
    const fade = animate({ from: 1, to: 0, start: 0.5, end: 1, ease: Easing.easeInQuad })(progress);
    return {
      i,
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
      opacity: burstOpacity * fade,
    };
  });

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white">
      <span className="pulse-eyebrow" style={{ color: '#737373' }}>
        {label}
      </span>
      <div
        className="relative mt-5 flex flex-col items-center"
        style={{ opacity, transform: `scale(${scale.toFixed(3)})` }}
      >
        {/* Sparkle burst halo */}
        <span
          aria-hidden
          className="pointer-events-none absolute -inset-12 rounded-full"
          style={{
            background:
              'radial-gradient(circle, rgba(198,242,78,0.42), transparent 65%)',
            opacity: burstOpacity,
          }}
        />

        {/* Stage 45 §38.126 — sparkle particle burst (8 deterministik dot) */}
        <div aria-hidden className="pointer-events-none absolute left-1/2 top-1/2 h-0 w-0">
          {sparkles.map((s) => (
            <span
              key={s.i}
              className="absolute h-1.5 w-1.5 rounded-full"
              style={{
                background: '#C6F24E',
                boxShadow: '0 0 8px rgba(198,242,78,0.85)',
                transform: `translate(${s.x.toFixed(1)}px, ${s.y.toFixed(1)}px)`,
                opacity: s.opacity,
              }}
            />
          ))}
        </div>

        <div className="relative flex items-baseline gap-1">
          <Star size={42} fill="#C6F24E" color="#A8D62E" aria-hidden />
          <span
            className="bz-h-tight-2 text-[68px]"
            style={{ color: '#0A0A0A', lineHeight: 1, letterSpacing: '-0.04em' }}
          >
            4.8
          </span>
        </div>
        <span
          className="pulse-eyebrow mt-2"
          style={{ color: '#525252' }}
        >
          {ratingLabel}
        </span>
        <span
          className="mt-3 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-semibold tracking-wide"
          style={{ background: '#EAF9B8', color: '#0A0A0A' }}
        >
          +1.2 ★ <span className="text-[#525252]">·</span> {deltaLabel}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Live caption strip (under primary CTA)
// ─────────────────────────────────────────────────────────────

interface SceneCaptions {
  qrPulse: string;
  scan: string;
  form: string;
  aiReply: string;
  starPop: string;
}

function SceneCaptionStrip({ captions }: { captions: SceneCaptions }) {
  return (
    <>
      <Sprite
        start={CINEMATIC_SCENES.qrPulse.start}
        end={CINEMATIC_SCENES.qrPulse.end}
      >
        <CaptionText text={captions.qrPulse} />
      </Sprite>
      <Sprite
        start={CINEMATIC_SCENES.scan.start}
        end={CINEMATIC_SCENES.scan.end}
      >
        <CaptionText text={captions.scan} />
      </Sprite>
      <Sprite
        start={CINEMATIC_SCENES.form.start}
        end={CINEMATIC_SCENES.form.end}
      >
        <CaptionText text={captions.form} />
      </Sprite>
      <Sprite
        start={CINEMATIC_SCENES.aiReply.start}
        end={CINEMATIC_SCENES.aiReply.end}
      >
        <CaptionText text={captions.aiReply} />
      </Sprite>
      <Sprite
        start={CINEMATIC_SCENES.starPop.start}
        end={CINEMATIC_SCENES.starPop.end}
      >
        <CaptionText text={captions.starPop} />
      </Sprite>
    </>
  );
}

function CaptionText({ text }: { text: string }) {
  return (
    <span
      className="font-mono text-[11px] font-semibold uppercase tracking-[0.18em]"
      style={{ color: '#525252' }}
    >
      {text}
    </span>
  );
}
