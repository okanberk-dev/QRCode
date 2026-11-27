// Denetim Merkezi — sihirbaz (oluştur + düzenle) iskeleti.
//
// `new/loading.tsx` ve `[id]/edit/loading.tsx` aynı iskeleti paylaşır. Sarmalayıcı
// gerçek sayfayla birebir aynıdır (`max-w-[920px] space-y-5 px-4 sm:px-7 py-6
// lg:py-8`, CLAUDE.md §40.10 CLS=0): geri bağlantısı + başlık + adım göstergesi +
// açılış adımı + eylem çubuğu.
//
// Açılış adımı sayfayla aynıdır: oluşturma 1. adımda ("Başla": tür + ad + dil
// kartı) açılır, düzenleme 2. adımda ("Maddeler": hızlı ekleme kartı + madde
// satırları; eylem çubuğunda Geri / Kaydet / İleri). Satır yükseklikleri gerçek
// alanlarla aynı (etiket 18px, metin kutusu mobilde 46px / masaüstünde 42px, dil
// seçimi 44px / 34px, seçenek çipleri mobilde 44px).

import { SkBox, SkPageShell } from '@/components/ui/skeletons/PageSkeleton';

interface Props {
  /** Oluşturmada ilk kartta "Kontrol listesi / Test" seçimi. */
  withKindPicker?: boolean;
  /** Sayfanın açıldığı adım: 0 = Başla (oluştur), 1 = Maddeler (düzenle). */
  step?: 0 | 1;
}

/** Tek satırlık metin: satır yüksekliğinde kutu, içinde daha ince gri çizgi. */
function TextLine({ line, bar }: { line: string; bar: string }) {
  return (
    <div className={`flex items-center ${line}`}>
      <SkBox className={bar} />
    </div>
  );
}

/** Adım başlığı (h2 + bir satır açıklama). */
function StepHeading({ sub }: { sub: string }) {
  return (
    <div className="min-w-0 max-w-full space-y-1">
      <TextLine line="h-[30px] sm:h-[33px]" bar="h-6 w-56 max-w-full" />
      <TextLine line="h-5" bar={`h-3.5 ${sub} max-w-full`} />
    </div>
  );
}

function StartStep({ withKindPicker }: { withKindPicker: boolean }) {
  return (
    <div className="space-y-4">
      <StepHeading sub="w-80" />

      <div className="bz-card space-y-4 p-4 sm:p-5">
        {withKindPicker && (
          <div>
            <TextLine line="mb-2 h-[18px]" bar="h-3 w-24" />
            <div className="grid gap-2 sm:grid-cols-2">
              <SkBox className="h-[90px] w-full" />
              <SkBox className="h-[108px] w-full sm:h-[90px]" />
            </div>
          </div>
        )}
        <div>
          <TextLine line="mb-1.5 h-[18px]" bar="h-3 w-28" />
          <SkBox className="h-[46px] w-full sm:h-[42px]" />
        </div>
        <div>
          <TextLine line="mb-1.5 h-[18px]" bar="h-3 w-10" />
          <div className="mb-2 flex h-[33px] flex-col justify-center gap-1.5 sm:h-[17px]">
            <SkBox className="h-3 w-full max-w-[360px]" />
            <SkBox className="h-3 w-40 sm:hidden" />
          </div>
          <SkBox className="h-11 w-full sm:h-[34px] sm:max-w-[240px]" />
        </div>
      </div>
    </div>
  );
}

function ItemsStep() {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <StepHeading sub="w-96" />
        <SkBox className="h-[22px] w-36" />
      </div>

      <div className="space-y-3">
        {/* Hızlı ekleme kartı: metin + Ekle, altında tür çipleri */}
        <div className="bz-card space-y-2.5 p-3">
          <div className="flex gap-2">
            <SkBox className="h-[46px] min-w-0 flex-1 sm:h-[42px]" />
            <SkBox className="h-[46px] w-20 shrink-0 sm:h-[42px]" />
          </div>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <TextLine line="h-[18px]" bar="h-3 w-6" />
            <div className="flex flex-wrap gap-1.5">
              {['w-24', 'w-16', 'w-20', 'w-12', 'w-20'].map((w, i) => (
                <SkBox key={i} className={`h-11 ${w} rounded-full sm:h-8`} />
              ))}
            </div>
          </div>
        </div>

        {/* Madde satırları */}
        <ol className="space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="bz-card p-2.5 sm:p-3">
              <div className="flex items-start gap-1.5 sm:gap-2">
                <SkBox className="mt-2 h-4 w-4 shrink-0" />
                <SkBox className="mt-2 h-4 w-4 shrink-0" />
                <div className="min-w-0 flex-1 space-y-2">
                  <TextLine line="h-8" bar="h-4 w-3/4" />
                  <div className="flex flex-wrap items-center gap-1.5">
                    <SkBox className="h-[22px] w-20" />
                    <SkBox className="h-11 w-20 rounded-full sm:h-8" />
                    <SkBox className="h-11 w-20 rounded-full sm:h-8" />
                    <SkBox className="h-11 w-28 rounded-full sm:h-8" />
                    <SkBox className="h-11 w-24 sm:ml-auto sm:h-9" />
                    <SkBox className="h-11 w-11 sm:h-9 sm:w-9" />
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
    <SkPageShell max={920} space={5}>
      <div className="flex min-h-11 items-center sm:min-h-6">
        <SkBox className="h-3 w-32" />
      </div>

      {/* PageHeader: üst etiket + başlık + açıklama (oluşturmada mobilde iki satır). */}
      <div className="mb-5">
        <div className="flex h-[23px] items-center">
          <SkBox className="h-3 w-24" />
        </div>
        <div className="mt-1 flex h-[26px] items-center sm:h-[33px]">
          <SkBox className="h-6 w-48 sm:h-7" />
        </div>
        <div className={`mt-2 flex flex-col justify-center gap-2 sm:h-5 ${step === 1 ? 'h-5' : 'h-10'}`}>
          <SkBox className="h-3.5 w-full max-w-[460px]" />
          {step !== 1 && <SkBox className="h-3.5 w-28 sm:hidden" />}
        </div>
      </div>

      {/* Adım göstergesi (WizardSteps) */}
      <div className="grid grid-cols-3 gap-1.5 rounded-[24px] bg-pn-canvas p-1.5">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex min-h-[44px] items-center justify-center sm:min-h-[40px]">
            <SkBox className="h-4 w-16 sm:w-20" />
          </div>
        ))}
      </div>

      {step === 1 ? <ItemsStep /> : <StartStep withKindPicker={withKindPicker} />}

      {/* Eylem çubuğu */}
      <div className="-mx-4 border-t border-pn-line px-4 py-3 sm:-mx-7 sm:px-7">
        {step === 1 ? (
          <div className="flex items-center gap-2 sm:justify-end">
            <SkBox className="h-11 w-24 sm:mr-auto sm:h-10" />
            <SkBox className="h-11 flex-1 sm:h-10 sm:w-24 sm:flex-none" />
            <SkBox className="h-11 flex-1 sm:h-10 sm:w-24 sm:flex-none" />
          </div>
        ) : (
          <div className="flex items-center gap-2 sm:justify-between">
            <SkBox className="hidden h-10 w-24 sm:block" />
            <SkBox className="h-11 flex-1 sm:h-10 sm:w-24 sm:flex-none" />
          </div>
        )}
      </div>
    </SkPageShell>
  );
}
