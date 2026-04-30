'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, Save, RotateCcw } from 'lucide-react';
import { AlertBanner, Badge, PageHeader } from '@/components/ui';

interface VariableRow {
  key: string;
  label: { tr: string; en: string };
  description: { tr: string; en: string };
  group: 'company' | 'contact' | 'commercial' | 'retention';
  defaultValue: string;
  value: string;
  customised: boolean;
  updatedAt: string | null;
}

const GROUP_LABELS: Record<VariableRow['group'], string> = {
  company: 'Şirket bilgileri',
  contact: 'İletişim adresleri',
  commercial: 'Ticari koşullar',
  retention: 'Saklama süreleri',
};

const GROUP_ORDER: VariableRow['group'][] = ['company', 'contact', 'commercial', 'retention'];

export default function LegalVariablesPage() {
  const [rows, setRows] = useState<VariableRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [edits, setEdits] = useState<Record<string, string>>({});
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const res = await fetch('/api/admin/legal-variables');
        const body = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(body.error || 'Yüklenemedi');
        setRows(body.variables);
        setEdits({});
      } catch (e) {
        if (alive) setError((e as Error).message);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [reloadKey]);

  const grouped = useMemo(() => {
    const map = new Map<string, VariableRow[]>();
    for (const r of rows) {
      const arr = map.get(r.group) ?? [];
      arr.push(r);
      map.set(r.group, arr);
    }
    return GROUP_ORDER.map((g) => ({
      group: g,
      label: GROUP_LABELS[g],
      items: map.get(g) ?? [],
    }));
  }, [rows]);

  const dirty = Object.keys(edits).length > 0;

  const onChange = (key: string, value: string, current: string) => {
    setEdits((prev) => {
      const next = { ...prev };
      if (value === current) delete next[key];
      else next[key] = value;
      return next;
    });
  };

  const onResetField = (key: string, defaultValue: string) => {
    if (!confirm(`"${key}" değişkenini varsayılana döndür?`)) return;
    setEdits((prev) => ({ ...prev, [key]: '' }));
    // Save immediately — empty value triggers DELETE in API
    void saveSingle(key, '');
  };

  const saveSingle = async (key: string, value: string) => {
    try {
      const res = await fetch('/api/admin/legal-variables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: { [key]: value === '' ? null : value } }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Kaydedilemedi');
      }
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const onSaveAll = async () => {
    if (!dirty) return;
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const res = await fetch('/api/admin/legal-variables', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ values: edits }),
      });
      const body = await res.json();
      if (!res.ok) {
        if (body.error === 'value_too_long') {
          throw new Error(`"${body.key}" çok uzun (max ${body.max} karakter).`);
        }
        throw new Error(body.error || 'Kaydedilemedi');
      }
      setNotice(`${Object.keys(edits).length} değişken kaydedildi. Tüm hukuki metinlerde otomatik güncelleneceklerdir.`);
      setEdits({});
      setReloadKey((k) => k + 1);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-[1200px] px-4 sm:px-7 py-6 lg:py-8">
      <Link
        href="/admin/legal-documents"
        className="mb-4 inline-flex items-center gap-1.5 text-[12.5px] text-[#737373] hover:text-[#0A0A0A]"
      >
        <ArrowLeft size={14} />
        Hukuki metinler
      </Link>
      <PageHeader
        eyebrow="HUKUKİ METİNLER · DEĞİŞKENLER"
        title="Sözleşme değişkenleri"
        description="Şirket adı, adres, iletişim e-postası gibi tek-kaynak değişkenler. Buradaki değer değiştiğinde tüm hukuki metinlerde {{ANAHTAR}} olarak geçen yerlerde otomatik güncellenir."
        actions={
          <button
            type="button"
            onClick={onSaveAll}
            disabled={!dirty || saving}
            className="bz-btn-primary"
          >
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Kaydediliyor...' : `Kaydet${dirty ? ` (${Object.keys(edits).length})` : ''}`}
          </button>
        }
      />

      {error && (
        <AlertBanner kind="danger" className="mb-4" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner kind="success" className="mb-4" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      <AlertBanner kind="info" className="mb-5">
        <div className="text-[12.5px] leading-[1.6]">
          Hukuki metinler içinde <code className="rounded bg-white px-1 py-0.5 text-[11px]">{'{{COMPANY_NAME}}'}</code>
          {' '}gibi placeholder yazıldığında, public sayfa render edildiğinde buradaki değerle değiştirilir.
          Değer boş bırakıldığında varsayılan kullanılır. Yeni placeholder eklemek için kod tarafında
          <code className="rounded bg-white px-1 py-0.5 text-[11px]">src/lib/legal/variables.ts</code>
          {' '}güncellenmelidir.
        </div>
      </AlertBanner>

      {loading ? (
        <div className="flex items-center gap-2 text-[#737373]">
          <Loader2 size={18} className="animate-spin" />
          Yükleniyor...
        </div>
      ) : (
        <div className="space-y-5">
          {grouped.map((g) =>
            g.items.length === 0 ? null : (
              <div key={g.group} className="bz-card overflow-hidden">
                <div className="border-b border-[#EDEDED] px-5 py-3">
                  <h2 className="bz-h-tight text-[14px] sm:text-[15px] tracking-[-0.02em]">
                    {g.label}
                  </h2>
                </div>
                <div className="divide-y divide-[#EDEDED]">
                  {g.items.map((row) => {
                    const live =
                      edits[row.key] !== undefined ? edits[row.key] : row.value;
                    const isDirty = edits[row.key] !== undefined;
                    return (
                      <div
                        key={row.key}
                        className="grid gap-2 px-5 py-3.5 sm:grid-cols-[200px_1fr_auto] sm:items-center"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <code className="text-[11px] font-medium text-[#0A0A0A]">
                              {`{{${row.key}}}`}
                            </code>
                            {row.customised && !isDirty && (
                              <Badge kind="lime">Özel</Badge>
                            )}
                            {isDirty && <Badge kind="warn">Kaydedilmedi</Badge>}
                          </div>
                          <div className="mt-0.5 text-[12px] text-[#737373]">
                            {row.label.tr}
                          </div>
                        </div>
                        <div>
                          <input
                            type="text"
                            value={live}
                            onChange={(e) => onChange(row.key, e.target.value, row.value)}
                            className="bz-input w-full"
                            placeholder={row.defaultValue}
                          />
                          <p className="mt-1 text-[11.5px] text-[#A3A3A3]">
                            {row.description.tr}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 sm:justify-end">
                          {row.customised && (
                            <button
                              type="button"
                              onClick={() => onResetField(row.key, row.defaultValue)}
                              className="bz-btn-ghost text-[11.5px]"
                              title="Varsayılana dön"
                            >
                              <RotateCcw size={12} />
                              Varsayılan
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}
