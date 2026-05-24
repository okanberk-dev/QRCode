'use client';

// CLAUDE.md §42 — Admin (superadmin) template detay + soru builder.
//
// Owner panelinin `AuditEditClient` paterni admin için sadeleştirildi:
//   • Meta düzenleme (title, description, sektör, kategori, scoringMode,
//     passingScore, locale) — basit alan grid'i.
//   • Soru CRUD: `AuditQuestionEditor` modal reuse (locale prop'lu,
//     restaurant agnostic). Sıralama yukarı/aşağı butonlarıyla
//     (DnD admin için overkill — Phase 6 backlog).
//   • Yayın toggle: backend endpoint `/api/admin/audits/templates/[id]/
//     publish` reuse. NO_QUESTIONS error code yakalanır → AlertBanner.
//
// Endpoint kontrat:
//   GET   /api/admin/audits/templates/[id]            → template + questions
//   PATCH /api/admin/audits/templates/[id]            → meta + questions
//                                                       (questions: array
//                                                       null = sorulara
//                                                       dokunma, array =
//                                                       full replace)
//   POST  /api/admin/audits/templates/[id]/publish    → toggle
//   DELETE/api/admin/audits/templates/[id]            → hard delete

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ClipboardCheck,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  Field,
  PageHeader,
  useConfirmDialog,
} from '@/components/ui';
import AuditQuestionEditor from '@/components/audits/AuditQuestionEditor';
import { type AuditQuestionDraft } from '@/lib/audits/wizard-state';
import {
  parseAuditErrorResponse,
  summarizeAuditError,
} from '@/lib/audits/error-humanizer';
import {
  AUDIT_LOCALES,
  AUDIT_SCORING_MODES,
  AUDIT_SECTORS,
  type AuditScoringMode,
  type AuditSector,
} from '@/lib/audits/types';

const SECTOR_LABEL: Record<AuditSector, string> = {
  food: 'Yeme & İçme',
  hotel: 'Konaklama',
  retail: 'Perakende',
  health: 'Sağlık',
  beauty: 'Güzellik',
  other: 'Diğer',
};

const SECTOR_BADGE: Record<AuditSector, BadgeKind> = {
  food: 'lime',
  hotel: 'info',
  retail: 'warn',
  health: 'ok',
  beauty: 'ghost',
  other: 'ghost',
};

const SCORING_LABEL: Record<AuditScoringMode, string> = {
  percentage: 'Yüzde',
  weighted: 'Ağırlıklı',
  pass_fail: 'Geçti / Kaldı',
};

const QUESTION_TYPE_LABEL: Record<string, string> = {
  single: 'Tek seçim',
  multi: 'Çoklu seçim',
  scale: 'Ölçek',
  text: 'Metin',
  yes_no: 'Evet/Hayır',
  file: 'Dosya',
};

interface CategoryRef {
  id: string;
  slug: string;
  labelTr: string;
  labelEn: string;
}

interface TemplateData {
  id: string;
  restaurantId: string | null;
  categoryId: string | null;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: 'tr' | 'en';
  isPublished: boolean;
  isActive: boolean;
  questions: Array<AuditQuestionDraft>;
  _count: { responses: number; assignments: number };
}

interface Props {
  templateId: string;
}

function randomId(): string {
  return `q_${Math.random().toString(36).slice(2, 10)}`;
}

export default function AdminTemplateDetailClient({ templateId }: Props) {
  const router = useRouter();
  const [confirmDialog, askConfirm] = useConfirmDialog();

  const [data, setData] = useState<TemplateData | null>(null);
  const [categories, setCategories] = useState<CategoryRef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // Local edit state — fetch sonrası `data`'dan seed edilir, save sonrası
  // backend response ile reset.
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [sector, setSector] = useState<AuditSector>('food');
  const [categoryId, setCategoryId] = useState<string>('');
  const [scoringMode, setScoringMode] = useState<AuditScoringMode>('percentage');
  const [passingScore, setPassingScore] = useState<string>('');
  const [locale, setLocale] = useState<'tr' | 'en'>('tr');
  const [questions, setQuestions] = useState<AuditQuestionDraft[]>([]);

  // Question editor modal state
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<AuditQuestionDraft | null>(null);

  const isRestaurantScoped = data?.restaurantId !== null;

  const seedFromTemplate = useCallback((tpl: TemplateData) => {
    setTitle(tpl.title);
    setDescription(tpl.description || '');
    setSector(tpl.sector);
    setCategoryId(tpl.categoryId || '');
    setScoringMode(tpl.scoringMode);
    setPassingScore(tpl.passingScore != null ? String(tpl.passingScore) : '');
    setLocale(tpl.locale);
    setQuestions(tpl.questions.map((q, i) => ({ ...q, sortOrder: i })));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audits/templates/${templateId}`, { cache: 'no-store' });
      if (!res.ok) {
        if (res.status === 404) {
          setError('Şablon bulunamadı');
          return;
        }
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setError(summarizeAuditError(parsed));
        return;
      }
      const json = await res.json();
      const tpl: TemplateData = json.data;
      setData(tpl);
      seedFromTemplate(tpl);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setLoading(false);
    }
  }, [templateId, seedFromTemplate]);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/audits/categories', { cache: 'no-store' });
      if (!res.ok) return;
      const json = await res.json();
      setCategories(json.data || []);
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    load();
    loadCategories();
  }, [load, loadCategories]);

  const filteredCategories = useMemo(
    () => categories.filter((c) => c.slug.startsWith(`${sector}-`) || true),
    [categories, sector],
  );

  const moveQuestion = (index: number, dir: -1 | 1) => {
    const next = [...questions];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setQuestions(next.map((q, i) => ({ ...q, sortOrder: i })));
  };

  const openCreate = () => {
    setEditingQuestion({
      id: randomId(),
      type: 'single',
      prompt: '',
      helpText: '',
      options: ['Seçenek 1', 'Seçenek 2'],
      correctAnswer: null,
      weight: 1,
      isRequired: true,
      sortOrder: questions.length,
    });
    setEditorOpen(true);
  };

  const openEdit = (q: AuditQuestionDraft) => {
    setEditingQuestion(q);
    setEditorOpen(true);
  };

  const handleSaveQuestion = (q: AuditQuestionDraft) => {
    setQuestions((prev) => {
      const found = prev.findIndex((p) => p.id === q.id);
      if (found >= 0) {
        const next = [...prev];
        next[found] = q;
        return next;
      }
      return [...prev, { ...q, sortOrder: prev.length }];
    });
    setEditorOpen(false);
    setEditingQuestion(null);
  };

  const handleDeleteQuestion = (id: string) => {
    askConfirm({
      title: 'Soruyu sil',
      body: 'Bu soru listeden kaldırılacak. Kaydetmediğin sürece geri alabilirsin.',
      confirmLabel: 'Sil',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: () => {
        setQuestions((prev) => prev.filter((q) => q.id !== id).map((q, i) => ({ ...q, sortOrder: i })));
      },
    });
  };

  const handleSave = async () => {
    if (!title.trim()) {
      setError('Başlık zorunlu');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const body: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        sector,
        categoryId: categoryId || null,
        scoringMode,
        locale,
        questions: questions.map((q, i) => ({
          type: q.type,
          prompt: q.prompt,
          helpText: q.helpText || null,
          options: q.options ?? null,
          correctAnswer: q.correctAnswer ?? null,
          weight: q.weight,
          isRequired: q.isRequired,
          sortOrder: i,
        })),
      };
      const pass = Number(passingScore);
      if (Number.isFinite(pass) && pass >= 0 && pass <= 100) {
        body.passingScore = pass;
      } else if (passingScore.trim() === '') {
        body.passingScore = null;
      }

      const res = await fetch(`/api/admin/audits/templates/${templateId}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setError(summarizeAuditError(parsed));
        return;
      }
      setNotice('Şablon güncellendi.');
      await load();
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  };

  const handlePublishToggle = async () => {
    if (!data) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/audits/templates/${data.id}/publish`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ isPublished: !data.isPublished }),
      });
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setError(summarizeAuditError(parsed));
        return;
      }
      setNotice(data.isPublished ? 'Yayından kaldırıldı.' : 'Yayınlandı.');
      await load();
      setTimeout(() => setNotice(null), 3500);
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  };

  const doDeleteTemplate = async () => {
    if (!data) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/audits/templates/${data.id}`, { method: 'DELETE' });
      if (!res.ok) {
        const parsed = await parseAuditErrorResponse(res, 'tr');
        setError(summarizeAuditError(parsed));
        return;
      }
      router.push('/admin/audits/templates');
    } catch {
      setError('Bağlantı hatası');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    if (!data) return;
    askConfirm({
      title: `"${data.title}" silinecek`,
      body: 'Şablon, soruları, atamaları ve yanıtlar cascade silinir. Bu işlem geri alınamaz.',
      confirmLabel: 'Kalıcı olarak sil',
      cancelLabel: 'Vazgeç',
      variant: 'danger',
      onConfirm: doDeleteTemplate,
    });
  };

  // §40.10 clean slate — skeleton render kaldırıldı; data gelene kadar null.
  if (loading && !data) return null;

  if (!data) {
    return (
      <div className="mx-auto max-w-[1440px] px-4 sm:px-7 py-6 lg:py-8">
        {error && <AlertBanner kind="danger">{error}</AlertBanner>}
        <EmptyState
          icon={<ClipboardCheck size={20} />}
          title="Şablon bulunamadı"
          body="Silinmiş veya başka admin tarafından kaldırılmış olabilir."
          action={
            <Link href="/admin/audits/templates" className="bz-btn-primary">
              <ArrowLeft size={14} /> Listeye dön
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1440px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <PageHeader
        eyebrow="SUPERADMIN · DENETİM ŞABLONU"
        eyebrowColor="#C6F24E"
        title={data.title || 'Adsız şablon'}
        description={
          isRestaurantScoped
            ? 'Restoran-özel şablon — admin sadece görüntüleme yapabilir, düzenleme owner panelden açılır.'
            : 'Sorular + meta admin tarafından düzenlenebilir. Yayın için en az 1 soru zorunlu.'
        }
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/audits/templates" className="bz-btn-ghost">
              <ArrowLeft size={14} /> Liste
            </Link>
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={handlePublishToggle}
              disabled={saving || isRestaurantScoped}
              title={isRestaurantScoped ? 'Restoran-özel şablon admin endpoint üzerinden yönetilmez' : ''}
            >
              {saving ? (
                <Loader2 size={14} className="animate-spin" />
              ) : data.isPublished ? (
                <>
                  <EyeOff size={14} /> Yayından kaldır
                </>
              ) : (
                <>
                  <Eye size={14} /> Yayınla
                </>
              )}
            </button>
          </div>
        }
      />

      {error && (
        <AlertBanner kind="danger" onDismiss={() => setError(null)}>
          {error}
        </AlertBanner>
      )}
      {notice && (
        <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
          {notice}
        </AlertBanner>
      )}

      {/* Meta info grid */}
      <div className="bz-card p-4 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge kind={SECTOR_BADGE[data.sector]}>{SECTOR_LABEL[data.sector]}</Badge>
          {data.isPublished ? <Badge kind="ok">Yayında</Badge> : <Badge kind="ghost">Taslak</Badge>}
          {isRestaurantScoped && <Badge kind="warn">Restoran-özel</Badge>}
          <span className="text-[12px] text-[#737373]">
            {data._count.responses} yanıt · {data._count.assignments} atama
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Başlık" required>
            <input
              className="bz-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={saving || isRestaurantScoped}
            />
          </Field>
          <Field label="Dil">
            <select
              className="bz-input"
              value={locale}
              onChange={(e) => setLocale(e.target.value as 'tr' | 'en')}
              disabled={saving || isRestaurantScoped}
            >
              {AUDIT_LOCALES.map((l) => (
                <option key={l} value={l}>
                  {l === 'tr' ? 'Türkçe' : 'English'}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Açıklama">
          <textarea
            className="bz-input min-h-[80px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={saving || isRestaurantScoped}
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Sektör">
            <select
              className="bz-input"
              value={sector}
              onChange={(e) => setSector(e.target.value as AuditSector)}
              disabled={saving || isRestaurantScoped}
            >
              {AUDIT_SECTORS.map((s) => (
                <option key={s} value={s}>
                  {SECTOR_LABEL[s]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Kategori">
            <select
              className="bz-input"
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              disabled={saving || isRestaurantScoped}
            >
              <option value="">— Yok —</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.labelTr}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Puanlama">
            <select
              className="bz-input"
              value={scoringMode}
              onChange={(e) => setScoringMode(e.target.value as AuditScoringMode)}
              disabled={saving || isRestaurantScoped}
            >
              {AUDIT_SCORING_MODES.map((m) => (
                <option key={m} value={m}>
                  {SCORING_LABEL[m]}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label="Geçme puanı (0-100, boş = sadece skor)" hint="Pass/Fail modunda zorunlu">
          <input
            className="bz-input"
            type="number"
            min={0}
            max={100}
            value={passingScore}
            onChange={(e) => setPassingScore(e.target.value)}
            disabled={saving || isRestaurantScoped}
          />
        </Field>
      </div>

      {/* Question builder */}
      <div className="bz-card p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="bz-h-tight text-[16px]">
            Sorular <span className="text-[13px] text-[#737373] font-normal">({questions.length})</span>
          </h2>
          {!isRestaurantScoped && (
            <button type="button" className="bz-btn-ghost" onClick={openCreate} disabled={saving}>
              <Plus size={14} /> Soru ekle
            </button>
          )}
        </div>

        {questions.length === 0 ? (
          <EmptyState
            title="Henüz soru yok"
            body="Yayınlamak için en az 1 soru ekle."
            action={
              !isRestaurantScoped && (
                <button type="button" className="bz-btn-primary" onClick={openCreate} disabled={saving}>
                  <Plus size={14} /> İlk soruyu ekle
                </button>
              )
            }
          />
        ) : (
          <ol className="space-y-2">
            {questions.map((q, i) => (
              <li
                key={q.id}
                className="bz-card-soft p-3 flex items-start gap-3"
              >
                <span className="bz-mono text-[12px] text-[#737373] mt-0.5 min-w-[24px]">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <Badge kind="ghost">{QUESTION_TYPE_LABEL[q.type] || q.type}</Badge>
                    {q.isRequired && <Badge kind="warn">Zorunlu</Badge>}
                    {q.weight > 1 && <Badge kind="info">×{q.weight}</Badge>}
                  </div>
                  <p className="text-[14px] text-[#0A0A0A]">{q.prompt}</p>
                  {q.helpText && (
                    <p className="text-[12px] text-[#737373] mt-1">{q.helpText}</p>
                  )}
                  {q.options && q.options.length > 0 && (
                    <ul className="mt-1 text-[12px] text-[#525252] list-disc list-inside">
                      {q.options.slice(0, 4).map((opt, oi) => (
                        <li key={oi}>{opt}</li>
                      ))}
                      {q.options.length > 4 && (
                        <li className="text-[#A3A3A3]">+{q.options.length - 4} daha</li>
                      )}
                    </ul>
                  )}
                </div>
                {!isRestaurantScoped && (
                  <div className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      className="bz-btn-icon"
                      onClick={() => moveQuestion(i, -1)}
                      disabled={saving || i === 0}
                      aria-label="Yukarı taşı"
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button
                      type="button"
                      className="bz-btn-icon"
                      onClick={() => moveQuestion(i, 1)}
                      disabled={saving || i === questions.length - 1}
                      aria-label="Aşağı taşı"
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button
                      type="button"
                      className="bz-btn-icon"
                      onClick={() => openEdit(q)}
                      disabled={saving}
                      aria-label="Düzenle"
                    >
                      <Pencil size={14} />
                    </button>
                    <button
                      type="button"
                      className="bz-btn-icon"
                      onClick={() => handleDeleteQuestion(q.id)}
                      disabled={saving}
                      aria-label="Sil"
                    >
                      <Trash2 size={14} className="text-[#991B1B]" />
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>

      {/* Action bar */}
      {!isRestaurantScoped && (
        <div className="flex flex-wrap justify-between gap-2 sticky bottom-0 bg-white border-t border-[#EDEDED] pt-3 pb-2 -mx-4 px-4 sm:-mx-7 sm:px-7">
          <button
            type="button"
            className="bz-btn-ghost text-[#991B1B]"
            onClick={handleDelete}
            disabled={saving}
          >
            <Trash2 size={14} /> Şablonu sil
          </button>
          <button type="button" className="bz-btn-primary" onClick={handleSave} disabled={saving || !title.trim()}>
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            Kaydet
          </button>
        </div>
      )}

      <AuditQuestionEditor
        locale="tr"
        open={editorOpen}
        draft={editingQuestion}
        onClose={() => {
          setEditorOpen(false);
          setEditingQuestion(null);
        }}
        onSave={handleSaveQuestion}
      />

      {/* Destructive confirm modal — CLAUDE.md §23.3.1 unification */}
      {confirmDialog}
    </div>
  );
}
