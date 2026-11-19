'use client';

import { useCallback, useState } from 'react';
import { BookmarkPlus, FileText, Settings2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui';
import { PulseMenu, PulseMenuDivider, PulseMenuItem, PulseMenuLabel } from '@/components/ui/PulseMenu';
import { blockedReplyMessage, issuesFromBody } from './ReplyRiskNotice';

interface Template {
  id: string;
  title: string;
  body: string;
}

interface Props {
  locale: 'tr' | 'en';
  /** Current composer text — offered as "save as template". */
  draft: string;
  /** Puts the template into the composer. */
  onInsert: (text: string) => void;
}

/**
 * Saved reply templates of the workspace (owner + team), next to the reply
 * box. Loaded on first open; every save passes the reply risk gate on the
 * server (§48), so an inserted template can always be sent.
 */
export function ReplyTemplatesMenu({ locale, draft, onInsert }: Props) {
  const isTr = locale === 'tr';
  const [templates, setTemplates] = useState<Template[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(false);
    try {
      const res = await fetch('/api/reply-templates');
      if (!res.ok) throw new Error(String(res.status));
      const data = await res.json();
      setTemplates(Array.isArray(data?.data) ? data.data : []);
    } catch {
      setLoadError(true);
    }
  }, []);

  const openManage = (prefill: string) => {
    setTitle('');
    setBody(prefill);
    setError(null);
    setManageOpen(true);
    if (templates === null) void load();
  };

  const save = async () => {
    if (saving || !title.trim() || !body.trim()) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/reply-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), body: body.trim() }),
      });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.data) {
        setTemplates((list) => [data.data as Template, ...(list ?? [])]);
        setTitle('');
        setBody('');
      } else if (data?.error === 'content_blocked') {
        setError(blockedReplyMessage(issuesFromBody(data), locale));
      } else if (data?.error === 'limit_reached') {
        setError(isTr ? 'En fazla 50 şablon kaydedebilirsiniz.' : 'You can save up to 50 templates.');
      } else if (res.status === 403) {
        setError(isTr ? 'Şablon kaydetme yetkiniz yok.' : 'You are not allowed to save templates.');
      } else {
        setError(isTr ? 'Şablon kaydedilemedi.' : 'The template could not be saved.');
      }
    } catch {
      setError(isTr ? 'Bağlantı hatası.' : 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    const before = templates;
    setTemplates((list) => (list ?? []).filter((t) => t.id !== id));
    const res = await fetch(`/api/reply-templates/${id}`, { method: 'DELETE' }).catch(() => null);
    if (!res?.ok) {
      setTemplates(before);
      setError(isTr ? 'Şablon silinemedi.' : 'The template could not be deleted.');
    }
  };

  return (
    <>
      <PulseMenu
        className="min-w-[240px] max-w-[320px]"
        onOpenChange={(open) => {
          if (open && templates === null) void load();
        }}
        trigger={
          <button type="button" className="bz-btn-ghost bz-btn-sm inline-flex items-center gap-1.5">
            <FileText size={13} aria-hidden="true" />
            {isTr ? 'Şablonlar' : 'Templates'}
          </button>
        }
      >
        <PulseMenuLabel>{isTr ? 'Kayıtlı yanıtlar' : 'Saved replies'}</PulseMenuLabel>
        {templates === null && !loadError && (
          <PulseMenuItem disabled>{isTr ? 'Yükleniyor…' : 'Loading…'}</PulseMenuItem>
        )}
        {loadError && (
          <PulseMenuItem onSelect={() => void load()}>
            {isTr ? 'Yüklenemedi — tekrar dene' : 'Could not load — retry'}
          </PulseMenuItem>
        )}
        {templates?.length === 0 && (
          <PulseMenuItem disabled>{isTr ? 'Henüz şablon yok' : 'No templates yet'}</PulseMenuItem>
        )}
        {templates?.map((t) => (
          <PulseMenuItem key={t.id} onSelect={() => onInsert(t.body)}>
            <span className="truncate">{t.title}</span>
          </PulseMenuItem>
        ))}
        <PulseMenuDivider />
        <PulseMenuItem
          icon={<BookmarkPlus size={14} />}
          disabled={!draft.trim()}
          onSelect={() => openManage(draft.trim())}
        >
          {isTr ? 'Bu yanıtı şablon yap' : 'Save this reply as a template'}
        </PulseMenuItem>
        <PulseMenuItem icon={<Settings2 size={14} />} onSelect={() => openManage('')}>
          {isTr ? 'Şablonları yönet' : 'Manage templates'}
        </PulseMenuItem>
      </PulseMenu>

      {manageOpen && (
        <Modal
          title={isTr ? 'Yanıt şablonları' : 'Reply templates'}
          onClose={() => setManageOpen(false)}
          size={560}
        >
          <div className="space-y-3">
            <label className="block text-[12px] font-medium text-[#0A0A0A]">
              {isTr ? 'Şablon adı' : 'Template name'}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={80}
                className="bz-input mt-1 w-full"
                placeholder={isTr ? 'örn. Gecikme özrü' : 'e.g. Delay apology'}
              />
            </label>
            <label className="block text-[12px] font-medium text-[#0A0A0A]">
              {isTr ? 'Metin' : 'Text'}
              <textarea
                value={body}
                onChange={(e) => setBody(e.target.value)}
                maxLength={2000}
                rows={4}
                className="bz-input mt-1 w-full"
              />
            </label>
            {error && <p className="text-[12px] text-[#B91C1C]" role="alert">{error}</p>}
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void save()}
                disabled={saving || !title.trim() || !body.trim()}
                className="bz-btn-primary"
              >
                {saving ? (isTr ? 'Kaydediliyor…' : 'Saving…') : isTr ? 'Şablonu kaydet' : 'Save template'}
              </button>
            </div>
            <ul className="divide-y divide-[#EDEDED] border-t border-[#EDEDED]">
              {(templates ?? []).map((t) => (
                <li key={t.id} className="flex items-start justify-between gap-3 py-2.5">
                  <div className="min-w-0">
                    <p className="truncate text-[13px] font-medium text-[#0A0A0A]">{t.title}</p>
                    <p className="line-clamp-2 text-[12px] text-[#737373]">{t.body}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void remove(t.id)}
                    className="bz-btn-icon shrink-0 text-[#DC2626]"
                    aria-label={isTr ? `${t.title} şablonunu sil` : `Delete ${t.title}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </Modal>
      )}
    </>
  );
}
