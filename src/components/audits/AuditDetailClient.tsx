'use client';

// CLAUDE.md §42 Phase 2 — Owner audit detail page.
// Şablon meta + sorular listesi + atamalar listesi + yayın toggle.
// Soru/şablon düzenleme şu an wizard üzerinden (yeniden gönderim) yapılıyor —
// inline question editing Phase 2.5 backlog (3+ tekrarlanır gibi durur,
// CLAUDE.md §7 paterni).

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  ClipboardCheck,
  Copy as CopyIcon,
  Eye,
  EyeOff,
  Link2,
  Loader2,
  Plus,
  Trash2,
  User as UserIcon,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  type BadgeKind,
  EmptyState,
  PageHeader,
  useConfirmDialog,
} from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import type {
  AuditAssigneeType,
  AuditAssignmentStatus,
  AuditQuestionType,
  AuditScoringMode,
  AuditSector,
} from '@/lib/audits/types';
import AuditAssignmentModal from './AuditAssignmentModal';

interface TeamMemberRef {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface TemplateDetail {
  id: string;
  restaurantId: string;
  title: string;
  description: string | null;
  sector: AuditSector;
  scoringMode: AuditScoringMode;
  passingScore: number | null;
  locale: string;
  isPublished: boolean;
  isActive: boolean;
  category: { id: string; labelTr: string; labelEn: string } | null;
  questions: Array<{
    id: string;
    type: AuditQuestionType;
    prompt: string;
    options: unknown;
    weight: number;
    isRequired: boolean;
    sortOrder: number;
  }>;
  _count: { assignments: number; responses: number };
}

interface AssignmentRow {
  id: string;
  assigneeType: AuditAssigneeType;
  assigneeName: string | null;
  assigneeEmail: string | null;
  assigneePhone: string | null;
  assigneeTeamMemberId: string | null;
  dueAt: string | null;
  recurrence: string;
  status: AuditAssignmentStatus;
  token: string | null;
  tokenRevoked: boolean;
  internalNote: string | null;
  createdAt: string;
  _count: { responses: number };
}

interface Props {
  locale: Locale;
  template: TemplateDetail;
  teamMembers: TeamMemberRef[];
  appUrl: string;
}

const STATUS_BADGE: Record<AuditAssignmentStatus, BadgeKind> = {
  pending: 'ghost',
  sent: 'info',
  in_progress: 'warn',
  completed: 'ok',
  overdue: 'danger',
  cancelled: 'ghost',
};

const ASSIGNEE_LABEL_TR: Record<AuditAssigneeType, string> = {
  team_member: 'Ekip üyesi',
  candidate: 'Aday',
  link: 'Public link',
  self: 'Kendim',
};
const ASSIGNEE_LABEL_EN: Record<AuditAssigneeType, string> = {
  team_member: 'Team member',
  candidate: 'Candidate',
  link: 'Public link',
  self: 'Myself',
};

const QUESTION_TYPE_LABEL: Record<AuditQuestionType, { tr: string; en: string }> = {
  single: { tr: 'Tek seçim', en: 'Single' },
  multi: { tr: 'Çoklu', en: 'Multi' },
  scale: { tr: 'Ölçek', en: 'Scale' },
  text: { tr: 'Metin', en: 'Text' },
  yes_no: { tr: 'Evet/Hayır', en: 'Yes/No' },
  file: { tr: 'Dosya', en: 'File' },
};

export default function AuditDetailClient({ locale, template, teamMembers, appUrl }: Props) {
  const t = getTranslations(locale);
  const router = useRouter();
  const assigneeLabel = locale === 'tr' ? ASSIGNEE_LABEL_TR : ASSIGNEE_LABEL_EN;

  const [assignments, setAssignments] = useState<AssignmentRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [confirmEl, askConfirm] = useConfirmDialog();

  const loadAssignments = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${template.restaurantId}/audits/assignments?templateId=${template.id}`,
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || (locale === 'tr' ? 'Yükleme başarısız' : 'Failed to load'));
        return;
      }
      const json = await res.json();
      setAssignments(json.data);
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setLoading(false);
    }
  }, [template.restaurantId, template.id, locale]);

  useEffect(() => {
    loadAssignments();
  }, [loadAssignments]);

  async function togglePublish() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/restaurants/${template.restaurantId}/audits/templates/${template.id}`,
        {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ publish: !template.isPublished }),
        },
      );
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || (locale === 'tr' ? 'İşlem başarısız' : 'Action failed'));
        return;
      }
      // Refresh server data — Next router refresh.
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  function copyLink(token: string) {
    const url = `${appUrl}/audits/${token}`;
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard
        .writeText(url)
        .then(() => {
          setNotice(t.audits_link_copied);
          setTimeout(() => setNotice(null), 2500);
        })
        .catch(() => {
          setError(locale === 'tr' ? 'Kopyalama başarısız' : 'Copy failed');
        });
    }
  }

  function handleRevoke(asg: AssignmentRow) {
    askConfirm({
      title: t.audits_detail_revoke,
      body:
        locale === 'tr'
          ? 'Bu atama iptal edilecek. Public link erişilemez olur.'
          : 'This assignment will be cancelled. The public link becomes inaccessible.',
      variant: 'danger',
      confirmLabel: t.audits_detail_revoke,
      cancelLabel: locale === 'tr' ? 'Vazgeç' : 'Cancel',
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/restaurants/${template.restaurantId}/audits/assignments/${asg.id}`,
            { method: 'DELETE' },
          );
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j.error || (locale === 'tr' ? 'İptal başarısız' : 'Revoke failed'));
            return;
          }
          setNotice(locale === 'tr' ? 'Atama iptal edildi' : 'Assignment revoked');
          await loadAssignments();
          setTimeout(() => setNotice(null), 3000);
        } catch {
          setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
        }
      },
    });
  }

  async function handleDeleteTemplate() {
    askConfirm({
      title: locale === 'tr' ? 'Şablonu sil' : 'Delete template',
      body:
        locale === 'tr'
          ? 'Yanıt varsa şablon arşivlenir (history korunur). Yanıt yoksa kalıcı silinir.'
          : 'If responses exist, the template is archived (history preserved). Otherwise permanently deleted.',
      variant: 'danger',
      confirmLabel: locale === 'tr' ? 'Sil' : 'Delete',
      cancelLabel: locale === 'tr' ? 'Vazgeç' : 'Cancel',
      onConfirm: async () => {
        try {
          const res = await fetch(
            `/api/restaurants/${template.restaurantId}/audits/templates/${template.id}`,
            { method: 'DELETE' },
          );
          if (!res.ok) {
            const j = await res.json().catch(() => ({}));
            setError(j.error || (locale === 'tr' ? 'Silme başarısız' : 'Delete failed'));
            return;
          }
          router.push(`/${locale}/dashboard/audits`);
        } catch {
          setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
        }
      },
    });
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-4 px-4 sm:px-7 py-6 lg:py-8">
      <div>
        <Link
          href={`/${locale}/dashboard/audits`}
          className="text-[12px] text-[#737373] hover:text-[#0A0A0A] inline-flex items-center gap-1"
        >
          <ArrowLeft size={12} /> {locale === 'tr' ? 'Tüm denetimler' : 'All audits'}
        </Link>
      </div>

      <PageHeader
        eyebrow={locale === 'tr' ? 'DENETİM DETAYI' : 'AUDIT DETAIL'}
        eyebrowColor="#C6F24E"
        title={template.title}
        description={template.description ?? undefined}
        actions={
          <div className="flex gap-2">
            <button
              type="button"
              className="bz-btn-ghost"
              onClick={togglePublish}
              disabled={busy}
            >
              {busy ? (
                <Loader2 size={14} className="animate-spin" />
              ) : template.isPublished ? (
                <EyeOff size={14} />
              ) : (
                <Eye size={14} />
              )}
              {template.isPublished ? t.audits_admin_unpublish : t.audits_admin_publish}
            </button>
            <button type="button" className="bz-btn-icon" onClick={handleDeleteTemplate} aria-label={locale === 'tr' ? 'Sil' : 'Delete'}>
              <Trash2 size={14} />
            </button>
          </div>
        }
      />

      {error && <AlertBanner kind="danger" onDismiss={() => setError(null)}>{error}</AlertBanner>}
      {notice && <AlertBanner kind="success" onDismiss={() => setNotice(null)}>{notice}</AlertBanner>}

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_admin_questions}</div>
          <div className="bz-h-tight text-[22px] mt-1">{template.questions.length}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_assignments}</div>
          <div className="bz-h-tight text-[22px] mt-1">{template._count.assignments}</div>
        </div>
        <div className="bz-card p-3">
          <div className="pulse-eyebrow text-[#525252]">{t.audits_responses}</div>
          <div className="bz-h-tight text-[22px] mt-1">{template._count.responses}</div>
        </div>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {template.isPublished ? (
          <Badge kind="ok">{t.audits_published}</Badge>
        ) : template.isActive ? (
          <Badge kind="ghost">{t.audits_draft}</Badge>
        ) : (
          <Badge kind="warn">{t.audits_archived}</Badge>
        )}
        <Badge kind="info">
          {template.scoringMode === 'percentage'
            ? t.audits_score_mode_percentage
            : template.scoringMode === 'weighted'
              ? t.audits_score_mode_weighted
              : t.audits_score_mode_pass_fail}
        </Badge>
        {template.passingScore != null && <Badge kind="warn">≥{template.passingScore}</Badge>}
        {template.category && (
          <Badge kind="ghost">
            {locale === 'tr' ? template.category.labelTr : template.category.labelEn}
          </Badge>
        )}
      </div>

      {/* Questions */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="bz-h-tight text-[16px]">{t.audits_detail_questions}</h2>
          <Link
            href={`/${locale}/dashboard/audits/new?restaurantId=${template.restaurantId}`}
            className="bz-btn-ghost"
            title={locale === 'tr' ? 'Yeni şablon oluştur' : 'Create new template'}
          >
            <Plus size={14} /> {locale === 'tr' ? 'Yeni şablon' : 'New template'}
          </Link>
        </div>
        {template.questions.length === 0 ? (
          <EmptyState
            icon={<ClipboardCheck size={18} />}
            title={locale === 'tr' ? 'Henüz soru eklenmedi' : 'No questions yet'}
            body={
              locale === 'tr'
                ? 'Bu şablon taslak. Wizard üzerinden yeniden gönderebilirsin.'
                : 'This template is a draft. Re-submit via the wizard.'
            }
          />
        ) : (
          <ol className="space-y-2">
            {template.questions.map((q, i) => {
              const labels = QUESTION_TYPE_LABEL[q.type];
              const opts = Array.isArray(q.options) ? (q.options as string[]) : [];
              return (
                <li key={q.id} className="bz-card p-3">
                  <div className="flex items-start gap-2">
                    <Badge kind="ghost">{i + 1}</Badge>
                    <div className="flex-1">
                      <div className="flex flex-wrap gap-1.5 mb-1">
                        <Badge kind="info">{locale === 'tr' ? labels.tr : labels.en}</Badge>
                        {q.weight > 1 && <Badge kind="warn">×{q.weight}</Badge>}
                        {!q.isRequired && (
                          <Badge kind="ghost">{locale === 'tr' ? 'opsiyonel' : 'optional'}</Badge>
                        )}
                      </div>
                      <p className="text-[14px] text-[#0A0A0A]">{q.prompt}</p>
                      {opts.length > 0 && (
                        <p className="text-[12px] text-[#525252] mt-1">{opts.join(' · ')}</p>
                      )}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      {/* Assignments */}
      <section className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="bz-h-tight text-[16px]">{t.audits_detail_assignments}</h2>
          <button
            type="button"
            className="bz-btn-primary"
            onClick={() => setModalOpen(true)}
            disabled={!template.isPublished}
            title={
              !template.isPublished
                ? locale === 'tr'
                  ? 'Önce şablonu yayınla'
                  : 'Publish template first'
                : undefined
            }
          >
            <Plus size={14} /> {t.audits_detail_new_assignment}
          </button>
        </div>

        {loading && !assignments ? (
          <div className="bz-card p-6 text-center">
            <Loader2 size={18} className="animate-spin inline" />
          </div>
        ) : !assignments || assignments.length === 0 ? (
          <EmptyState
            icon={<UserIcon size={18} />}
            title={t.audits_detail_assignments_empty}
            body={
              locale === 'tr'
                ? 'Şablonu yayınladıktan sonra ekip üyesine veya public link ile atayabilirsin.'
                : 'After publishing, assign to team members or via public link.'
            }
          />
        ) : (
          <ul className="space-y-2">
            {assignments.map((a) => (
              <li key={a.id} className="bz-card p-3 flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-1.5 mb-1">
                    <Badge kind={STATUS_BADGE[a.status]}>
                      {t[`audits_assignment_status_${a.status}` as 'audits_assignment_status_pending']}
                    </Badge>
                    <Badge kind="info">{assigneeLabel[a.assigneeType]}</Badge>
                    {a.dueAt && (
                      <Badge kind="ghost">
                        ⏰ {new Date(a.dueAt).toLocaleDateString(locale === 'tr' ? 'tr-TR' : 'en-US')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-[13px] text-[#0A0A0A] truncate">
                    {a.assigneeType === 'team_member' && a.assigneeTeamMemberId && (
                      <>
                        {teamMembers.find((m) => m.id === a.assigneeTeamMemberId)?.email ??
                          a.assigneeTeamMemberId}
                      </>
                    )}
                    {a.assigneeType === 'candidate' && (
                      <>
                        {[a.assigneeName, a.assigneeEmail, a.assigneePhone].filter(Boolean).join(' · ')}
                      </>
                    )}
                    {a.assigneeType === 'link' && (locale === 'tr' ? 'Anonim link' : 'Anonymous link')}
                    {a.assigneeType === 'self' && (locale === 'tr' ? 'Kendin' : 'Yourself')}
                  </p>
                  {a.token && !a.tokenRevoked && (
                    <div className="flex items-center gap-1 mt-1">
                      <Link2 size={12} className="text-[#737373]" />
                      <code className="text-[11px] bz-mono text-[#525252] truncate">
                        {appUrl}/audits/{a.token}
                      </code>
                    </div>
                  )}
                  {a.internalNote && (
                    <p className="text-[11px] text-[#737373] mt-1 italic">{a.internalNote}</p>
                  )}
                </div>
                <div className="flex flex-col gap-1">
                  {a.token && !a.tokenRevoked && (
                    <button
                      type="button"
                      className="bz-btn-icon"
                      onClick={() => copyLink(a.token!)}
                      aria-label={t.audits_link_copied}
                    >
                      <CopyIcon size={14} />
                    </button>
                  )}
                  {a.status !== 'cancelled' && a.status !== 'completed' && (
                    <button
                      type="button"
                      className="bz-btn-icon"
                      onClick={() => handleRevoke(a)}
                      aria-label={t.audits_detail_revoke}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <AuditAssignmentModal
        locale={locale}
        open={modalOpen}
        templateId={template.id}
        restaurantId={template.restaurantId}
        teamMembers={teamMembers}
        onClose={() => setModalOpen(false)}
        onCreated={() => {
          setModalOpen(false);
          setNotice(locale === 'tr' ? 'Atama oluşturuldu' : 'Assignment created');
          loadAssignments();
          setTimeout(() => setNotice(null), 3000);
        }}
      />

      {confirmEl}
    </div>
  );
}
