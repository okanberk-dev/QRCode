import { GraduationCap, Star, TrendingUp, QrCode, BookOpen, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusSchool } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

// Stage 83 §38.163 — ISR inherits `revalidate = 3600` (1h) from
// `[locale]/layout.tsx`. CLAUDE.md §38.163 — marketing pages now ship
// from the Vercel CDN edge for anonymous visitors.

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Okul & Eğitim Kurumu İtibar Yönetimi'
    : 'School & Educational Institution Reputation Management';
  const description = locale === 'tr'
    ? 'Veli ve öğrenci memnuniyetini ölçün. Okulunuzun dijital itibarını güçlendirin ve yeni öğrenci kaydını artırın.'
    : 'Measure parent and student satisfaction. Strengthen your school\'s digital reputation and increase new student enrollment.';
  return {
    title,
    description,
    keywords: locale === 'tr'
      ? ['okul itibar yönetimi', 'eğitim kurumu google yorumları', 'veli memnuniyeti', 'öğrenci feedback sistemi']
      : ['school reputation management', 'educational institution google reviews', 'parent satisfaction', 'student feedback'],
    alternates: {
      canonical: `https://www.buaze.com/${locale}/solutions/schools`,
      languages: { tr: 'https://www.buaze.com/tr/solutions/schools', en: 'https://www.buaze.com/en/solutions/schools', 'x-default': 'https://www.buaze.com/tr/solutions/schools' },
    },
    openGraph: {
      type: 'website',
      siteName: 'Buaze',
      locale: locale === 'tr' ? 'tr_TR' : 'en_US',
      title,
      description,
      url: `https://www.buaze.com/${locale}/solutions/schools`,
      images: [{ url: locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png', width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [locale === 'tr' ? '/images/open-graph-tr.png' : '/images/open-graph-en.png'],
    },
  };
}

export default async function SchoolsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: 'Veli', label: isTr ? '& ÖĞRENCİ FEEDBACK' : '& STUDENT FEEDBACK', context: isTr ? 'Çift kanal' : 'Dual channel' },
    { num: 'KVKK', label: isTr ? 'UYUMLU AKIŞ' : 'COMPLIANT FLOW', context: isTr ? 'Açık rıza ile' : 'With explicit consent' },
    { num: isTr ? '14 gün' : '14 days', label: isTr ? 'ÜCRETSİZ DENEME' : 'FREE TRIAL', context: isTr ? 'Kredi kartı gerekmez' : 'No card required' },
    { num: 'AKADEMİK', label: isTr ? 'DÖNEM BAZLI' : 'TERM-BASED', context: isTr ? 'Dönemlik analiz' : 'Term analysis' },
  ];

  const steps = [
    {
      icon: <QrCode size={24} />,
      title: isTr ? 'Dönem Sonu Değerlendirme' : 'End-of-Term Evaluation',
      desc: isTr
        ? 'Her dönem sonunda velilere ve öğrencilere QR kodu gönderin. Akademik yılın başında ve sonunda karşılaştırmalı analiz yapın.'
        : 'Send QR codes to parents and students at the end of each term. Conduct comparative analysis at the beginning and end of the academic year.',
    },
    {
      icon: <BookOpen size={24} />,
      title: isTr ? 'Öğretmen & Bölüm Bazlı Analiz' : 'Teacher & Department Analysis',
      desc: isTr
        ? 'Her öğretmen ve bölüm için ayrı değerlendirme formları. Akademik kaliteyi sistematik olarak ölçün.'
        : 'Separate evaluation forms for each teacher and department. Systematically measure academic quality.',
    },
    {
      icon: <BarChart3 size={24} />,
      title: isTr ? 'Okul Kalitesini Artır' : 'Improve School Quality',
      desc: isTr
        ? 'Gerçek geri bildirimlerle eğitim kalitesini sürekli iyileştirin. Veliler katılım hissettikçe memnuniyet artar.'
        : 'Continuously improve education quality with real feedback. As parents feel involved, satisfaction increases.',
    },
  ];

  const benefits = [
    {
      title: isTr ? 'Veli Güveni' : 'Parent Trust',
      desc: isTr ? 'Okul tercihi yaparken veliler Google yorumlarına büyük önem verir. Yüksek değerlendirme kayıt oranını artırır.' : 'Parents place great importance on Google reviews when choosing a school. High ratings increase enrollment rate.',
      icon: <Star size={20} className="text-[#C6F24E]" />,
    },
    {
      title: isTr ? 'Öğretmen Gelişimi' : 'Teacher Development',
      desc: isTr ? 'Öğretmen bazlı geri bildirimler, güçlü ve gelişim gerektiren alanları net ortaya koyar.' : 'Teacher-based feedback clearly reveals strong points and areas needing development.',
      icon: <BookOpen size={20} className="text-[#0ea5e9]" />,
    },
    {
      title: isTr ? 'Kayıt Artışı' : 'Enrollment Growth',
      desc: isTr ? 'Velilerin Google\'da bıraktığı güncel yorumlar, okulu araştıran yeni ailelere gerçek bir fikir verir.' : 'Recent reviews from parents on Google give families researching your school a genuine picture.',
      icon: <TrendingUp size={20} className="text-[#0ea5e9]" />,
    },
    {
      title: isTr ? 'Dönemsel Karşılaştırma' : 'Term Comparison',
      desc: isTr ? 'Dönem başı/sonu karşılaştırması, eğitim kalitesindeki değişimi nesnel olarak gösterir.' : 'Beginning/end of term comparison objectively shows the change in educational quality.',
      icon: <BarChart3 size={20} className="text-[#0ea5e9]" />,
    },
  ];

  const faqs = [
    {
      q: isTr ? 'Öğrenci bilgileri gizli kalır mı?' : 'Does student information remain confidential?',
      a: isTr ? 'Evet. KVKK uyumlu, anonim sistem. Öğrenci adı ve kişisel bilgisi hiçbir şekilde geri bildirimle ilişkilendirilmez. Veli için de aynı gizlilik geçerlidir.' : 'Yes. KVKK compliant, anonymous system. Student name and personal information is never associated with feedback. The same privacy applies to parents.',
    },
    {
      q: isTr ? 'Her öğretmen için ayrı değerlendirme yapılabilir mi?' : 'Can evaluations be made for each teacher separately?',
      a: isTr ? 'Evet. Her öğretmen, bölüm veya ders için ayrı QR kodu ve değerlendirme formu oluşturabilirsiniz. Bu sayede akademik kadronuzun bireysel performansını nesnel olarak ölçebilirsiniz.' : 'Yes. You can create separate QR codes and evaluation forms for each teacher, department or course. This allows you to objectively measure the individual performance of your academic staff.',
    },
  ];

  return (
    <SolutionPageLayout
      locale={locale}
      t={t}
      industryKey="sch"
      icon={<GraduationCap size={14} />}
      industryBadge={isTr ? 'OKUL & EĞİTİM KURUMLARI İÇİN' : 'FOR SCHOOLS & EDUCATIONAL INSTITUTIONS'}
      h1Prefix={isTr ? 'Eğitimde' : 'Excellence in'}
      h1Suffix={isTr ? 'Güven Ortağı' : 'Education Trust'}
      description={isTr
        ? 'Veli ve öğrenci sesini dinleyin, eğitim kalitenizi sürekli geliştirin. Okulunuzun dijital itibarını Buaze ile güçlendirin.'
        : "Listen to the voice of parents and students, continuously improve your education quality. Strengthen your school's digital reputation with Buaze."}
      accentColor="#0ea5e9"
      stats={stats}
      steps={steps}
      benefits={benefits}
      faqs={faqs}
      howToSteps={isTr ? [
        { name: 'Kurumu tanımla', text: 'Okul adı, kategori, adres ve bildirim e-postasını Buaze panelinde gir; Google yorum bağlantısını ekle.' },
        { name: 'Veli bilgilendirme noktasına QR yerleştir', text: 'Veli toplantısı materyali, fatura altı veya kayıt formunda QR sun; sınıf/kademe etiketi için URL parametresi kullan.' },
        { name: 'Müdür ve öğretmenleri ekibe ekle', text: 'Müdür, müdür yardımcısı ve kademe öğretmenlerini Buaze ekibine davet et; düşük puanlar doğru ekibin inbox\'ına düşsün.' },
        { name: 'Pulse AI ile eğitim tonunda yanıt yaz', text: 'Pulse AI yanıtları sıcak ve profesyonel eğitim tonunda taslak üretir — müdür onaylar, gönderir; kademe bazlı analitiklerden örüntüleri oku.' },
      ] : [
        { name: 'Identify the institution', text: 'Enter school name, category, address and notification email in the Buaze panel; add the Google review link.' },
        { name: 'Place the QR at parent-communication points', text: 'Offer the QR in parent-meeting materials, on the invoice or on the enrolment form; use a URL parameter for the class/grade tag.' },
        { name: 'Invite principal and teachers', text: 'Add principal, vice principal and grade leads to your Buaze team so low ratings reach the right team.' },
        { name: 'Reply in an education tone via Pulse AI', text: 'Pulse AI drafts replies in a warm, professional education tone — principal approves and sends; per-grade analytics show patterns.' },
      ]}
      illustration={<IllusSchool />}
    />
  );
}
