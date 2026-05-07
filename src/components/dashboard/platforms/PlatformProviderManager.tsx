'use client';

import { useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ExternalLink, Loader2, Save, TestTube2, XCircle } from 'lucide-react';
import { Badge, Toggle } from '@/components/ui';
import {
  checkProviderUrl,
  describeDomainError,
  type IntegrationProvider,
} from '@/lib/integration-domains';
import type {
  ManagedPlatformCategory,
  PlatformEnabledField,
  PlatformUrlField,
} from '@/lib/platform-management';
import type { Locale } from '@/lib/translations';

export interface PlatformManagerConfig {
  slug: string;
  provider: IntegrationProvider;
  name: string;
  category: ManagedPlatformCategory;
  categoryLabel: { tr: string; en: string };
  accent: string;
  initials: string;
  placeholder: string;
  urlField: PlatformUrlField;
  enabledField?: PlatformEnabledField;
  externalReview?: boolean;
}

export interface PlatformLatestCheck {
  ok: boolean;
  statusCode: number | null;
  latencyMs: number | null;
  error: string | null;
  checkedAt: string;
}

export interface PlatformManagerRow {
  restaurantId: string;
  restaurantName: string;
  url: string;
  enabled: boolean;
  externalPlatformsEnabled: boolean;
  redirects30d: number;
  latestCheck: PlatformLatestCheck | null;
}

interface PlatformProviderManagerProps {
  platform: PlatformManagerConfig;
  rows: PlatformManagerRow[];
  locale: Locale;
}

interface RowState extends PlatformManagerRow {
  initialUrl: string;
  initialEnabled: boolean;
  saving: boolean;
  testing: boolean;
  message: string | null;
  messageKind: 'success' | 'error' | 'warning' | null;
}

interface TestResponse {
  ok: boolean;
  statusCode: number;
  latencyMs: number;
  error?: string;
  checkedAt: string;
}

function buildInitialState(rows: PlatformManagerRow[]): Record<string, RowState> {
  return Object.fromEntries(
    rows.map((row) => [
      row.restaurantId,
      {
        ...row,
        initialUrl: row.url,
        initialEnabled: row.enabled,
        saving: false,
        testing: false,
        message: null,
        messageKind: null,
      },
    ]),
  ) as Record<string, RowState>;
}

function formatCount(value: number, locale: Locale) {
  return value.toLocaleString(locale === 'tr' ? 'tr-TR' : 'en-US');
}

function formatCheck(check: PlatformLatestCheck | null, locale: Locale) {
  if (!check) return locale === 'tr' ? 'Test yok' : 'No test';
  const date = new Date(check.checkedAt);
  const label = new Intl.DateTimeFormat(locale === 'tr' ? 'tr-TR' : 'en-US', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
  const status = check.statusCode ? `HTTP ${check.statusCode}` : locale === 'tr' ? 'yanit yok' : 'no response';
  const latency =
    typeof check.latencyMs === 'number' ? ` · ${check.latencyMs}ms` : '';
  return `${label} · ${status}${latency}`;
}

function isDirty(row: RowState) {
  return row.url.trim() !== row.initialUrl.trim() || row.enabled !== row.initialEnabled;
}

export function PlatformProviderManager({
  platform,
  rows,
  locale,
}: PlatformProviderManagerProps) {
  const isTr = locale === 'tr';
  const [state, setState] = useState<Record<string, RowState>>(() => buildInitialState(rows));
  const rowList = useMemo(() => Object.values(state), [state]);

  const updateRow = (restaurantId: string, patch: Partial<RowState>) => {
    setState((current) => ({
      ...current,
      [restaurantId]: {
        ...current[restaurantId],
        ...patch,
      },
    }));
  };

  const saveRow = async (row: RowState) => {
    const validation = checkProviderUrl(platform.provider, row.url);
    if (!validation.ok && validation.severity === 'error') {
      updateRow(row.restaurantId, {
        message: describeDomainError(platform.provider, validation, locale),
        messageKind: 'error',
      });
      return;
    }

    updateRow(row.restaurantId, { saving: true, message: null, messageKind: null });
    try {
      const payload: Record<string, string | boolean | null> = {
        [platform.urlField]: row.url.trim() || null,
      };
      if (platform.enabledField) {
        payload[platform.enabledField] = row.enabled;
      }

      const response = await fetch(`/api/restaurants/${row.restaurantId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as { error?: string; message?: string } | null;
      if (!response.ok) {
        throw new Error(body?.error || body?.message || `HTTP ${response.status}`);
      }
      updateRow(row.restaurantId, {
        initialUrl: row.url.trim(),
        url: row.url.trim(),
        initialEnabled: row.enabled,
        saving: false,
        message: isTr ? 'Kaydedildi.' : 'Saved.',
        messageKind: 'success',
      });
    } catch (error) {
      updateRow(row.restaurantId, {
        saving: false,
        message: error instanceof Error ? error.message : isTr ? 'Kaydedilemedi.' : 'Could not save.',
        messageKind: 'error',
      });
    }
  };

  const testRow = async (row: RowState) => {
    if (isDirty(row)) {
      updateRow(row.restaurantId, {
        message: isTr ? 'Önce kaydet, sonra test et.' : 'Save before testing.',
        messageKind: 'warning',
      });
      return;
    }

    updateRow(row.restaurantId, { testing: true, message: null, messageKind: null });
    try {
      const response = await fetch(
        `/api/restaurants/${row.restaurantId}/integrations/${platform.provider}/test`,
        { method: 'POST' },
      );
      const body = (await response.json()) as TestResponse & { error?: string };
      if (!response.ok) {
        throw new Error(body.error || `HTTP ${response.status}`);
      }
      updateRow(row.restaurantId, {
        testing: false,
        latestCheck: {
          ok: body.ok,
          statusCode: body.statusCode,
          latencyMs: body.latencyMs,
          error: body.error ?? null,
          checkedAt: body.checkedAt,
        },
        message: body.ok
          ? isTr
            ? 'Test başarılı.'
            : 'Test passed.'
          : body.error || (isTr ? 'Bağlantı doğrulanamadı.' : 'Connection could not be verified.'),
        messageKind: body.ok ? 'success' : 'error',
      });
    } catch (error) {
      updateRow(row.restaurantId, {
        testing: false,
        message: error instanceof Error ? error.message : isTr ? 'Test çalışmadı.' : 'Test failed.',
        messageKind: 'error',
      });
    }
  };

  return (
    <div className="space-y-3">
      {rowList.map((row) => {
        const validation = checkProviderUrl(platform.provider, row.url);
        const validationMessage = validation.ok
          ? null
          : describeDomainError(platform.provider, validation, locale);
        const hardError = !validation.ok && validation.severity === 'error';
        const externalDisabled = Boolean(platform.externalReview && !row.externalPlatformsEnabled);
        const rowDirty = isDirty(row);
        const canSave = !hardError && !externalDisabled && !row.saving;
        const canTest =
          !rowDirty &&
          !hardError &&
          !externalDisabled &&
          row.url.trim().length > 0 &&
          !row.testing;
        const connected = row.url.trim().length > 0 && row.enabled && !externalDisabled;
        const badgeKind = connected
          ? row.latestCheck?.ok === false
            ? 'warn'
            : 'ok'
          : row.url.trim().length > 0
            ? 'warn'
            : 'ghost';
        const badgeLabel = connected
          ? row.latestCheck?.ok === false
            ? isTr
              ? 'Dikkat'
              : 'Check'
            : isTr
              ? 'Aktif'
              : 'Active'
          : row.url.trim().length > 0
            ? isTr
              ? 'Pasif'
              : 'Inactive'
            : isTr
              ? 'Eksik'
              : 'Missing';

        return (
          <section key={row.restaurantId} className="bz-card p-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="truncate text-[15px] font-semibold tracking-[-0.01em] text-[#0A0A0A]">
                    {row.restaurantName}
                  </h2>
                  <Badge kind={badgeKind}>{badgeLabel}</Badge>
                  {rowDirty && (
                    <span className="rounded-full bg-[#F5F5F5] px-2 py-0.5 text-[11px] font-medium text-[#737373]">
                      {isTr ? 'degisiklik var' : 'unsaved'}
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-2 lg:grid-cols-[minmax(0,1fr)_auto_auto]">
                  <label className="block">
                    <span className="sr-only">
                      {isTr ? `${platform.name} bağlantı adresi` : `${platform.name} URL`}
                    </span>
                    <input
                      value={row.url}
                      onChange={(event) =>
                        updateRow(row.restaurantId, {
                          url: event.target.value,
                          message: null,
                          messageKind: null,
                        })
                      }
                      placeholder={platform.placeholder}
                      disabled={externalDisabled}
                      className={`h-10 w-full rounded-[10px] border bg-white px-3 text-[13px] text-[#0A0A0A] outline-none transition-colors placeholder:text-[#A3A3A3] focus:border-[#0A0A0A] ${
                        hardError ? 'border-[#FCA5A5]' : 'border-[#EDEDED]'
                      }`}
                    />
                  </label>
                  {platform.enabledField ? (
                    <div className="flex h-10 items-center justify-between gap-3 rounded-[10px] border border-[#EDEDED] bg-[#FAFAFA] px-3">
                      <span className="text-[12px] font-medium text-[#525252]">
                        {isTr ? 'Aktif' : 'Active'}
                      </span>
                      <Toggle
                        checked={row.enabled}
                        onChange={(checked) =>
                          updateRow(row.restaurantId, {
                            enabled: checked,
                            message: null,
                            messageKind: null,
                          })
                        }
                        disabled={externalDisabled}
                        size="sm"
                        ariaLabel={isTr ? 'Platform aktifligi' : 'Platform active state'}
                      />
                    </div>
                  ) : null}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveRow(row)}
                      disabled={!canSave}
                      className="bz-btn-primary inline-flex h-10 items-center gap-1.5 px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {row.saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
                      {isTr ? 'Kaydet' : 'Save'}
                    </button>
                    <button
                      type="button"
                      onClick={() => testRow(row)}
                      disabled={!canTest}
                      className="bz-btn inline-flex h-10 items-center gap-1.5 px-3 text-[12px] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {row.testing ? (
                        <Loader2 size={13} className="animate-spin" />
                      ) : (
                        <TestTube2 size={13} />
                      )}
                      {isTr ? 'Test et' : 'Test'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid min-w-[220px] grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-[#EDEDED]">
                <div className="bg-white p-2.5">
                  <div className="pulse-eyebrow mb-0.5 text-[9.5px] text-[#737373]">
                    {isTr ? '30G YONLENDIRME' : '30D REDIRECTS'}
                  </div>
                  <div className="bz-mono text-[13px] font-semibold tabular-nums text-[#0A0A0A]">
                    {formatCount(row.redirects30d, locale)}
                  </div>
                </div>
                <div className="border-l border-[#EDEDED] bg-white p-2.5">
                  <div className="pulse-eyebrow mb-0.5 text-[9.5px] text-[#737373]">
                    {isTr ? 'SON TEST' : 'LAST TEST'}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-[#525252]">
                    {row.latestCheck ? (
                      row.latestCheck.ok ? (
                        <CheckCircle2 size={12} className="text-[#16A34A]" />
                      ) : (
                        <XCircle size={12} className="text-[#DC2626]" />
                      )
                    ) : (
                      <AlertTriangle size={12} className="text-[#A3A3A3]" />
                    )}
                    <span className="truncate">{formatCheck(row.latestCheck, locale)}</span>
                  </div>
                </div>
              </div>
            </div>

            {(validationMessage || row.message || externalDisabled) && (
              <div className="mt-3 space-y-2">
                {externalDisabled && (
                  <div className="rounded-[10px] border border-[#FED7AA] bg-[#FFF7ED] px-3 py-2 text-[12px] text-[#9A3412]">
                    {isTr
                      ? 'Bu işletmede Google dışı platformlar paket yetkisiyle kapalı.'
                      : 'External review platforms are disabled for this business by plan entitlement.'}
                  </div>
                )}
                {validationMessage && !externalDisabled && (
                  <div
                    className={`rounded-[10px] border px-3 py-2 text-[12px] ${
                      hardError
                        ? 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]'
                        : 'border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]'
                    }`}
                  >
                    {validationMessage}
                  </div>
                )}
                {row.message && (
                  <div
                    className={`rounded-[10px] border px-3 py-2 text-[12px] ${
                      row.messageKind === 'success'
                        ? 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]'
                        : row.messageKind === 'warning'
                          ? 'border-[#FED7AA] bg-[#FFF7ED] text-[#9A3412]'
                          : 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]'
                    }`}
                  >
                    {row.message}
                  </div>
                )}
              </div>
            )}

            {row.url.trim() && !hardError && (
              <a
                href={row.url.trim()}
                target="_blank"
                rel="noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium text-[#525252] hover:text-[#0A0A0A]"
              >
                <ExternalLink size={12} />
                {isTr ? 'Bağlantıyı aç' : 'Open link'}
              </a>
            )}
          </section>
        );
      })}
    </div>
  );
}
