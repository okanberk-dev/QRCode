import {
  QrCode,
  Star,
  TrendingUp,
  MessageSquare,
  BarChart3,
  Users,
  CheckCircle2,
  Smartphone,
  Activity,
  Zap,
} from 'lucide-react';
import type { Locale } from '@/lib/translations';

interface ProductShowcaseProps {
  locale: Locale;
}

/**
 * Desktop-only visual showcase of Buaze's interfaces.
 *
 * Renders as three designed-in-code "screenshots" — a QR builder, a live
 * analytics dashboard and a feedback form mock — styled in the site's
 * neobrutalist aesthetic. Hidden on mobile so the existing small-screen
 * flow is untouched.
 */
export default function ProductShowcase({ locale }: ProductShowcaseProps) {
  const isTr = locale === 'tr';

  return (
    <section
      aria-labelledby="showcase-heading"
      className="hidden lg:block py-24 px-8 bg-[#F8F6F1] border-y border-[#E8ECF2]"
    >
      <div className="max-w-[1240px] mx-auto">
        {/* Header */}
        <div className="text-center mb-16 max-w-[720px] mx-auto">
          <p className="text-[12px] font-black uppercase tracking-[0.18em] text-[#F4B400] mb-4">
            {isTr ? 'ÜRÜN TURU' : 'PRODUCT TOUR'}
          </p>
          <h2
            id="showcase-heading"
            className="text-[44px] font-extrabold text-[#1A2332] tracking-[-0.03em] leading-[1.1] text-balance"
          >
            {isTr
              ? 'Platformu yakından inceleyin'
              : 'See the platform up close'}
          </h2>
          <p className="text-[17px] text-[#2A3444] font-medium mt-5 leading-relaxed text-pretty">
            {isTr
              ? 'QR oluşturmaktan analitik panele, gerçek arayüzleri tek bakışta görün.'
              : 'From QR generation to the live analytics dashboard — see every surface at a glance.'}
          </p>
        </div>

        {/* 3-column screenshot grid */}
        <div className="grid grid-cols-12 gap-8">
          {/* ── 1. QR BUILDER SCREENSHOT (wide, left) ── */}
          <figure className="col-span-7 group">
            <div className="bg-white rounded-2xl border border-[#1A2332] shadow-md overflow-hidden transition-transform duration-300 group-hover:-translate-y-1">
              {/* Browser chrome */}
              <div className="flex items-center justify-between px-5 py-3 border-b-[2px] border-[#1A2332] bg-[#F8F6F1]">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#F4B400] border border-[#1A2332]" />
                  <span className="w-3 h-3 rounded-full bg-[#F4B400] border border-[#1A2332]" />
                  <span className="w-3 h-3 rounded-full bg-[#16A34A] border border-[#1A2332]" />
                </div>
                <div className="px-3 py-1 bg-white rounded-md border border-[#E8ECF2] text-[11px] font-bold text-[#2A3444] tracking-wide">
                  buaze.com/dashboard/qr-builder
                </div>
                <div className="w-12" />
              </div>

              {/* App chrome */}
              <div className="p-6 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#F4B400] mb-1">
                      {isTr ? 'QR OLUŞTURUCU' : 'QR BUILDER'}
                    </p>
                    <h3 className="text-[18px] font-extrabold text-[#1A2332]">
                      {isTr ? 'Yeni QR Kod' : 'New QR Code'}
                    </h3>
                  </div>
                  <div className="inline-flex items-center gap-1.5 bg-[#16A34A]/10 text-[#16A34A] px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border border-[#16A34A]/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A] animate-pulse" />
                    {isTr ? 'CANLI' : 'LIVE'}
                  </div>
                </div>

                <div className="grid grid-cols-5 gap-5">
                  {/* QR preview (left big) */}
                  <div className="col-span-2 bg-[#1A2332] rounded-xl p-5 flex flex-col items-center justify-center border border-[#1A2332] shadow-md">
                    <div className="bg-white p-3 rounded-lg border border-[#1A2332]">
                      <QrCode size={96} className="text-[#1A2332]" strokeWidth={1.5} />
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#F4B400] mt-3">
                      Gourmet Eats
                    </p>
                    <p className="text-[9px] text-white/60 mt-0.5">
                      #QR-2847
                    </p>
                  </div>

                  {/* Options form (right) */}
                  <div className="col-span-3 space-y-3">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#2A3444] mb-1 block">
                        {isTr ? 'Şablon' : 'Template'}
                      </label>
                      <div className="flex gap-2">
                        <div className="flex-1 h-10 rounded-md border border-[#1A2332] bg-[#F4B400] shadow-md flex items-center justify-center text-[11px] font-black">
                          {isTr ? 'Klasik' : 'Classic'}
                        </div>
                        <div className="flex-1 h-10 rounded-md border border-[#E8ECF2] bg-white flex items-center justify-center text-[11px] font-bold text-[#2A3444]">
                          {isTr ? 'Modern' : 'Modern'}
                        </div>
                        <div className="flex-1 h-10 rounded-md border border-[#E8ECF2] bg-white flex items-center justify-center text-[11px] font-bold text-[#2A3444]">
                          {isTr ? 'Premium' : 'Premium'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#2A3444] mb-1 block">
                        {isTr ? 'Renk' : 'Color'}
                      </label>
                      <div className="flex gap-2">
                        {['#1A2332', '#F4B400', '#F4B400', '#16A34A', '#2563EB'].map(
                          (c) => (
                            <div
                              key={c}
                              className="w-8 h-8 rounded-full border border-[#1A2332] shadow-md"
                              style={{ backgroundColor: c }}
                            />
                          ),
                        )}
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-wider text-[#2A3444] mb-1 block">
                        {isTr ? 'Hedef Konum' : 'Target Location'}
                      </label>
                      <div className="h-10 rounded-md border border-[#E8ECF2] bg-[#F8F6F1] px-3 flex items-center text-[12px] font-semibold text-[#1A2332]">
                        Ataşehir / İstanbul
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-hidden="true"
                      tabIndex={-1}
                      className="w-full h-11 rounded-md bg-[#1A2332] text-[#F4B400] text-[12px] font-black uppercase tracking-wider border border-[#1A2332] shadow-md"
                    >
                      {isTr ? 'QR Kodu Oluştur' : 'Generate QR'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="mt-5 flex items-start gap-3">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#F4B400] border border-[#1A2332] shadow-md flex items-center justify-center">
                <QrCode size={18} className="text-[#1A2332]" />
              </div>
              <div>
                <p className="text-[15px] font-extrabold text-[#1A2332]">
                  {isTr ? 'QR Kod Oluşturucu' : 'QR Code Builder'}
                </p>
                <p className="text-[13px] text-[#2A3444] font-medium leading-relaxed">
                  {isTr
                    ? 'Şablon, renk ve konum seçin — dakikalar içinde dağıtıma hazır QR kodunuz olsun.'
                    : 'Pick a template, color and location — get a print-ready QR in minutes.'}
                </p>
              </div>
            </figcaption>
          </figure>

          {/* ── 2. FEEDBACK MOBILE MOCK (narrow, right) ── */}
          <figure className="col-span-5 group">
            <div className="relative bg-gradient-to-br from-[#1A2332] to-[#3d3a36] rounded-2xl border border-[#1A2332] shadow-md overflow-hidden p-10 flex items-center justify-center min-h-[360px] transition-transform duration-300 group-hover:-translate-y-1">
              {/* dot pattern bg */}
              <div
                className="absolute inset-0 opacity-[0.08] pointer-events-none"
                style={{
                  backgroundImage:
                    'radial-gradient(circle, #F4B400 1px, transparent 1px)',
                  backgroundSize: '20px 20px',
                }}
              />

              {/* Phone frame */}
              <div className="relative w-[220px] bg-white rounded-[28px] border border-[#1A2332] shadow-md p-4 rotate-[-3deg]">
                {/* notch */}
                <div className="absolute top-1.5 left-1/2 -translate-x-1/2 w-16 h-4 bg-[#1A2332] rounded-full" />
                <div className="pt-5 space-y-3">
                  <p className="text-center text-[11px] font-black uppercase tracking-widest text-[#2A3444]">
                    Gourmet Eats
                  </p>
                  <p className="text-center text-[13px] font-extrabold text-[#1A2332] leading-tight">
                    {isTr
                      ? 'Deneyiminiz nasıldı?'
                      : 'How was your experience?'}
                  </p>
                  <div className="flex justify-center gap-1 py-2">
                    {[1, 2, 3, 4, 5].map((i) => (
                      <Star
                        key={i}
                        size={18}
                        fill="#F4B400"
                        strokeWidth={0}
                      />
                    ))}
                  </div>
                  <div className="bg-[#F8F6F1] border-[1.5px] border-[#1A2332] rounded-lg p-2.5 text-[10px] text-[#2A3444] font-medium leading-relaxed">
                    {isTr
                      ? 'Harikaydı! Servis çok hızlıydı ve burger mükemmeldi...'
                      : 'Amazing! Service was fast and the burger was perfect...'}
                  </div>
                  <div className="h-9 rounded-lg bg-[#F4B400] border border-[#1A2332] shadow-md flex items-center justify-center text-[11px] font-black uppercase tracking-wider">
                    {isTr ? 'Gönder' : 'Submit'}
                  </div>
                </div>
              </div>

              {/* Floating scan chip */}
              <div className="absolute top-5 right-5 bg-[#F4B400] text-[#1A2332] px-3 py-1.5 rounded-full border border-[#1A2332] shadow-md flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                <Smartphone size={12} />
                {isTr ? 'Tarandı' : 'Scanned'}
              </div>

              {/* Floating review count chip */}
              <div className="absolute bottom-5 left-5 bg-white text-[#1A2332] px-3 py-1.5 rounded-full border border-[#1A2332] shadow-md flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider">
                <CheckCircle2 size={12} className="text-[#16A34A]" />
                +142 {isTr ? 'bu hafta' : 'this week'}
              </div>
            </div>
            <figcaption className="mt-5 flex items-start gap-3">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-white border border-[#1A2332] shadow-md flex items-center justify-center">
                <MessageSquare size={18} className="text-[#1A2332]" />
              </div>
              <div>
                <p className="text-[15px] font-extrabold text-[#1A2332]">
                  {isTr
                    ? 'Mobil Geri Bildirim Formu'
                    : 'Mobile Feedback Form'}
                </p>
                <p className="text-[13px] text-[#2A3444] font-medium leading-relaxed">
                  {isTr
                    ? 'Müşteriler uygulama indirmeden saniyeler içinde puanlama yapar.'
                    : 'Customers rate in seconds — no app install required.'}
                </p>
              </div>
            </figcaption>
          </figure>

          {/* ── 3. ANALYTICS DASHBOARD (full width below) ── */}
          <figure className="col-span-12 group mt-6">
            <div className="bg-white rounded-2xl border border-[#1A2332] shadow-md overflow-hidden transition-transform duration-300 group-hover:-translate-y-1">
              {/* Browser chrome */}
              <div className="flex items-center justify-between px-5 py-3 border-b-[2px] border-[#1A2332] bg-[#F8F6F1]">
                <div className="flex gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-[#F4B400] border border-[#1A2332]" />
                  <span className="w-3 h-3 rounded-full bg-[#F4B400] border border-[#1A2332]" />
                  <span className="w-3 h-3 rounded-full bg-[#16A34A] border border-[#1A2332]" />
                </div>
                <div className="px-3 py-1 bg-white rounded-md border border-[#E8ECF2] text-[11px] font-bold text-[#2A3444] tracking-wide">
                  buaze.com/dashboard
                </div>
                <div className="w-12" />
              </div>

              <div className="p-8">
                {/* Top strip with metrics */}
                <div className="grid grid-cols-4 gap-5 mb-8">
                  {[
                    {
                      label: isTr ? 'Toplam Yorum' : 'Total Reviews',
                      value: '2,847',
                      trend: '+23%',
                      Icon: MessageSquare,
                      bg: 'bg-[#F4B400]',
                    },
                    {
                      label: isTr ? 'Ortalama Puan' : 'Avg. Rating',
                      value: '4.9',
                      trend: '+0.3',
                      Icon: Star,
                      bg: 'bg-white',
                    },
                    {
                      label: isTr ? 'QR Tarama' : 'QR Scans',
                      value: '18,420',
                      trend: '+41%',
                      Icon: QrCode,
                      bg: 'bg-white',
                    },
                    {
                      label: isTr ? 'Aktif Konum' : 'Active Locations',
                      value: '12',
                      trend: '+2',
                      Icon: Users,
                      bg: 'bg-white',
                    },
                  ].map(({ label, value, trend, Icon, bg }) => (
                    <div
                      key={label}
                      className={`${bg} p-4 rounded-xl border border-[#1A2332] shadow-md`}
                    >
                      <div className="flex items-center justify-between mb-3">
                        <Icon size={16} className="text-[#1A2332]" />
                        <span className="text-[10px] font-black text-[#16A34A] bg-[#16A34A]/10 px-1.5 py-0.5 rounded">
                          {trend}
                        </span>
                      </div>
                      <p className="text-[22px] font-extrabold text-[#1A2332] tracking-tight leading-none">
                        {value}
                      </p>
                      <p className="text-[10px] font-bold text-[#2A3444] uppercase tracking-wider mt-1">
                        {label}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-3 gap-6">
                  {/* Chart area */}
                  <div className="col-span-2 bg-[#F8F6F1] rounded-xl border border-[#1A2332] p-5">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <h4 className="text-[14px] font-extrabold text-[#1A2332]">
                          {isTr ? 'Yorum Akışı' : 'Review Volume'}
                        </h4>
                        <p className="text-[11px] text-[#2A3444] font-medium">
                          {isTr ? 'Son 14 gün' : 'Last 14 days'}
                        </p>
                      </div>
                      <div className="flex gap-3 text-[10px] font-bold text-[#2A3444]">
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-[#F4B400] rounded-sm border border-[#1A2332]" />
                          {isTr ? 'Pozitif' : 'Positive'}
                        </span>
                        <span className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-[#1A2332] rounded-sm" />
                          {isTr ? 'Nötr' : 'Neutral'}
                        </span>
                      </div>
                    </div>
                    {/* Faux bar chart */}
                    <div className="flex items-end justify-between gap-2 h-[140px]">
                      {[65, 48, 72, 58, 82, 70, 95, 78, 88, 92, 76, 98, 85, 90].map(
                        (h, i) => (
                          <div
                            key={i}
                            className="flex-1 flex flex-col gap-0.5 items-stretch justify-end"
                          >
                            <div
                              className="bg-[#F4B400] border-[1.5px] border-[#1A2332] rounded-t"
                              style={{ height: `${h}%` }}
                            />
                            <div
                              className="bg-[#1A2332] rounded-b"
                              style={{ height: `${Math.max(8, 100 - h - 20)}%` }}
                            />
                          </div>
                        ),
                      )}
                    </div>
                    <div className="flex justify-between mt-2 text-[9px] font-bold text-[#6B7280] uppercase tracking-wider">
                      <span>{isTr ? 'Pzt' : 'Mon'}</span>
                      <span>{isTr ? 'Çar' : 'Wed'}</span>
                      <span>{isTr ? 'Cum' : 'Fri'}</span>
                      <span>{isTr ? 'Paz' : 'Sun'}</span>
                    </div>
                  </div>

                  {/* Recent feed */}
                  <div className="col-span-1 bg-[#F8F6F1] rounded-xl border border-[#1A2332] p-5">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-[14px] font-extrabold text-[#1A2332]">
                        {isTr ? 'Son Yorumlar' : 'Recent Reviews'}
                      </h4>
                      <Activity size={14} className="text-[#F4B400]" />
                    </div>
                    <ul className="space-y-3">
                      {[
                        {
                          name: 'Ayşe K.',
                          stars: 5,
                          text: isTr ? 'Mükemmel hizmet!' : 'Excellent service!',
                        },
                        {
                          name: 'John D.',
                          stars: 5,
                          text: isTr ? 'Kesinlikle tavsiye ederim' : 'Highly recommend',
                        },
                        {
                          name: 'Mehmet Y.',
                          stars: 4,
                          text: isTr ? 'Harika deneyim' : 'Great experience',
                        },
                      ].map((r) => (
                        <li
                          key={r.name}
                          className="bg-white rounded-lg border-[1.5px] border-[#1A2332] p-2.5"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[11px] font-extrabold text-[#1A2332]">
                              {r.name}
                            </span>
                            <div className="flex gap-0.5">
                              {Array.from({ length: r.stars }).map((_, i) => (
                                <Star
                                  key={i}
                                  size={10}
                                  fill="#F4B400"
                                  strokeWidth={0}
                                />
                              ))}
                            </div>
                          </div>
                          <p className="text-[10px] text-[#2A3444] font-medium leading-tight">
                            {r.text}
                          </p>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            </div>
            <figcaption className="mt-5 flex items-start gap-3 max-w-[620px]">
              <div className="w-10 h-10 flex-shrink-0 rounded-lg bg-[#1A2332] border border-[#1A2332] shadow-md flex items-center justify-center">
                <BarChart3 size={18} className="text-[#F4B400]" />
              </div>
              <div>
                <p className="text-[15px] font-extrabold text-[#1A2332]">
                  {isTr
                    ? 'Gerçek Zamanlı Analitik Paneli'
                    : 'Real-Time Analytics Dashboard'}
                </p>
                <p className="text-[13px] text-[#2A3444] font-medium leading-relaxed">
                  {isTr
                    ? 'Her şubeniz için yorum hacmi, puan trendleri ve QR etkileşimlerini tek ekrandan izleyin.'
                    : 'Track review volume, rating trends and QR engagement across every location in a single view.'}
                </p>
              </div>
            </figcaption>
          </figure>
        </div>

        {/* Feature highlights strip */}
        <div className="mt-16 grid grid-cols-4 gap-4">
          {[
            {
              Icon: Zap,
              label: isTr ? 'Anında Kurulum' : 'Instant Setup',
            },
            {
              Icon: TrendingUp,
              label: isTr ? 'Büyüme Odaklı Raporlar' : 'Growth-Driven Reports',
            },
            {
              Icon: Users,
              label: isTr ? 'Çok Kullanıcılı Takım' : 'Multi-User Teams',
            },
            {
              Icon: Activity,
              label: isTr ? 'Canlı İzleme' : 'Live Monitoring',
            },
          ].map(({ Icon, label }) => (
            <div
              key={label}
              className="bg-white border border-[#1A2332] rounded-xl p-4 flex items-center gap-3 shadow-md"
            >
              <div className="w-9 h-9 flex-shrink-0 rounded-lg bg-[#F4B400] border border-[#1A2332] flex items-center justify-center">
                <Icon size={16} className="text-[#1A2332]" />
              </div>
              <p className="text-[13px] font-extrabold text-[#1A2332]">
                {label}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
