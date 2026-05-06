'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Pencil,
  Trash2,
  Send,
  CheckCircle2,
  XCircle,
  Webhook,
  Mail,
  UserCheck,
  Zap,
} from 'lucide-react';
import {
  AlertBanner,
  Badge,
  EmptyState,
  Field,
  Modal,
  PageHeader,
  Toggle,
  useConfirmDialog,
} from '@/components/ui';
import type { Locale } from '@/lib/translations';

interface Rule {
  id: string;
  restaurantId: string | null;
  trigger: string;
  threshold: string | null;
  action: string;
  target: string | null;
  isActive: boolean;
  lastFiredAt: string | null;
  lastFireStatus: string | null;
  lastFireResponseMs: number | null;
  createdAt: string;
  updatedAt: string;
}

interface RestaurantOpt {
  id: string;
  name: string;
}

interface Props {
  initialRules: Rule[];
  restaurants: RestaurantOpt[];
  locale: Locale;
}

interface FormState {
  trigger: string;
  threshold: string;
  action: string;
  target: string;
  restaurantId: string;
  isActive: boolean;
}

interface TestResult {
  ok: boolean;
  httpStatus: number | null;
  responseMs: number;
  attempts: number;
  errorReason?: string | null;
}

const TRIGGER_OPTIONS = [
  { value: 'rating_lte', tr: 'Düşük puan (≤ eşik)', en: 'Low rating (≤ threshold)' },
  { value: 'rating_gte', tr: 'Yüksek puan (≥ eşik)', en: 'High rating (≥ threshold)' },
  { value: 'keyword', tr: 'Anahtar kelime', en: 'Keyword match' },
  { value: 'platform', tr: 'Platform eşleşmesi', en: 'Platform match' },
];
const ACTION_OPTIONS = [
  { value: 'webhook', tr: 'Webhook', en: 'Webhook' },
  { value: 'email', tr: 'E-posta', en: 'Email' },
  { value: 'assign', tr: 'Ekibe ata', en: 'Assign' },
];

const EMPTY_FORM: FormState = {
  trigger: 'rating_lte',
  threshold: '3',
  action: 'webhook',
  target: '',
  restaurantId: '',
  isActive: true,
};

export default function AutomationsManager({ initialRules, restaurants, locale }: Props) {
  const router = useRouter();
  const isTr = locale === 'tr';
  const [rules, setRules] = useState<Rule[]>(initialRules);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<Record<string, TestResult>>({});
  const [testingId, setTestingId] = useState<string | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageNotice, setPageNotice] = useState<string | null>(null);
  const [confirmDialog, askConfirm] = useConfirmDialog();

  const restaurantNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const r of restaurants) m.set(r.id, r.name);
    return m;
  }, [restaurants]);

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setFormError(null);
    setModalOpen(true);
  };

  const openEdit = (rule: Rule) => {
    setEditingId(rule.id);
    setForm({
      trigger: rule.trigger,
      threshold: rule.threshold ?? '',
      action: rule.action,
      target: rule.target ?? '',
      restaurantId: rule.restaurantId ?? '',
      isActive: rule.isActive,
    });
    setFormError(null);
    setModalOpen(true);
  };

  const onSave = async () => {
    setFormError(null);
    setSubmitting(true);
    try {
      const body = {
        trigger: form.trigger,
        threshold: form.threshold.trim() || undefined,
        action: form.action,
        target: form.target.trim() || undefined,
        restaurantId: form.restaurantId || undefined,
        isActive: form.isActive,
      };
      const url = editingId ? `/api/automations/${editingId}` : '/api/automations';
      const method = editingId ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        const msg =
          data?.error === 'validation_error'
            ? data.issues?.[0]?.message ?? (isTr ? 'Doğrulama hatası' : 'Validation error')
            : data?.error ?? `HTTP ${res.status}`;
        setFormError(msg);
        return;
      }
      const newRule: Rule = data.data;
      setRules((prev) =>
        editingId ? prev.map((r) => (r.id === editingId ? newRule : r)) : [newRule, ...prev],
      );
      setModalOpen(false);
      setPageNotice(
        editingId
          ? isTr
            ? 'Kural güncellendi.'
            : 'Rule updated.'
          : isTr
            ? 'Kural oluşturuldu.'
            : 'Rule created.',
      );
      setTimeout(() => setPageNotice(null), 3500);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'unknown_error');
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = (rule: Rule) => {
    askConfirm({
      title: isTr ? 'Kuralı sil' : 'Delete rule',
      body: isTr
        ? 'Bu kural silinecek. İşlem geri alınamaz, ama silme audit log\'a kaydedilir.'
        : 'This rule will be deleted. The action cannot be undone but will be audit-logged.',
      confirmLabel: isTr ? 'Sil' : 'Delete',
      cancelLabel: isTr ? 'Vazgeç' : 'Cancel',
      variant: 'danger',
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/automations/${rule.id}`, { method: 'DELETE' });
          if (!res.ok) {
            const data = await res.json().catch(() => null);
            setPageError(data?.error ?? `HTTP ${res.status}`);
            return;
          }
          setRules((prev) => prev.filter((r) => r.id !== rule.id));
          setPageNotice(isTr ? 'Kural silindi.' : 'Rule deleted.');
          setTimeout(() => setPageNotice(null), 3500);
        } catch (err) {
          setPageError(err instanceof Error ? err.message : 'unknown_error');
        }
      },
    });
  };

  const onTest = async (rule: Rule) => {
    if (rule.action !== 'webhook' || !rule.target) return;
    setTestingId(rule.id);
    try {
      const res = await fetch(`/api/automations/${rule.id}/test`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });
      const data = await res.json().catch(() => null);
      const result: TestResult = {
        ok: Boolean(data?.ok),
        httpStatus: data?.httpStatus ?? null,
        responseMs: data?.responseMs ?? 0,
        attempts: data?.attempts ?? 1,
        errorReason: data?.errorReason ?? null,
      };
      setTestResults((prev) => ({ ...prev, [rule.id]: result }));
      // Refresh rules to pick up lastFiredAt update
      router.refresh();
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [rule.id]: {
          ok: false,
          httpStatus: null,
          responseMs: 0,
          attempts: 0,
          errorReason: err instanceof Error ? err.message : 'unknown_error',
        },
      }));
    } finally {
      setTestingId(null);
    }
  };

  return (
    <>
      <PageHeader
        eyebrow={isTr ? 'AYARLAR' : 'SETTINGS'}
        title={isTr ? 'Otomasyonlar' : 'Automations'}
        description={
          isTr
            ? 'Yorum tetikli webhook + e-posta + atama kuralları. Düşük puan geldiğinde dış sistemlere otomatik haber ver.'
            : 'Feedback-triggered webhook + email + assignment rules. Notify external systems when reviews arrive.'
        }
        actions={
          <button
            type="button"
            onClick={openCreate}
            className="bz-btn-primary inline-flex items-center gap-1.5 px-3.5 py-2 text-[12.5px]"
          >
            <Plus size={14} />
            {isTr ? 'Yeni kural' : 'New rule'}
          </button>
        }
      />

      {pageError && (
        <AlertBanner kind="danger" onDismiss={() => setPageError(null)}>
          {pageError}
        </AlertBanner>
      )}
      {pageNotice && (
        <AlertBanner kind="success" onDismiss={() => setPageNotice(null)}>
          {pageNotice}
        </AlertBanner>
      )}

      {rules.length === 0 ? (
        <div className="bz-card p-8">
          <EmptyState
            icon={<Zap size={32} />}
            title={isTr ? 'Henüz otomasyon kuralı yok' : 'No automation rules yet'}
            body={
              isTr
                ? 'Yorum tetiklendiğinde Slack, n8n, Zapier veya kendi backend\'inize webhook gönderebilirsiniz. HMAC-SHA256 imzalı, 3 retry exponential backoff.'
                : 'When a review fires, send a webhook to Slack, n8n, Zapier, or your own backend. HMAC-SHA256 signed, 3-retry exponential backoff.'
            }
            action={
              <button
                type="button"
                onClick={openCreate}
                className="bz-btn-primary inline-flex items-center gap-1.5 px-4 py-2 text-[12.5px]"
              >
                <Plus size={14} />
                {isTr ? 'İlk kuralı oluştur' : 'Create first rule'}
              </button>
            }
          />
        </div>
      ) : (
        <div className="bz-card overflow-hidden p-0">
          {/* Desktop table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="bz-table w-full text-[12.5px]">
              <thead>
                <tr>
                  <th className="text-left">{isTr ? 'Tetikleyici' : 'Trigger'}</th>
                  <th className="text-left">{isTr ? 'Aksiyon' : 'Action'}</th>
                  <th className="text-left">{isTr ? 'Hedef' : 'Target'}</th>
                  <th className="text-left">{isTr ? 'İşletme' : 'Restaurant'}</th>
                  <th className="text-left">{isTr ? 'Durum' : 'Status'}</th>
                  <th className="text-left">{isTr ? 'Son tetik' : 'Last fired'}</th>
                  <th className="text-right pr-4">{isTr ? 'Eylemler' : 'Actions'}</th>
                </tr>
              </thead>
              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id} className="bz-tr-hover">
                    <td className="whitespace-nowrap">
                      <span className="bz-h-tight">{labelForTrigger(rule.trigger, isTr)}</span>
                      {rule.threshold && (
                        <span className="ml-2 bz-mono text-[11px] text-[#525252]">
                          {rule.threshold}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="inline-flex items-center gap-1.5">
                        {iconForAction(rule.action)}
                        <span>{labelForAction(rule.action, isTr)}</span>
                      </span>
                    </td>
                    <td className="bz-mono text-[11px] text-[#525252] max-w-[280px] truncate">
                      {rule.target ?? '—'}
                    </td>
                    <td className="text-[12px]">
                      {rule.restaurantId
                        ? restaurantNameById.get(rule.restaurantId) ?? rule.restaurantId
                        : isTr
                          ? 'Tüm işletmeler'
                          : 'All restaurants'}
                    </td>
                    <td>
                      <Badge kind={rule.isActive ? 'ok' : 'off'}>
                        {rule.isActive ? (isTr ? 'Aktif' : 'Active') : isTr ? 'Pasif' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="text-[11px] text-[#525252]">
                      {renderLastFire(rule, isTr)}
                    </td>
                    <td className="text-right pr-2 whitespace-nowrap">
                      <div className="inline-flex items-center gap-1">
                        {rule.action === 'webhook' && rule.target && (
                          <button
                            type="button"
                            onClick={() => onTest(rule)}
                            disabled={testingId === rule.id}
                            className="bz-btn-ghost inline-flex items-center gap-1 px-2 py-1 text-[11px]"
                            title={isTr ? 'Test fire' : 'Test fire'}
                          >
                            <Send size={12} />
                            {isTr ? 'Test' : 'Test'}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => openEdit(rule)}
                          className="bz-btn-ghost inline-flex items-center gap-1 px-2 py-1 text-[11px]"
                        >
                          <Pencil size={12} />
                          {isTr ? 'Düzenle' : 'Edit'}
                        </button>
                        <button
                          type="button"
                          onClick={() => onDelete(rule)}
                          className="bz-btn-ghost inline-flex items-center gap-1 px-2 py-1 text-[11px] text-[#DC2626]"
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                      {testResults[rule.id] && (
                        <TestResultLine result={testResults[rule.id]} isTr={isTr} />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile card list */}
          <div className="lg:hidden divide-y divide-[#EDEDED]">
            {rules.map((rule) => (
              <div key={rule.id} className="p-4">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {iconForAction(rule.action)}
                    <span className="bz-h-tight text-[13px]">
                      {labelForTrigger(rule.trigger, isTr)}
                      {rule.threshold && (
                        <span className="ml-1.5 bz-mono text-[11px] text-[#525252]">
                          {rule.threshold}
                        </span>
                      )}
                    </span>
                  </div>
                  <Badge kind={rule.isActive ? 'ok' : 'off'}>
                    {rule.isActive ? (isTr ? 'Aktif' : 'Active') : isTr ? 'Pasif' : 'Inactive'}
                  </Badge>
                </div>
                {rule.target && (
                  <div className="bz-mono text-[10.5px] text-[#737373] truncate mb-1">
                    {rule.target}
                  </div>
                )}
                <div className="text-[11px] text-[#525252] mb-3">
                  {rule.restaurantId
                    ? restaurantNameById.get(rule.restaurantId) ?? rule.restaurantId
                    : isTr
                      ? 'Tüm işletmeler'
                      : 'All restaurants'}{' '}
                  · {renderLastFire(rule, isTr)}
                </div>
                <div className="flex items-center gap-2">
                  {rule.action === 'webhook' && rule.target && (
                    <button
                      type="button"
                      onClick={() => onTest(rule)}
                      disabled={testingId === rule.id}
                      className="bz-btn-ghost flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] text-[11.5px]"
                    >
                      <Send size={12} />
                      {isTr ? 'Test' : 'Test'}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => openEdit(rule)}
                    className="bz-btn-ghost flex-1 inline-flex items-center justify-center gap-1 min-h-[44px] text-[11.5px]"
                  >
                    <Pencil size={12} />
                    {isTr ? 'Düzenle' : 'Edit'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(rule)}
                    className="bz-btn-ghost min-h-[44px] inline-flex items-center justify-center px-3 text-[#DC2626]"
                    aria-label={isTr ? 'Sil' : 'Delete'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {testResults[rule.id] && (
                  <TestResultLine result={testResults[rule.id]} isTr={isTr} />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {modalOpen && (
        <Modal
          title={editingId ? (isTr ? 'Kuralı düzenle' : 'Edit rule') : isTr ? 'Yeni kural' : 'New rule'}
          onClose={() => setModalOpen(false)}
          size={520}
          footer={
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="bz-btn-ghost px-4 py-2 text-[12.5px]"
              >
                {isTr ? 'Vazgeç' : 'Cancel'}
              </button>
              <button
                type="button"
                onClick={onSave}
                disabled={submitting}
                className="bz-btn-primary px-4 py-2 text-[12.5px]"
              >
                {submitting
                  ? isTr
                    ? 'Kaydediliyor…'
                    : 'Saving…'
                  : isTr
                    ? 'Kaydet'
                    : 'Save'}
              </button>
            </div>
          }
        >
          <div className="space-y-4">
            {formError && (
              <AlertBanner kind="danger" onDismiss={() => setFormError(null)}>
                {formError}
              </AlertBanner>
            )}

            <Field label={isTr ? 'Tetikleyici' : 'Trigger'}>
              <select
                className="bz-input w-full"
                value={form.trigger}
                onChange={(e) => setForm((f) => ({ ...f, trigger: e.target.value }))}
              >
                {TRIGGER_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isTr ? opt.tr : opt.en}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={isTr ? 'Eşik / değer' : 'Threshold / value'}
              hint={thresholdHint(form.trigger, isTr)}
            >
              <input
                type="text"
                className="bz-input w-full"
                value={form.threshold}
                onChange={(e) => setForm((f) => ({ ...f, threshold: e.target.value }))}
                maxLength={120}
                placeholder={thresholdPlaceholder(form.trigger)}
              />
            </Field>

            <Field label={isTr ? 'Aksiyon' : 'Action'}>
              <select
                className="bz-input w-full"
                value={form.action}
                onChange={(e) => setForm((f) => ({ ...f, action: e.target.value }))}
              >
                {ACTION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {isTr ? opt.tr : opt.en}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label={
                form.action === 'webhook'
                  ? isTr
                    ? 'Webhook URL'
                    : 'Webhook URL'
                  : form.action === 'email'
                    ? isTr
                      ? 'E-posta adresi'
                      : 'Email address'
                    : isTr
                      ? 'Atanacak ekip üyesi e-postası'
                      : 'Assignee email'
              }
              hint={
                form.action === 'webhook'
                  ? isTr
                    ? 'https:// ile başlayan tam URL. Slack/n8n/Zapier veya kendi backend\'in.'
                    : 'Full URL starting with https://. Slack/n8n/Zapier or your own backend.'
                  : undefined
              }
            >
              <input
                type="text"
                className="bz-input w-full bz-mono text-[12px]"
                value={form.target}
                onChange={(e) => setForm((f) => ({ ...f, target: e.target.value }))}
                maxLength={500}
                inputMode="url"
                autoComplete="off"
                spellCheck={false}
                placeholder={
                  form.action === 'webhook'
                    ? 'https://hooks.example.com/incoming/...'
                    : 'eposta@example.com'
                }
              />
            </Field>

            <Field
              label={isTr ? 'İşletme kapsamı' : 'Restaurant scope'}
              hint={
                isTr
                  ? 'Boş bırakırsan tüm işletmelerin için tetiklenir.'
                  : 'Leave empty to fire across all your restaurants.'
              }
            >
              <select
                className="bz-input w-full"
                value={form.restaurantId}
                onChange={(e) => setForm((f) => ({ ...f, restaurantId: e.target.value }))}
              >
                <option value="">
                  {isTr ? '— Tüm işletmeler —' : '— All restaurants —'}
                </option>
                {restaurants.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </Field>

            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="bz-h-tight text-[13px]">
                  {isTr ? 'Aktif' : 'Active'}
                </div>
                <div className="text-[11px] text-[#737373]">
                  {isTr
                    ? 'Pasif kurallar tetiklenmez ama saklanır.'
                    : 'Inactive rules do not fire but are kept.'}
                </div>
              </div>
              <Toggle
                checked={form.isActive}
                onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                ariaLabel={isTr ? 'Aktiflik' : 'Active toggle'}
              />
            </div>
          </div>
        </Modal>
      )}

      {confirmDialog}
    </>
  );
}

function iconForAction(action: string) {
  if (action === 'webhook') return <Webhook size={13} className="text-[#525252]" />;
  if (action === 'email') return <Mail size={13} className="text-[#525252]" />;
  if (action === 'assign') return <UserCheck size={13} className="text-[#525252]" />;
  return <Zap size={13} className="text-[#525252]" />;
}

function labelForTrigger(trigger: string, isTr: boolean): string {
  const opt = TRIGGER_OPTIONS.find((t) => t.value === trigger);
  return opt ? (isTr ? opt.tr : opt.en) : trigger;
}

function labelForAction(action: string, isTr: boolean): string {
  const opt = ACTION_OPTIONS.find((a) => a.value === action);
  return opt ? (isTr ? opt.tr : opt.en) : action;
}

function thresholdHint(trigger: string, isTr: boolean): string {
  switch (trigger) {
    case 'rating_lte':
      return isTr ? 'Örn. 3 → 3 ve altı puanlarda tetikle' : 'e.g. 3 → fires for 3 stars and below';
    case 'rating_gte':
      return isTr ? 'Örn. 4 → 4 ve üstü puanlarda tetikle' : 'e.g. 4 → fires for 4 stars and above';
    case 'keyword':
      return isTr ? 'Yorum içinde geçecek kelime' : 'Keyword to match in comment';
    case 'platform':
      return isTr
        ? 'Örn. google, yemeksepeti, getir, trendyol_go'
        : 'e.g. google, yemeksepeti, getir, trendyol_go';
    default:
      return '';
  }
}

function thresholdPlaceholder(trigger: string): string {
  if (trigger === 'rating_lte') return '3';
  if (trigger === 'rating_gte') return '4';
  if (trigger === 'keyword') return 'kötü';
  if (trigger === 'platform') return 'google';
  return '';
}

function renderLastFire(rule: Rule, isTr: boolean): string {
  if (!rule.lastFiredAt) return isTr ? 'Hiç tetiklenmedi' : 'Never fired';
  const ms = rule.lastFireResponseMs;
  const status = rule.lastFireStatus;
  const date = new Date(rule.lastFiredAt);
  const dateStr = date.toLocaleString(isTr ? 'tr-TR' : 'en-US', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
  if (status === 'ok') {
    return `${dateStr} · ${ms ?? '?'}ms`;
  }
  return `${dateStr} · ${status ?? 'fail'}`;
}

function TestResultLine({ result, isTr }: { result: TestResult; isTr: boolean }) {
  return (
    <div
      className={`mt-1.5 inline-flex items-center gap-1 text-[10.5px] ${
        result.ok ? 'text-[#16A34A]' : 'text-[#DC2626]'
      }`}
    >
      {result.ok ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
      <span className="bz-mono">
        {result.ok ? `HTTP ${result.httpStatus} · ${result.responseMs}ms` : isTr ? 'Başarısız' : 'Failed'}
        {!result.ok && result.errorReason && ` · ${result.errorReason}`}
        {result.attempts > 1 && ` · ${result.attempts} ${isTr ? 'deneme' : 'attempts'}`}
      </span>
    </div>
  );
}
