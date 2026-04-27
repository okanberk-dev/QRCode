import { GraduationCap, Star, TrendingUp, QrCode, BookOpen, BarChart3 } from 'lucide-react';
import SolutionPageLayout from '@/components/marketing/SolutionPageLayout';
import { IllusSchool } from '@/components/marketing/solution-illustrations';
import { getTranslations } from '@/lib/translations';
import type { Locale } from '@/lib/translations';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: Promise<{ locale: Locale }> }): Promise<Metadata> {
  const { locale } = await params;
  const title = locale === 'tr'
    ? 'Okul & Eğitim Kurumu İtibar Yönetimi — Buaze'
    : 'School & Educational Institution Reputation Management — Buaze';
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
      canonical: `https://buaze.com/${locale}/solutions/schools`,
      languages: { tr: 'https://buaze.com/tr/solutions/schools', en: 'https://buaze.com/en/solutions/schools' },
    },
    openGraph: { title, description, url: `https://buaze.com/${locale}/solutions/schools` },
  };
}

export default async function SchoolsSolutionPage({ params }: { params: Promise<{ locale: Locale }> }) {
  const { locale } = await params;
  const t = getTranslations(locale);
  const isTr = locale === 'tr';

  const stats = [
    { num: 'Veli', label: isTr ? '& ÖĞRENCİ FEEDBACK' : '& STUDENT FEEDBACK', context: isTr ? 'Çift kanal' : 'Dual channel' },
    { num: '+%135', label: isTr ? 'GOOGLE YORUMU' : 'GOOGLE REVIEWS', context: isTr ? 'Dönem başı' : 'Semester start' },
    { num: '%91', label: isTr ? 'VELİ MEMNUNİYETİ' : 'PARENT SATISFACTION', context: isTr ? 'Dönem sonu' : 'Semester end' },
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
      desc: isTr ? 'Yüksek Google skorlu okul, yeni veli araştırmalarında üst sıralara çıkar. Doğal kayıt artışı sağlanır.' : 'A school with high Google scores appears at the top in new parent searches. Natural enrollment growth is achieved.',
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
      illustration={<IllusSchool />}
    />
  );
}
