import Link from 'next/link';
import { ArrowRight, BarChart3, ClipboardCheck, Tag } from 'lucide-react';
import { PageHeader } from '@/components/ui';

// CLAUDE.md §42 — Denetim Merkezi hub (superadmin landing).
//
// Eski davranış: `/admin/audits` direkt `/admin/audits/templates`'e redirect.
// Yeni davranış: 3-card grid (Şablonlar / Kategoriler / İstatistikler) +
// her kart için kısa açıklama + ArrowRight CTA. Operatör için
// keşfedilebilirlik — sidebar 3 leaf'i tek hub sayfasında özetlenir.
//
// Akış mantığı 3-card sıralamasında (sektörden veriye → yorum/istatistik):
//   1. Şablonlar     — operatörün ana çalışma alanı
//   2. Kategoriler   — taksonomi (daha nadir değişir)
//   3. İstatistikler — kullanım gözlemi

const SECTIONS = [
  {
    href: '/admin/audits/templates',
    icon: ClipboardCheck,
    title: 'Şablonlar',
    description:
      'Sektör başına yayınlanan hazır denetim şablonlarını yönet, soru ekle, taslak/yayın durumunu kontrol et.',
    badge: 'Ana çalışma alanı',
  },
  {
    href: '/admin/audits/categories',
    icon: Tag,
    title: 'Kategoriler',
    description:
      'Şablonları sektör ve konuya göre gruplayan taksonomi. İşletme sahipleri şablon seçerken bu listeden filtreler.',
    badge: 'Taksonomi',
  },
  {
    href: '/admin/audits/stats',
    icon: BarChart3,
    title: 'İstatistikler',
    description:
      'Sistem geneli kullanım: tamamlanan yanıt sayısı, sektör başına dağılım, en popüler şablonlar, en aktif işletmeler.',
    badge: 'Gözlem',
  },
] as const;

export default function AdminAuditsHubPage() {
  return (
    <div className="mx-auto max-w-[1440px] space-y-5 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · DENETİM MERKEZİ"
        eyebrowColor="#78FC90"
        title="Denetim Merkezi"
        description="Hazır şablon kataloğu, kategori taksonomisi ve sistem genelinde kullanım istatistikleri. İşletme sahipleri bu şablonları kopyalayıp kendi denetimlerine uyarlar."
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <Link
              key={s.href}
              href={s.href}
              className="bz-card p-5 flex flex-col gap-3 hover:shadow-md hover:-translate-y-0.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent focus-visible:ring-offset-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-[20px] bg-pn-accent-soft"
                  aria-hidden="true"
                >
                  <Icon size={18} strokeWidth={2.25} className="text-pn-ink" />
                </div>
                <span className="text-[13px] font-medium text-[#525252]">{s.badge}</span>
              </div>
              <div className="space-y-1">
                <h2 className="bz-h-tight text-[18px]">{s.title}</h2>
                <p className="text-[13px] text-[#525252] leading-relaxed">{s.description}</p>
              </div>
              <span className="flex items-center gap-1 text-[12px] text-pn-ink font-medium mt-auto pt-2">
                Aç <ArrowRight size={12} />
              </span>
            </Link>
          );
        })}
      </div>

      <div className="bz-card-soft p-4 text-[13px] text-[#525252] leading-relaxed">
        <p>
          <strong className="text-pn-ink">Hızlı başlangıç:</strong> Sistemde henüz şablon yoksa{' '}
          <Link href="/admin/audits/templates" className="text-pn-ink underline">
            Şablonlar sayfasındaki
          </Link>{' '}
          <em>“Varsayılan içeriği yükle”</em> butonuyla 6 sektör için hazır 18 kategori + 24 şablon
          + ~120 soru tek tıkla oluşturulur. İşlem tekrarlanabilir — elle eklediğin kayıtlara
          dokunulmaz.
        </p>
      </div>
    </div>
  );
}
