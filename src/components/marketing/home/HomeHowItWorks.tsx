import { ArrowUpRight, Mail, QrCode, Star } from 'lucide-react';
import SectionHeader from './SectionHeader';

/**
 * "Nasıl çalışır" — the only how-it-works block on the homepage (the hero's
 * secondary CTA scrolls here). Step 2 carries the canonical description of
 * the review flow (spec D1). Each step has a small HTML mockup labelled as a
 * sample screen, with generic data only.
 */

const COPY = {
  tr: {
    eyebrow: 'Nasıl çalışır',
    title: 'QR kodla yorum toplama üç adımda işler',
    lead: 'Teknik bilgi gerekmez: QR kodunuzu panelden oluşturup yerleştirmeniz yeterli.',
    sample: 'Örnek ekran',
    steps: [
      {
        title: 'QR kodunuzu yerleştirin',
        body: 'Panelden işletmeniz için QR kod oluşturun; isterseniz masa veya oda etiketi ekleyin. QR kodu PNG olarak indirin ya da PDF olarak yazdırın; masaya, adisyona, kapıya veya pakete koyun.',
      },
      {
        title: 'Müşteri puan verir',
        body: 'Müşteri QR kodu okutur ve puan verir. Belirlediğiniz eşik ve üzerindeki puanlarda (varsayılan 5 yıldız) seçtiğiniz platformun yorum sayfası açılır. Eşiğin altındaki puanlarda müşteri önce size özel geri bildirim yazabilir; herkese açık yorum bağlantısı aynı ekranda görünür.',
      },
      {
        title: 'Geri bildirimi yanıtlayın',
        body: 'Özel geri bildirimler panelinizde toplanır. Müşteri e-posta adresini bıraktıysa yanıtınızı e-postayla gönderirsiniz; bırakmadıysa yanıt panelde kayıt olarak kalır.',
      },
    ],
    mock: {
      table: 'Masa 12',
      download: 'PNG indir',
      print: 'PDF yazdır',
      high: 'Google yorum sayfası açılır',
      low: 'Özel form ve herkese açık bağlantı',
      customer: 'Müşteri',
      feedback: 'Servis biraz yavaştı.',
      reply: 'Yanıtla',
      viaEmail: 'E-postayla',
    },
  },
  en: {
    eyebrow: 'How it works',
    title: 'Collecting reviews with a QR code takes three steps',
    lead: 'No technical skills needed: create your QR code in the panel and put it where customers will see it.',
    sample: 'Sample screen',
    steps: [
      {
        title: 'Place your QR code',
        body: 'Create a QR code for your business in the panel, with an optional table or room label. Download it as PNG or print it to PDF, then put it on tables, bills, doors or packages.',
      },
      {
        title: 'The customer gives a rating',
        body: "The customer scans the QR code and gives a rating. At or above the threshold you set (5 stars by default), your chosen platform's review page opens. Below it, the customer can first send you private feedback; the public review link is shown on the same screen.",
      },
      {
        title: 'Reply to the feedback',
        body: 'Private feedback arrives in your panel. If the customer left an e-mail address, you reply by e-mail; if not, your reply stays on record in the panel.',
      },
    ],
    mock: {
      table: 'Table 12',
      download: 'Download PNG',
      print: 'Print PDF',
      high: 'Your Google review page opens',
      low: 'Private form plus the public link',
      customer: 'Customer',
      feedback: 'Service was a bit slow.',
      reply: 'Reply',
      viaEmail: 'By e-mail',
    },
  },
} as const;

type Mock = (typeof COPY)[keyof typeof COPY]['mock'];

function MockFrame({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-[200px] flex-col rounded-[16px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
      <p className="pulse-eyebrow text-[#737373]">{label}</p>
      <div className="flex flex-1 flex-col justify-center pt-3">{children}</div>
    </div>
  );
}

function Stars({ filled, size = 12 }: { filled: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-hidden="true">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          strokeWidth={1.8}
          fill={i < filled ? '#0A0A0A' : 'none'}
          color={i < filled ? '#0A0A0A' : '#A3A3A3'}
        />
      ))}
    </span>
  );
}

function QrMock({ mock }: { mock: Mock }) {
  return (
    <div className="flex items-center gap-4">
      <div className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[14px] border border-[#EDEDED] bg-white">
        <QrCode size={44} strokeWidth={1.5} color="#0A0A0A" aria-hidden="true" />
      </div>
      <div className="min-w-0 space-y-2">
        <span className="inline-flex rounded-full bg-[#EAF9B8] px-2.5 py-0.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-[#3F5408]">
          {mock.table}
        </span>
        <div className="flex flex-wrap gap-1.5 text-[12px] font-medium text-[#0A0A0A]">
          <span className="rounded-full border border-[#D4D4D4] bg-white px-2.5 py-1">{mock.download}</span>
          <span className="rounded-full border border-[#D4D4D4] bg-white px-2.5 py-1">{mock.print}</span>
        </div>
      </div>
    </div>
  );
}

function FlowMock({ mock }: { mock: Mock }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3 rounded-[12px] border border-[#EDEDED] bg-white px-3 py-2.5">
        <Stars filled={5} />
        <span className="min-w-0 flex-1 text-[13px] text-[#0A0A0A]">{mock.high}</span>
        <ArrowUpRight size={14} className="shrink-0 text-[#525252]" aria-hidden="true" />
      </div>
      <div className="flex items-center gap-3 rounded-[12px] border border-[#EDEDED] bg-white px-3 py-2.5">
        <Stars filled={3} />
        <span className="min-w-0 flex-1 text-[13px] text-[#0A0A0A]">{mock.low}</span>
      </div>
    </div>
  );
}

function InboxMock({ mock }: { mock: Mock }) {
  return (
    <div className="rounded-[12px] border border-[#EDEDED] bg-white p-3">
      <div className="flex items-center gap-2.5">
        <span
          aria-hidden="true"
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#0A0A0A] text-[12px] font-semibold text-[#C6F24E]"
        >
          {mock.customer.charAt(0)}
        </span>
        <div className="min-w-0 flex-1">
          <p className="flex items-center gap-2 text-[13px] font-medium text-[#0A0A0A]">
            {mock.customer}
            <Stars filled={3} size={11} />
          </p>
          <p className="truncate text-[13px] text-[#525252]">{mock.feedback}</p>
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-[#EDEDED] pt-3">
        <span className="inline-flex items-center gap-1.5 text-[12px] text-[#525252]">
          <Mail size={13} aria-hidden="true" />
          {mock.viaEmail}
        </span>
        <span className="rounded-full bg-[#0A0A0A] px-3 py-1 text-[12px] font-semibold text-white">{mock.reply}</span>
      </div>
    </div>
  );
}

export default function HomeHowItWorks({ locale }: { locale: 'tr' | 'en' }) {
  const copy = COPY[locale];
  const mocks = [
    <QrMock key="qr" mock={copy.mock} />,
    <FlowMock key="flow" mock={copy.mock} />,
    <InboxMock key="inbox" mock={copy.mock} />,
  ];

  return (
    <section
      id="how-it-works"
      aria-labelledby="how-it-works-title"
      className="scroll-mt-24 bg-white py-[60px] sm:py-24"
    >
      <div className="mx-auto w-full max-w-[1200px] px-5 sm:px-10">
        <SectionHeader id="how-it-works-title" eyebrow={copy.eyebrow} title={copy.title} lead={copy.lead} />

        {/* Tablets and small laptops: mockup beside the text inside each card;
            wide screens: three columns with the mockup on top. */}
        <ol className="mt-12 grid grid-cols-1 gap-4 sm:mt-14 sm:gap-6 xl:grid-cols-3">
          {copy.steps.map((step, i) => (
            <li
              key={step.title}
              className="flex flex-col rounded-[20px] border border-[#EDEDED] bg-white p-6 sm:p-8 md:grid md:grid-cols-[minmax(0,260px)_minmax(0,1fr)] md:items-center md:gap-x-8 xl:flex xl:flex-col xl:items-stretch"
            >
              <MockFrame label={copy.sample}>{mocks[i]}</MockFrame>
              <div className="mt-7 md:mt-0 xl:mt-7">
                <span className="block font-mono text-[12px] font-semibold tracking-[0.12em] text-[#737373]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <h3 className="mt-2 text-[20px] leading-[1.2] text-[#0A0A0A] sm:text-[22px]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-[1.65] text-[#525252]">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
