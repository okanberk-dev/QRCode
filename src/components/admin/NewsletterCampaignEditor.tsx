'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Calendar, Send, Save, Eye, ArrowLeft, Mail, Trash2 } from 'lucide-react';
import { AlertBanner, Badge, PageHeader, useConfirmDialog } from '@/components/ui';
import Link from 'next/link';

interface BlogPostOption {
  id: string;
  title: string;
  locale: string;
  slug: string;
  isActive: boolean;
}

export interface CampaignFormValue {
  id?: string;
  title: string;
  intro: string;
  postIds: string[];
  locale: 'tr' | 'en' | 'both';
  status: 'draft' | 'scheduled' | 'sent' | 'sending' | 'failed';
  scheduledAt?: string | null;
  sentAt?: string | null;
  sentCount?: number | null;
  failedCount?: number | null;
}

const DEFAULT_VALUE: CampaignFormValue = {
  title: '',
  intro: '',
  postIds: [],
  locale: 'tr',
  status: 'draft',
  scheduledAt: null,
};

const MAX_POSTS = 6;

export default function NewsletterCampaignEditor({ initial }: { initial?: CampaignFormValue }) {
  const router = useRouter();
  const isEdit = Boolean(initial?.id);
  const isImmutable = initial?.status === 'sent' || initial?.status === 'sending';

  const [value, setValue] = useState<CampaignFormValue>(initial ?? DEFAULT_VALUE);
  const [posts, setPosts] = useState<BlogPostOption[]>([]);
  const [postsLoading, setPostsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [sendingNow, setSendingNow] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmDialog, askConfirm] = useConfirmDialog();
  const [info, setInfo] = useState<string | null>(null);

  // Mode: draft | scheduled | now (now is a UI-only mode that triggers send
  // immediately after save via the manual trigger endpoint).
  const initialMode: 'draft' | 'scheduled' | 'now' = initial?.status === 'scheduled' ? 'scheduled' : 'draft';
  const [mode, setMode] = useState<'draft' | 'scheduled' | 'now'>(initialMode);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch('/api/admin/blog?limit=100');
        const body = await res.json();
        if (!alive) return;
        const list: BlogPostOption[] = (body.data ?? body.posts ?? []).map((p: { id: string; title: string; locale: string; slug: string; isActive?: boolean }) => ({
          id: p.id,
          title: p.title,
          locale: p.locale,
          slug: p.slug,
          isActive: p.isActive ?? true,
        }));
        setPosts(list.filter((p) => p.isActive));
      } catch {
        // Fallback empty list — admin can still author title/intro and
        // attach posts later.
      } finally {
        if (alive) setPostsLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const filteredPosts = useMemo(() => {
    if (value.locale === 'both') return posts;
    return posts.filter((p) => p.locale === value.locale);
  }, [posts, value.locale]);

  const togglePost = (id: string) => {
    setValue((v) => {
      if (v.postIds.includes(id)) {
        return { ...v, postIds: v.postIds.filter((p) => p !== id) };
      }
      if (v.postIds.length >= MAX_POSTS) return v;
      return { ...v, postIds: [...v.postIds, id] };
    });
  };

  const buildPayload = () => {
    const status: 'draft' | 'scheduled' = mode === 'now' ? 'draft' : mode;
    const scheduledAt = mode === 'scheduled' ? value.scheduledAt : null;
    return {
      title: value.title.trim(),
      intro: value.intro.trim(),
      postIds: value.postIds,
      locale: value.locale,
      status,
      scheduledAt,
    };
  };

  const onSave = async () => {
    setError(null);
    setInfo(null);
    setSaving(true);
    try {
      const payload = buildPayload();
      const url = isEdit ? `/api/admin/newsletters/campaigns/${initial!.id}` : '/api/admin/newsletters/campaigns';
      const method = isEdit ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Kayıt başarısız');

      // If "Şimdi gönder" mode, fire trigger right after save.
      if (mode === 'now') {
        setSendingNow(true);
        const created = body.campaign;
        const triggerRes = await fetch('/api/admin/newsletters/trigger', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campaignId: created.id }),
        });
        const triggerBody = await triggerRes.json();
        setSendingNow(false);
        if (!triggerRes.ok) throw new Error(triggerBody.error || 'Gönderim başarısız');
        setInfo(`Bülten gönderildi · ${triggerBody.sent ?? 0} alıcı · ${triggerBody.failed ?? 0} başarısız`);
        // Redirect to list after a brief moment so admin sees the result.
        setTimeout(() => router.push('/admin/newsletters/campaigns'), 1500);
        return;
      }

      router.push('/admin/newsletters/campaigns');
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  const onDelete = () => {
    if (!isEdit || !initial?.id) return;
    askConfirm({
      title: 'Taslak kampanyayı sil',
      body: 'Bu taslak kampanyayı kalıcı olarak silmek istediğine emin misin? İşlem geri alınamaz.',
      confirmLabel: 'Sil',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: async () => {
        setDeleting(true);
        try {
          const res = await fetch(`/api/admin/newsletters/campaigns/${initial.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const body = await res.json().catch(() => ({}));
            throw new Error(body.error || 'Silme başarısız');
          }
          router.push('/admin/newsletters/campaigns');
        } catch (e) {
          setError((e as Error).message);
          setDeleting(false);
        }
      },
    });
  };

  const onPreview = () => {
    if (!value.postIds.length) {
      setError('Önizleme için en az bir blog yazısı seç');
      return;
    }
    const params = new URLSearchParams({
      template: 'newsletter',
      locale: value.locale === 'both' ? 'tr' : value.locale,
      title: value.title,
      intro: value.intro,
      postIds: value.postIds.join(','),
    });
    window.open(`/api/dev/email-preview?${params.toString()}`, '_blank');
  };

  const onSendTest = async () => {
    if (!value.postIds.length) {
      setError('Test için en az bir blog yazısı seç');
      return;
    }
    setError(null);
    setInfo('Test mail gönderiliyor…');
    try {
      const res = await fetch('/api/admin/dev/send-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template: 'newsletter',
          locale: value.locale === 'both' ? 'tr' : value.locale,
          customTitle: value.title,
          customIntro: value.intro,
          postIds: value.postIds,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || 'Gönderim başarısız');
      setInfo('Test mail kendi adresine düştü.');
    } catch (e) {
      setError((e as Error).message);
      setInfo(null);
    }
  };

  const canSubmit = value.title.trim().length > 0 && value.intro.trim().length > 0 && value.postIds.length > 0 && !saving && !isImmutable;

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <Link
        href="/admin/newsletters/campaigns"
        className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#737373] hover:text-[#0A0A0A] transition-colors"
      >
        <ArrowLeft size={12} strokeWidth={2} />
        Kampanyalara dön
      </Link>

      <PageHeader
        eyebrow="BÜLTEN KAMPANYASI"
        title={isEdit ? 'Kampanyayı düzenle' : 'Yeni kampanya'}
        description="Aylık bülten için özel başlık + intro + blog yazıları. Kaydedip taslakta tutabilir, ileri tarihe zamanlayabilir veya hemen gönderebilirsin."
        actions={
          isEdit && initial?.status ? (
            <Badge kind={initial.status === 'sent' ? 'ok' : initial.status === 'sending' ? 'warn' : 'ghost'}>
              Durum: {initial.status}
            </Badge>
          ) : null
        }
      />

      {error && <AlertBanner kind="danger">{error}</AlertBanner>}
      {info && <AlertBanner kind="lime">{info}</AlertBanner>}

      {isImmutable && (
        <div className="rounded-2xl border border-[#EDEDED] bg-[#FAFAFA] p-4 text-xs text-[#525252]">
          Bu kampanya {initial?.status === 'sent' ? 'gönderildi' : 'gönderiliyor'} — düzenlenemez. Yeni bir kampanya oluştur.
        </div>
      )}

      <div className="space-y-5 rounded-2xl border border-[#EDEDED] bg-white p-5 sm:p-7">
        <div>
          <label className="pulse-eyebrow text-[#737373]">Başlık</label>
          <input
            type="text"
            value={value.title}
            onChange={(e) => setValue((v) => ({ ...v, title: e.target.value }))}
            disabled={isImmutable}
            maxLength={200}
            placeholder="Sessiz misafiri duyabilmek sanatı"
            className="mt-1.5 w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-[15px] text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E] disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-[#9CA3AF]">{value.title.length} / 200</p>
        </div>

        <div>
          <label className="pulse-eyebrow text-[#737373]">Intro</label>
          <textarea
            value={value.intro}
            onChange={(e) => setValue((v) => ({ ...v, intro: e.target.value }))}
            disabled={isImmutable}
            rows={4}
            maxLength={2000}
            placeholder="Bu sayıda neler var…"
            className="mt-1.5 w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-[14px] text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E] disabled:opacity-60"
          />
          <p className="mt-1 text-[11px] text-[#9CA3AF]">{value.intro.length} / 2000</p>
        </div>

        <div>
          <label className="pulse-eyebrow text-[#737373]">Hedef dil</label>
          <div className="mt-1.5 inline-flex rounded-xl border border-[#EDEDED] bg-[#FAFAFA] p-1">
            {(['tr', 'en', 'both'] as const).map((opt) => (
              <button
                key={opt}
                type="button"
                disabled={isImmutable}
                onClick={() => setValue((v) => ({ ...v, locale: opt, postIds: opt === 'both' ? v.postIds : v.postIds.filter((id) => posts.find((p) => p.id === id)?.locale === opt) }))}
                className={`rounded-lg px-3 py-1.5 pulse-eyebrow transition-all disabled:opacity-60 ${
                  value.locale === opt ? 'bg-[#0A0A0A] text-white shadow-sm' : 'text-[#1A1A1A] hover:text-[#0A0A0A]'
                }`}
              >
                {opt === 'tr' ? 'Türkçe' : opt === 'en' ? 'English' : 'İkisi'}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-baseline justify-between">
            <label className="pulse-eyebrow text-[#737373]">Blog yazıları (en fazla {MAX_POSTS})</label>
            <span className="text-[11px] text-[#9CA3AF]">{value.postIds.length} / {MAX_POSTS}</span>
          </div>
          {postsLoading ? (
            <div className="mt-3 flex items-center gap-2 text-xs text-[#737373]">
              <Loader2 size={14} className="animate-spin" /> Blog yazıları yükleniyor…
            </div>
          ) : filteredPosts.length === 0 ? (
            <p className="mt-3 text-xs text-[#737373]">Bu dilde aktif blog yazısı yok.</p>
          ) : (
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {filteredPosts.map((p) => {
                const checked = value.postIds.includes(p.id);
                const disabled = !checked && value.postIds.length >= MAX_POSTS;
                return (
                  <label
                    key={p.id}
                    className={`flex cursor-pointer items-start gap-3 rounded-xl border px-4 py-3 transition-colors ${
                      checked ? 'border-[#C6F24E] bg-[#EAF9B8]/40' : 'border-[#EDEDED] bg-white hover:bg-[#FAFAFA]'
                    } ${disabled || isImmutable ? 'cursor-not-allowed opacity-50' : ''}`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      disabled={disabled || isImmutable}
                      onChange={() => togglePost(p.id)}
                      className="mt-1 h-4 w-4 rounded border-[#EDEDED] text-[#0A0A0A] focus:ring-[#C6F24E]"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[#0A0A0A]">{p.title}</p>
                      <p className="pulse-eyebrow mt-0.5 text-[#737373]">{p.locale.toUpperCase()} · {p.slug}</p>
                    </div>
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div>
          <label className="pulse-eyebrow text-[#737373]">Gönderim modu</label>
          <div className="mt-1.5 grid gap-2 sm:grid-cols-3">
            {([
              { v: 'draft' as const, l: 'Taslak', d: 'Sadece kaydet, gönderme' },
              { v: 'scheduled' as const, l: 'Zamanla', d: 'Belirli tarihte gönder' },
              { v: 'now' as const, l: 'Şimdi gönder', d: 'Hemen gönder + sent' },
            ] as const).map((opt) => (
              <button
                key={opt.v}
                type="button"
                disabled={isImmutable}
                onClick={() => setMode(opt.v)}
                className={`rounded-xl border p-3 text-left transition-all disabled:opacity-60 ${
                  mode === opt.v
                    ? 'border-[#0A0A0A] bg-[#0A0A0A] text-white'
                    : 'border-[#EDEDED] bg-white text-[#0A0A0A] hover:bg-[#FAFAFA]'
                }`}
              >
                <p className="text-sm font-semibold">{opt.l}</p>
                <p className={`mt-0.5 text-[11px] ${mode === opt.v ? 'text-white/80' : 'text-[#737373]'}`}>{opt.d}</p>
              </button>
            ))}
          </div>
          {mode === 'scheduled' && (
            <div className="mt-3">
              <label className="pulse-eyebrow text-[#737373]">Tarih</label>
              <div className="relative mt-1.5">
                <Calendar size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#6B7280]" />
                <input
                  type="datetime-local"
                  value={value.scheduledAt ?? ''}
                  onChange={(e) => setValue((v) => ({ ...v, scheduledAt: e.target.value || null }))}
                  disabled={isImmutable}
                  className="w-full rounded-xl border border-[#EDEDED] bg-white py-2 pl-9 pr-3 text-xs font-medium text-[#0A0A0A] outline-none focus:ring-2 focus:ring-[#C6F24E]"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[#EDEDED] bg-white p-4 sm:p-5">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={onPreview}
            disabled={isImmutable}
            className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
          >
            <Eye size={14} /> Önizle
          </button>
          <button
            type="button"
            onClick={onSendTest}
            disabled={isImmutable}
            className="inline-flex items-center gap-2 rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#FAFAFA] active:scale-95 disabled:opacity-50"
          >
            <Mail size={14} /> Test mail at
          </button>
          {isEdit && initial?.status === 'draft' && (
            <button
              type="button"
              onClick={onDelete}
              disabled={deleting}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-white px-4 py-2.5 text-xs font-semibold text-red-700 hover:bg-red-50 active:scale-95 disabled:opacity-50"
            >
              {deleting ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              Sil
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={!canSubmit}
          className="inline-flex items-center gap-2 rounded-xl bg-[#C6F24E] px-5 py-2.5 text-xs font-semibold text-[#0A0A0A] hover:bg-[#A8D62E] active:scale-95 disabled:opacity-50"
        >
          {saving || sendingNow ? <Loader2 size={14} className="animate-spin" /> : mode === 'now' ? <Send size={14} /> : <Save size={14} />}
          {mode === 'now' ? 'Şimdi gönder' : mode === 'scheduled' ? 'Zamanla' : 'Taslağı kaydet'}
        </button>
      </div>
      {confirmDialog}
    </div>
  );
}
