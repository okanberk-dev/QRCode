'use client';

// Stage 119 §38.199 — Admin create/edit modal for a single global template.
// Used in two modes:
//   - target=null  → create new
//   - target=row   → edit existing (id, current values prefilled)

import { useState } from 'react';
import { Modal, AlertBanner } from '@/components/ui';
import { Loader2, Save } from 'lucide-react';

interface TemplateRow {
  id: string;
  key: string | null;
  title: string;
  description: string | null;
  sector: string;
  locale: string;
  category: string;
  subject: string;
  body: string;
  isPublished: boolean;
}

interface Props {
  target: TemplateRow | null;
  onClose: () => void;
  onSaved: (message: string) => void;
}

const SECTORS: { value: string; label: string }[] = [
  { value: 'food', label: 'Restoran / Kafe' },
  { value: 'delivery', label: 'Paket servis' },
  { value: 'hospitality', label: 'Otel' },
  { value: 'clinic', label: 'Klinik' },
  { value: 'legal', label: 'Hukuk' },
  { value: 'spa', label: 'Spa / Güzellik' },
  { value: 'retail', label: 'Perakende' },
  { value: 'fitness', label: 'Spor' },
  { value: 'education', label: 'Eğitim' },
  { value: 'other', label: 'Diğer' },
];

const CATEGORIES: { value: string; label: string }[] = [
  { value: 'reactivation', label: 'Geri kazanma' },
  { value: 'special-offer', label: 'Özel teklif' },
  { value: 'feedback-request', label: 'Geri bildirim' },
  { value: 'custom', label: 'Özel' },
];

export function CampaignTemplateEditorModal({ target, onClose, onSaved }: Props) {
  const isEdit = target !== null;

  const [title, setTitle] = useState(target?.title ?? '');
  const [description, setDescription] = useState(target?.description ?? '');
  const [keyInput, setKeyInput] = useState(target?.key ?? '');
  const [sector, setSector] = useState(target?.sector ?? 'food');
  const [locale, setLocale] = useState<'tr' | 'en'>(
    target?.locale === 'en' ? 'en' : 'tr',
  );
  const [category, setCategory] = useState(target?.category ?? 'custom');
  const [subject, setSubject] = useState(target?.subject ?? '');
  const [body, setBody] = useState(target?.body ?? '');
  const [isPublished, setIsPublished] = useState(target?.isPublished ?? false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const titleValid = title.trim().length >= 1 && title.trim().length <= 120;
  const subjectValid = subject.trim().length >= 1 && subject.trim().length <= 150;
  const bodyValid = body.trim().length >= 1 && body.length <= 10000;
  const formValid = titleValid && subjectValid && bodyValid;

  async function save() {
    if (!formValid) return;
    setError(null);
    setSaving(true);
    try {
      const payload: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() ? description.trim() : null,
        sector,
        locale,
        category,
        subject: subject.trim(),
        body,
        isPublished,
      };
      if (keyInput.trim()) {
        payload.key = keyInput.trim();
      } else if (isEdit) {
        payload.key = null;
      }

      const url = isEdit
        ? `/api/admin/customer-campaign-templates/${target!.id}`
        : '/api/admin/customer-campaign-templates';
      const res = await fetch(url, {
        method: isEdit ? 'PATCH' : 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        if (j?.error === 'key_already_exists') {
          setError('Bu anahtar zaten başka bir şablonda kullanılıyor.');
        } else if (j?.error === 'validation_error') {
          setError(
            j?.issues?.[0]?.message
              ? `Doğrulama: ${j.issues[0].message}`
              : 'Form doğrulaması başarısız.',
          );
        } else {
          setError(j?.error || 'Kayıt başarısız');
        }
        return;
      }
      onSaved(isEdit ? 'Şablon güncellendi.' : 'Şablon oluşturuldu.');
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal
      size={720}
      title={isEdit ? 'Şablonu düzenle' : 'Yeni şablon'}
      onClose={onClose}
      ariaLabel={isEdit ? 'Şablon düzenle' : 'Yeni şablon oluştur'}
    >
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="tpl-title">
              Başlık
            </label>
            <input
              id="tpl-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={120}
              placeholder="Örn. Restoran — Geri kazanma"
              className="bz-input w-full"
              disabled={saving}
            />
          </div>
          <div>
            <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="tpl-key">
              Anahtar (opsiyonel)
            </label>
            <input
              id="tpl-key"
              type="text"
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              maxLength={120}
              placeholder="örn. food.reactivation.tr"
              className="bz-input w-full bz-mono text-[12px]"
              disabled={saving}
            />
            <div className="mt-1 text-[10.5px] text-[#A3A3A3]">
              Seed script bu anahtarı kullanır. Boş bırakabilirsin.
            </div>
          </div>
        </div>

        <div>
          <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="tpl-description">
            Açıklama (admin notu)
          </label>
          <input
            id="tpl-description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="Sektör / kategori / kullanım kısa notu"
            className="bz-input w-full"
            disabled={saving}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="tpl-sector">
              Sektör
            </label>
            <select
              id="tpl-sector"
              value={sector}
              onChange={(e) => setSector(e.target.value)}
              className="bz-input w-full"
              disabled={saving}
            >
              {SECTORS.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="tpl-category">
              Kategori
            </label>
            <select
              id="tpl-category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="bz-input w-full"
              disabled={saving}
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block bz-h-tight text-[12px] mb-1.5">Dil</label>
            <div className="inline-flex rounded-full border border-[#EDEDED] bg-white p-0.5">
              {(['tr', 'en'] as const).map((l) => (
                <button
                  key={l}
                  type="button"
                  onClick={() => setLocale(l)}
                  className={`px-3 py-1 rounded-full text-[12px] font-medium transition-colors ${
                    locale === l ? 'bg-[#0A0A0A] text-white' : 'text-[#525252]'
                  }`}
                  disabled={saving}
                >
                  {l === 'tr' ? 'Türkçe' : 'English'}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div>
          <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="tpl-subject">
            E-posta konusu
          </label>
          <input
            id="tpl-subject"
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={150}
            className="bz-input w-full"
            disabled={saving}
          />
          <div className="text-right text-[10.5px] bz-mono tabular-nums mt-1 text-[#A3A3A3]">
            {subject.length}/150
          </div>
        </div>

        <div>
          <label className="block bz-h-tight text-[12px] mb-1.5" htmlFor="tpl-body">
            E-posta gövdesi
          </label>
          <textarea
            id="tpl-body"
            value={body}
            onChange={(e) => setBody(e.target.value)}
            maxLength={10000}
            rows={10}
            className="bz-input w-full text-[14px] sm:text-[13px] leading-[1.55] resize-y"
            disabled={saving}
          />
          <div className="text-right text-[10.5px] bz-mono tabular-nums mt-1 text-[#A3A3A3]">
            {body.length.toLocaleString('tr-TR')}/10.000
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer rounded-[10px] border border-[#EDEDED] bg-[#FAFAFA] px-3 py-2.5">
          <input
            type="checkbox"
            checked={isPublished}
            onChange={(e) => setIsPublished(e.target.checked)}
            className="h-4 w-4 rounded border-[#EDEDED] text-[#0A0A0A] focus:ring-[#C6F24E]"
            disabled={saving}
          />
          <div className="flex-1">
            <div className="bz-h-tight text-[12.5px]">Yayında</div>
            <div className="text-[11px] text-[#737373]">
              İşaretliyse owner picker&apos;da görünür. Taslak durumunda yalnız admin görür.
            </div>
          </div>
        </label>

        {error ? (
          <AlertBanner kind="danger" onDismiss={() => setError(null)}>
            {error}
          </AlertBanner>
        ) : null}
      </div>

      <div className="flex items-center justify-end gap-2 mt-5 pt-4 border-t border-[#EDEDED] flex-wrap">
        <button
          type="button"
          onClick={onClose}
          className="bz-btn-ghost px-4 min-h-[40px] text-[12.5px]"
          disabled={saving}
        >
          Vazgeç
        </button>
        <button
          type="button"
          onClick={save}
          disabled={!formValid || saving}
          className="bz-btn-primary flex items-center gap-1.5 px-4 min-h-[40px] text-[12.5px] disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {isEdit ? 'Güncelle' : 'Oluştur'}
        </button>
      </div>
    </Modal>
  );
}
