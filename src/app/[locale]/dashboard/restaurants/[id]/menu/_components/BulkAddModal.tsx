import { useMemo, useState } from 'react';
import { AlertTriangle, Check, Loader2, X } from 'lucide-react';
import { AlertBanner, Field, Modal, PulseSelect } from '@/components/ui';
import { formatPrice } from '@/lib/format';
import { MENU_BULK_MAX_ITEMS, parseMenuLines, type MenuLineError, type ParsedMenuLine } from '@/lib/menu-bulk-parse';
import type { MenuCopy, MenuFmt } from './menu-copy';
import type { CategoryShape } from './menu-types';
import { MENU_INPUT_CLASS, isFinePointer } from './menu-ui';
import type { BulkAddResult } from './useMenuBuilder';

/**
 * "Paste a list": one item per line (name first, price last), a live preview
 * of what will be created, and a single request for all of it. Lines that
 * cannot be read are listed with the reason and simply left out.
 */
export function BulkAddModal({
  categories, defaultCategoryId, isTr, copy, fmt, onClose, onSubmit,
}: {
  categories: CategoryShape[];
  defaultCategoryId: string;
  isTr: boolean;
  copy: MenuCopy;
  fmt: MenuFmt;
  onClose: () => void;
  onSubmit: (categoryId: string, items: { name: string; priceCents: number }[]) => Promise<BulkAddResult>;
}) {
  const [text, setText] = useState('');
  const [categoryId, setCategoryId] = useState(defaultCategoryId || categories[0]?.id || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // The on-screen keyboard would cover the list on a phone: focus only with a physical keyboard.
  const [autoFocus] = useState(isFinePointer);

  const parsed = useMemo(() => parseMenuLines(text), [text]);
  const good = parsed.rows.filter((row): row is Extract<ParsedMenuLine, { error?: undefined }> => row.error === undefined);
  const bad = parsed.rows.length - good.length;

  const reasons: Record<MenuLineError, string> = {
    no_price: copy.bulkNoPrice,
    no_name: copy.bulkNoName,
    name_too_long: copy.bulkNameTooLong,
    bad_price: copy.bulkBadPrice,
  };
  const money = (cents: number) => formatPrice(cents, 'TRY', isTr ? 'tr-TR' : 'en-US');

  const submit = async () => {
    if (saving || good.length === 0 || !categoryId) return;
    setSaving(true);
    setError(null);
    const result = await onSubmit(
      categoryId,
      good.map((row) => ({ name: row.name, priceCents: row.priceCents })),
    );
    // On success the page closes this dialog; on failure the text stays so nothing is lost.
    if (!result.ok) {
      setError(result.message);
      setSaving(false);
    }
  };

  return (
    <Modal
      size={560}
      title={copy.pasteList}
      onClose={onClose}
      closeGuard={() => text.trim().length > 0}
      closeConfirm={{ title: copy.leaveTitle, body: copy.leaveBody, confirm: copy.leave, cancel: copy.keepEditing }}
      footer={
        <div className="flex w-full flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="bz-btn-ghost">
            {copy.cancel}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={saving || good.length === 0}
            className="bz-btn-primary"
          >
            {saving && <Loader2 size={14} className="animate-spin" />}
            {fmt.bulkAdd(good.length)}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {error && (
          <AlertBanner kind="danger" icon={<AlertTriangle size={14} strokeWidth={2} className="mt-0.5" />}>
            {error}
          </AlertBanner>
        )}

        {categories.length > 1 && (
          <Field label={copy.category}>
            <PulseSelect
              value={categoryId}
              onChange={setCategoryId}
              className="w-full"
              options={categories.map((c) => ({ value: c.id, label: c.name }))}
            />
          </Field>
        )}

        <Field label={copy.items} hint={copy.bulkHelp}>
          <textarea
            autoFocus={autoFocus}
            value={text}
            onChange={(e) => {
              setText(e.target.value);
              if (error) setError(null);
            }}
            rows={8}
            placeholder={copy.bulkPlaceholder}
            autoCapitalize="sentences"
            autoCorrect="off"
            spellCheck={false}
            className={`${MENU_INPUT_CLASS} resize-y leading-relaxed`}
          />
        </Field>

        {parsed.rows.length > 0 && (
          <section aria-label={copy.bulkPreview} className="space-y-2">
            <div aria-live="polite" className="space-y-0.5 text-[12.5px]">
              <p className="font-semibold text-[#166534]">{fmt.bulkWillAdd(good.length)}</p>
              {bad > 0 && <p className="text-[#991B1B]">{fmt.bulkUnreadable(bad)}</p>}
              {parsed.overLimit && (
                <p className="text-[#92400E]">{fmt.bulkOverLimit(MENU_BULK_MAX_ITEMS)}</p>
              )}
            </div>
            <ul className="max-h-[200px] divide-y divide-[#F5F5F5] overflow-y-auto rounded-2xl border border-[#EDEDED] bg-white">
              {parsed.rows.map((row, index) => (
                <li
                  key={index}
                  className={`flex items-start gap-2 px-3 py-2 text-[13px] ${
                    row.error ? 'bg-[#FEF2F2]/70 text-[#991B1B]' : 'text-[#0A0A0A]'
                  }`}
                >
                  {row.error ? (
                    <X size={14} strokeWidth={2.5} className="mt-0.5 shrink-0" aria-hidden="true" />
                  ) : (
                    <Check size={14} strokeWidth={2.5} className="mt-0.5 shrink-0 text-[#16A34A]" aria-hidden="true" />
                  )}
                  <span className="min-w-0 break-words">
                    {row.error
                      ? fmt.bulkRowError(row.line, reasons[row.error])
                      : fmt.bulkRowLabel(row.name, money(row.priceCents))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}
