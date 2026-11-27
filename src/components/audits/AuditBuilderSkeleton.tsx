// Denetim Merkezi — sihirbaz (oluştur + düzenle) iskeleti.
//
// `new/loading.tsx` ve `[id]/edit/loading.tsx` aynı iskeleti paylaşır. Sarmalayıcı
// gerçek sayfayla birebir aynıdır (`max-w-[920px] space-y-4 sm:space-y-5 px-4
// sm:px-7 py-6 lg:py-8`, CLAUDE.md §40.10 CLS=0): geri bağlantısı + başlık + adım
// göstergesi + açılış adımı (beyaz adım kartı) + eylem çubuğu.
//
// Açılış adımı sayfayla aynıdır: oluşturma 1. adımda ("Başla": tür + ad + dil
// kartı) açılır, düzenleme 2. adımda ("Maddeler": hızlı ekleme kutusu + madde
// satırları; eylem çubuğunda Geri / Kaydet / İleri).

import { SkBox } from '@/components/ui/skeletons/PageSkeleton';
import { WizardFooterSkeleton, WizardStepsSkeleton } from '@/components/ui/WizardSteps';

interface Props {
  /** Oluşturmada ilk kartta "Kontrol listesi / Test" seçimi. */
  withKindPicker?: boolean;
  /** Sayfanın açıldığı adım: 0 = Başla (oluştur), 1 = Maddeler (düzenle). */
  step?: 0 | 1;
}

/** Adım kartının başlığı (20px başlık + bir satır gri açıklama). */
function PanelHeading({ sub }: { sub: string }) {
  return (
    <div className="mb-5 space-y-2 sm:mb-6">
      <SkBox className="h-5 w-56 max-w-full" />
      <SkBox className={`h-4 ${sub} max-w-full`} />
    </div>
  );
}

function StartStep({ withKindPicker }: { withKindPicker: boolean }) {
  return (
    <div className="bz-card p-5 sm:p-7">
      <PanelHeading sub="w-80" />
      <div className="space-y-5">
        {withKindPicker && (
          <div>
            <SkBox className="mb-2 h-4 w-24" />
            <div className="grid gap-2 sm:grid-cols-2">
              <SkBox className="h-[84px] w-full rounded-[16px]" />
              <SkBox className="h-[84px] w-full rounded-[16px]" />
            </div>
          </div>
        )}
        <div className="space-y-2">
          <SkBox className="h-4 w-28" />
          <SkBox className="h-[46px] w-full rounded-full" />
        </div>
        <div className="space-y-2">
          <SkBox className="h-4 w-12" />
          <SkBox className="h-3.5 w-full max-w-[360px]" />
          <SkBox className="h-11 w-full rounded-full sm:max-w-[240px]" />
        </div>
      </div>
    </div>
  );
}

function ItemsStep() {
  return (
    <div className="bz-card p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PanelHeading sub="w-96" />
        <SkBox className="h-6 w-36 rounded-full" />
      </div>
      <div className="space-y-3">
        {/* Hızlı ekleme: metin + Ekle, altında tür çipleri */}
        <div className="space-y-3 rounded-[18px] bg-pn-canvas p-3 sm:p-4">
          <div className="flex gap-2">
            <SkBox className="h-[46px] min-w-0 flex-1 rounded-full" />
            <SkBox className="h-[46px] w-24 shrink-0 rounded-full" />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {['w-24', 'w-16', 'w-20', 'w-12', 'w-20'].map((w, i) => (
              <SkBox key={i} className={`h-11 ${w} rounded-full sm:h-8`} />
            ))}
          </div>
        </div>

        {/* Madde satırları */}
        <ol className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-[16px] bg-pn-canvas p-2.5 sm:p-3">
              <div className="flex items-start gap-1.5 sm:gap-2">
                <SkBox className="mt-2 h-4 w-4 shrink-0" />
                <SkBox className="mt-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <SkBox className="mt-2 h-4 w-3/4" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SkBox className="h-11 w-20 rounded-full sm:h-8" />
                    <SkBox className="h-11 w-28 rounded-full sm:h-8" />
                    <SkBox className="h-11 w-24 rounded-full sm:ml-auto sm:h-9" />
                    <SkBox className="h-11 w-11 rounded-full sm:h-9 sm:w-9" />
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export default function AuditBuilderSkeleton({ withKindPicker = false, step = 0 }: Props) {
  return (
    <div className="mx-auto max-w-[920px] space-y-4 px-4 py-6 sm:space-y-5 sm:px-7 lg:py-8" aria-busy="true">
      <div className="flex min-h-11 items-center sm:min-h-8">
        <SkBox className="h-3.5 w-32" />
      </div>

      {/* PageHeader: yol göstergesi (sm+) + başlık + açıklama */}
      <div className="mb-5 space-y-2.5 lg:mb-6">
        <SkBox className="hidden h-5 w-48 sm:block" />
        <SkBox className="h-8 w-56" />
        <SkBox className="h-4 w-full max-w-[460px]" />
      </div>

      <WizardStepsSkeleton count={3} />

      {step === 1 ? <ItemsStep /> : <StartStep withKindPicker={withKindPicker} />}

      <WizardFooterSkeleton buttons={step === 1 ? 3 : 2} />
    </div>
  );
}
