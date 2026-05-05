import { PageHeader } from '@/components/ui';
import type { Locale } from '@/lib/translations';
import { Sparkles, Mail, Users, BarChart3 } from 'lucide-react';

// §38.57 — /dashboard/campaigns placeholder (sidebar nav "Yeni" badge ile
// görünür, click → bu sayfa). Backend (CustomerEmailCampaign §38.48 Wave 2)
// şu an admin-only `/admin/newsletters/campaigns`'da kullanılıyor; owner
// panel için müstakil kampanya yönetimi (workspace-scoped, segment-aware)
// gelecek scope.

interface PageProps {
  params: Promise<{ locale: string }>;
}

export default async function OwnerCampaignsPage({ params }: PageProps) {
  const { locale: localeParam } = await params;
  const locale: Locale = localeParam === 'en' ? 'en' : 'tr';
  const isTr = locale === 'tr';

  return (
    <div className="mx-auto max-w-[1100px] px-4 sm:px-7 py-6 lg:py-8 space-y-5">
      <PageHeader
        eyebrow={isTr ? 'CRM / KAMPANYALAR' : 'CRM / CAMPAIGNS'}
        title={isTr ? 'Kampanyalar' : 'Campaigns'}
        description={
          isTr
            ? 'Müşteri segmentlerine özel e-posta kampanyaları planla ve gönder. Yakında — şu an "Müşteriler" sayfasından bulk action ile tek seferlik kampanya gönderebilirsin.'
            : 'Plan and send email campaigns to customer segments. Coming soon — for now, send one-off campaigns via Customers page bulk actions.'
        }
      />

      {/* Coming soon state — hero info card */}
      <section className="bz-card p-6 sm:p-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EAF9B8] border border-[#C6F24E]">
          <Sparkles size={20} className="text-[#0A0A0A]" strokeWidth={2} />
        </div>
        <h2 className="bz-h-tight text-[20px] sm:text-[22px] mb-2">
          {isTr ? 'Kampanya yönetimi yakında' : 'Campaign management coming soon'}
        </h2>
        <p className="text-[13.5px] text-[#525252] max-w-[520px] mx-auto leading-[1.6]">
          {isTr
            ? 'Şimdilik müşteri segmentlerine kampanya göndermek için "Müşteriler" sayfasındaki "Toplu kampanya gönder" özelliğini kullanabilirsin. Bu sayfa segment-bazlı, zamanlanmış ve tekrarlanan kampanyalar için yakında açılacak.'
            : 'For now, use Customers page "Send campaign" bulk action to send one-off campaigns. This page will open soon for segment-based, scheduled, and recurring campaigns.'}
        </p>
      </section>

      {/* Roadmap features */}
      <section className="bz-card p-5 sm:p-6">
        <h3 className="pulse-eyebrow text-[10.5px] text-[#737373] mb-4">
          {isTr ? 'YAKINDA AÇILACAK' : 'COMING SOON'}
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Users size={14} className="text-[#A8D62E]" strokeWidth={2} />
              <span className="bz-h-tight text-[13.5px]">
                {isTr ? 'Segment bazlı' : 'Segment-based'}
              </span>
            </div>
            <p className="text-[12px] text-[#525252] leading-[1.55]">
              {isTr
                ? 'VIP / Sadık / Risk altında / Kayıp segment\'lerine ayrı içerik.'
                : 'Tailored content for VIP / Loyal / At Risk / Churned segments.'}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
            <div className="flex items-center gap-2 mb-2">
              <Mail size={14} className="text-[#A8D62E]" strokeWidth={2} />
              <span className="bz-h-tight text-[13.5px]">
                {isTr ? 'Şablon kütüphanesi' : 'Template library'}
              </span>
            </div>
            <p className="text-[12px] text-[#525252] leading-[1.55]">
              {isTr
                ? 'Doğum günü, geri kazanım, yeni menü, etkinlik şablonları.'
                : 'Birthday, win-back, new menu, event templates.'}
            </p>
          </div>
          <div className="rounded-[12px] border border-[#EDEDED] bg-[#FAFAFA] p-4">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 size={14} className="text-[#A8D62E]" strokeWidth={2} />
              <span className="bz-h-tight text-[13.5px]">
                {isTr ? 'Performans analizi' : 'Performance analytics'}
              </span>
            </div>
            <p className="text-[12px] text-[#525252] leading-[1.55]">
              {isTr
                ? 'Açılma, tıklama, dönüşüm metrikleri kampanya başına.'
                : 'Open, click, conversion metrics per campaign.'}
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
