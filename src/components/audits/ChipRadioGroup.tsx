'use client';

// Denetim Merkezi — çip biçiminde radyo grubu (hızlı ekleme türü, "Uygun cevap",
// hazır şablon filtreleri). Yerel `<input type="radio">` görsel olarak gizli ama
// odaklanabilir → ok tuşları, grup semantiği ve ekran okuyucu ücretsiz.

export default function ChipRadioGroup<T extends string>({
  name,
  label,
  labelledBy,
  value,
  options,
  onChange,
  disabled = false,
  tone = 'dark',
}: {
  /** Aynı gruptaki radyoların ortak `name`'i (sayfada benzersiz olmalı). */
  name: string;
  /** Görünür başlık yoksa erişilebilir ad. */
  label?: string;
  /** Görünür başlığın id'si. */
  labelledBy?: string;
  /** Seçili değer; hiçbiri seçili değilse ''. */
  value: T | '';
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange: (v: T) => void;
  disabled?: boolean;
  tone?: 'dark' | 'lime';
}) {
  const checkedCls =
    tone === 'lime'
      ? 'peer-checked:border-[#A8D62E] peer-checked:bg-[#C6F24E] peer-checked:text-[#0A0A0A]'
      : 'peer-checked:border-[#0A0A0A] peer-checked:bg-[#0A0A0A] peer-checked:text-white';
  return (
    <div
      role="radiogroup"
      aria-label={labelledBy ? undefined : label}
      aria-labelledby={labelledBy}
      className="flex flex-wrap gap-1.5"
    >
      {options.map((o) => (
        <label key={o.value} className="relative inline-flex">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={value === o.value}
            disabled={disabled}
            onChange={() => onChange(o.value)}
            className="peer sr-only"
          />
          <span
            className={[
              'inline-flex min-h-9 cursor-pointer select-none items-center rounded-full border px-3',
              'text-[12.5px] font-medium transition-colors sm:min-h-8',
              'border-[#EDEDED] bg-white text-[#525252] hover:bg-[#FAFAFA]',
              checkedCls,
              'peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[#C6F24E]',
              'peer-disabled:cursor-not-allowed peer-disabled:opacity-50',
            ].join(' ')}
          >
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}
