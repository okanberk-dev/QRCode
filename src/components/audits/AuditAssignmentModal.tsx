'use client';

// CLAUDE.md §42 Phase 2 — Audit assignment create modal.

import { useId, useState } from 'react';
import { Loader2, Save } from 'lucide-react';
import { AlertBanner, Field, Modal, RadioCard } from '@/components/ui';
import { getTranslations, type Locale } from '@/lib/translations';
import {
  AUDIT_RECURRENCES,
  type AuditAssigneeType,
  type AuditRecurrence,
} from '@/lib/audits/types';

interface TeamMemberRef {
  id: string;
  email: string;
  name: string | null;
  role: string;
}

interface Props {
  locale: Locale;
  open: boolean;
  templateId: string;
  restaurantId: string;
  teamMembers: TeamMemberRef[];
  onClose: () => void;
  onCreated: () => void;
}

export default function AuditAssignmentModal({
  locale,
  open,
  templateId,
  restaurantId,
  teamMembers,
  onClose,
  onCreated,
}: Props) {
  const t = getTranslations(locale);
  const idBase = useId();
  const [assigneeType, setAssigneeType] = useState<AuditAssigneeType>('team_member');
  const [teamMemberId, setTeamMemberId] = useState('');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [dueAt, setDueAt] = useState('');
  const [recurrence, setRecurrence] = useState<AuditRecurrence>('once');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const opts =
    locale === 'tr'
      ? [
          { value: 'team_member' as AuditAssigneeType, label: 'Ekip üyesi', desc: 'Panelden doldurur' },
          { value: 'candidate' as AuditAssigneeType, label: 'Aday', desc: 'Public link gönderilir' },
          { value: 'link' as AuditAssigneeType, label: 'Public link', desc: 'Anonim erişim' },
          { value: 'self' as AuditAssigneeType, label: 'Kendim', desc: 'Önizleme' },
        ]
      : [
          { value: 'team_member' as AuditAssigneeType, label: 'Team member', desc: 'Fills via panel' },
          { value: 'candidate' as AuditAssigneeType, label: 'Candidate', desc: 'Public link delivered' },
          { value: 'link' as AuditAssigneeType, label: 'Public link', desc: 'Anonymous' },
          { value: 'self' as AuditAssigneeType, label: 'Myself', desc: 'Preview' },
        ];

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      const body: Record<string, unknown> = {
        templateId,
        assigneeType,
        recurrence,
      };
      if (assigneeType === 'team_member') {
        if (!teamMemberId) {
          setError(locale === 'tr' ? 'Ekip üyesi seçilmedi' : 'Pick a team member');
          setSubmitting(false);
          return;
        }
        body.assigneeTeamMemberId = teamMemberId;
      }
      if (assigneeType === 'candidate') {
        if (!email.trim() && !phone.trim()) {
          setError(locale === 'tr' ? 'En az e-posta veya telefon gerekli' : 'Need email or phone');
          setSubmitting(false);
          return;
        }
        body.assigneeName = name.trim() || null;
        body.assigneeEmail = email.trim() || null;
        body.assigneePhone = phone.trim() || null;
      }
      if (dueAt) body.dueAt = dueAt;
      if (note.trim()) body.internalNote = note.trim();

      const res = await fetch(`/api/restaurants/${restaurantId}/audits/assignments`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || j.message || (locale === 'tr' ? 'Atama başarısız' : 'Assignment failed'));
        return;
      }
      onCreated();
    } catch {
      setError(locale === 'tr' ? 'Bağlantı hatası' : 'Connection error');
    } finally {
      setSubmitting(false);
    }
  }

  if (!open) return null;

  return (
    <Modal
      onClose={onClose}
      title={t.audits_detail_new_assignment}
      size={640}
    >
      <div className="space-y-3">
        {error && <AlertBanner kind="danger">{error}</AlertBanner>}

        <div className="grid gap-2">
          {opts.map((o) => (
            <RadioCard
              key={o.value}
              active={assigneeType === o.value}
              onClick={() => setAssigneeType(o.value)}
              title={o.label}
              body={o.desc}
            />
          ))}
        </div>

        {assigneeType === 'team_member' && (
          <Field label={t.audits_assign_team_member} required htmlFor={`${idBase}-tm`}>
            {teamMembers.length === 0 ? (
              <p className="text-[13px] text-[#737373]">
                {locale === 'tr'
                  ? 'Aktif ekip üyesi yok.'
                  : 'No active team members.'}
              </p>
            ) : (
              <select
                id={`${idBase}-tm`}
                className="bz-input"
                value={teamMemberId}
                onChange={(e) => setTeamMemberId(e.target.value)}
              >
                <option value="">—</option>
                {teamMembers.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name || m.email} · {m.role}
                  </option>
                ))}
              </select>
            )}
          </Field>
        )}

        {assigneeType === 'candidate' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={locale === 'tr' ? 'Ad' : 'Name'}>
              <input className="bz-input" value={name} onChange={(e) => setName(e.target.value)} />
            </Field>
            <Field label="E-posta">
              <input
                className="bz-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field label={locale === 'tr' ? 'Telefon' : 'Phone'}>
              <input
                className="bz-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </Field>
          </div>
        )}

        {(assigneeType === 'candidate' || assigneeType === 'link') && (
          <AlertBanner kind="info">
            {locale === 'tr'
              ? 'Kaydedince public link üretilir; detay sayfasından kopyalanabilir. Yanıt akışı sonraki dalga.'
              : 'A public link is generated on save; copy it from the detail page. Response flow ships next wave.'}
          </AlertBanner>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label={t.audits_assign_due_date}>
            <input
              className="bz-input"
              type="date"
              value={dueAt}
              onChange={(e) => setDueAt(e.target.value)}
            />
          </Field>
          <Field label={t.audits_assign_recurrence}>
            <select
              className="bz-input"
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value as AuditRecurrence)}
            >
              {AUDIT_RECURRENCES.map((r) => (
                <option key={r} value={r}>
                  {t[`audits_recurrence_${r}` as 'audits_recurrence_once']}
                </option>
              ))}
            </select>
          </Field>
        </div>

        <Field label={t.audits_assign_internal_note}>
          <textarea
            className="bz-input min-h-[60px]"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={2000}
          />
        </Field>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="bz-btn-ghost" onClick={onClose} disabled={submitting}>
            {locale === 'tr' ? 'Vazgeç' : 'Cancel'}
          </button>
          <button
            type="button"
            className="bz-btn-primary"
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {locale === 'tr' ? 'Atamayı oluştur' : 'Create assignment'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
