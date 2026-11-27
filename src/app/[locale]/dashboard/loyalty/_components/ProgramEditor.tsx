'use client';

// Loyalty program setup (wizard, 3 steps) and editing (one page) — §60.
import { useMemo, useState } from 'react';
import { Coffee, Loader2, Plus, Scissors, Sparkles, Stamp, Store, Trash2, UtensilsCrossed, Croissant, Coins } from 'lucide-react';
import { AlertBanner, APSwitch, Field, PulseSelect, WizardSteps } from '@/components/ui';
import LoyaltyCardFace from '@/components/loyalty/LoyaltyCardFace';
import {
  earnRuleLine,
  LOYALTY_LIMITS as L,
  LOYALTY_TEMPLATES,
  rewardRuleLine,
  type LoyaltyKind,
  type LoyaltyTemplate,
} from '@/lib/loyalty';
import {
  draftToBody,
  loyaltyFetch,
  loyaltyMessage,
  type ProgramDraft,
  type ProgramDto,
  type StatsDto,
} from './loyalty-client';

const TEMPLATE_ICON: Record<LoyaltyTemplate['key'], typeof Coffee> = {
  cafe: Coffee,
  restaurant: UtensilsCrossed,
  barber: Scissors,
  beauty: Sparkles,
  bakery: Croissant,
  general: Store,
};

const SWATCHES = ['#0A0A0A', '#1F3A2E', '#7A1F2B', '#1E3A8A', '#6B21A8', '#C2410C', '#C6F24E', '#F5E6C8'];

export function draftFromTemplate(key: LoyaltyTemplate['key'], locale: 'tr' | 'en'): ProgramDraft {
  const t = LOYALTY_TEMPLATES.find((x) => x.key === key) ?? LOYALTY_TEMPLATES[LOYALTY_TEMPLATES.length - 1];
  return {
    name: t.name[locale],
    kind: t.kind,
    pointsPerVisit: t.pointsPerVisit,
    pointsPerSpend: t.pointsPerSpend,
    spendStep: t.spendStep,
    welcomeBonus: t.welcomeBonus,
    visitCooldownMinutes: t.visitCooldownMinutes,
    expiryDays: t.expiryDays,
    birthdayReward: t.birthdayReward?.[locale] ?? '',
    tiers: t.tiers.map((x) => ({ name: x.name[locale], minVisits: x.minVisits, perk: x.perk[locale] })),
    accentColor: null,
    terms: '',
    template: t.key,
    isActive: false,
    rewards: t.rewards.map((r) => ({ title: r.title[locale], description: '', cost: r.cost, isActive: true })),
  };
}

function NumberInput({
  value,
  onChange,
  min,
  max,
  id,
  ariaLabel,
  suffix,
}: {
  value: number;
  onChange: (n: number) => void;
  min: number;
  max: number;
  id?: string;
  ariaLabel?: string;
  suffix?: string;
}) {
  return (
    <div className="flex items-center gap-2">
      <input
        id={id}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={Number.isFinite(value) ? value : ''}
        aria-label={ariaLabel}
        onChange={(e) => {
          const n = Number.parseInt(e.target.value, 10);
          onChange(Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : min);
        }}
        className="bz-input w-24 tabular-nums"
      />
      {suffix && <span className="text-[13px] text-[#737373]">{suffix}</span>}
    </div>
  );
}

interface Props {
  locale: 'tr' | 'en';
  restaurantId: string;
  restaurantName: string;
  mode: 'wizard' | 'edit';
  initialDraft: ProgramDraft;
  /** Members already exist: the card type can no longer change. */
  kindLocked?: boolean;
  canManage: boolean;
  onSaved: (program: ProgramDto, stats: StatsDto) => void;
}

export default function ProgramEditor({
  locale,
  restaurantId,
  restaurantName,
  mode,
  initialDraft,
  kindLocked = false,
  canManage,
  onSaved,
}: Props) {
  const tr = locale === 'tr';
  const [draft, setDraft] = useState<ProgramDraft>(initialDraft);
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState<'draft' | 'publish' | 'save' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const set = <K extends keyof ProgramDraft>(key: K, value: ProgramDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));
  const stampMax = draft.kind === 'stamps';

  const stepProblem = (index: number): string | null => {
    if (index === 1) {
      if (!draft.name.trim()) return tr ? 'Karta bir ad verin.' : 'Give the card a name.';
      if (!draft.rewards.some((r) => r.isActive && r.title.trim() && r.cost >= 1)) {
        return tr ? 'En az bir ödül ekleyin.' : 'Add at least one reward.';
      }
      if (draft.rewards.some((r) => !r.title.trim())) return tr ? 'Ödül adlarını doldurun.' : 'Fill in the reward names.';
      if (draft.kind === 'points' && draft.pointsPerVisit <= 0 && (draft.pointsPerSpend <= 0 || draft.spendStep <= 0)) {
        return tr ? 'Ziyaret başına ya da harcamaya göre puan tanımlayın.' : 'Set points per visit or per spend.';
      }
    }
    return null;
  };

  const save = async (kind: 'draft' | 'publish' | 'save') => {
    const problem = stepProblem(1);
    if (problem) {
      setError(problem);
      if (mode === 'wizard') setStep(1);
      return;
    }
    setSaving(kind);
    setError(null);
    setNotice(null);
    try {
      const body = draftToBody({ ...draft, isActive: kind === 'publish' ? true : kind === 'draft' ? false : draft.isActive });
      const res = await loyaltyFetch<{ program: ProgramDto; stats: StatsDto }>(`/api/restaurants/${restaurantId}/loyalty`, {
        method: 'PUT',
        body: JSON.stringify(body),
      });
      setDraft((d) => ({
        ...d,
        isActive: res.program.isActive,
        rewards: res.program.rewards.map((r) => ({ id: r.id, title: r.title, description: r.description ?? '', cost: r.cost, isActive: r.isActive })),
      }));
      if (mode === 'edit') setNotice(tr ? 'Kaydedildi.' : 'Saved.');
      onSaved(res.program, res.stats);
    } catch (err) {
      setError(loyaltyMessage(err, locale));
    } finally {
      setSaving(null);
    }
  };

  const preview = useMemo(
    () => (
      <LoyaltyCardFace
        businessName={restaurantName}
        programName={draft.name || (tr ? 'Sadakat kartı' : 'Loyalty card')}
        kind={draft.kind}
        balance={Math.max(draft.welcomeBonus, draft.kind === 'stamps' ? 3 : 120)}
        rewards={draft.rewards.filter((r) => r.title.trim())}
        accentColor={draft.accentColor}
        memberName={tr ? 'Ayşe' : 'Alex'}
        code="KX7 M42"
        locale={locale}
      />
    ),
    [draft, locale, restaurantName, tr],
  );

  // ── sections ──────────────────────────────────────────────────────────

  const templatePicker = (
    <div>
      <p className="text-[13px] text-[#525252]">
        {tr
          ? 'İşinize en yakın kartı seçin; her şeyi sonraki adımda değiştirebilirsiniz.'
          : 'Pick the card closest to your business; you can change everything in the next step.'}
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {LOYALTY_TEMPLATES.map((t) => {
          const Icon = TEMPLATE_ICON[t.key];
          const active = draft.template === t.key;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setDraft({ ...draftFromTemplate(t.key, locale), accentColor: draft.accentColor })}
              aria-pressed={active}
              className={`flex items-start gap-3 rounded-[20px] border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pn-accent-hover ${
                active ? 'border-pn-accent bg-pn-accent-soft' : 'border-pn-line bg-white hover:border-pn-line-strong'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[14px] ${active ? 'bg-pn-accent text-white' : 'bg-pn-canvas'}`}>
                <Icon size={17} aria-hidden="true" />
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-medium text-pn-ink">{t.label[locale]}</span>
                <span className="mt-0.5 block text-[13px] text-[#737373]">{t.hint[locale]}</span>
                <span className="mt-1.5 inline-flex items-center gap-1 text-[12px] text-[#525252]">
                  {t.kind === 'stamps' ? <Stamp size={12} aria-hidden="true" /> : <Coins size={12} aria-hidden="true" />}
                  {t.kind === 'stamps' ? (tr ? 'Damga kartı' : 'Stamp card') : tr ? 'Puan kartı' : 'Points card'}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const kindSwitch = (
    <Field label={tr ? 'Kart türü' : 'Card type'} hint={kindLocked ? (tr ? 'Üyeler olduğu için kart türü değiştirilemez.' : 'The type is fixed once the card has members.') : undefined}>
      <div className="inline-flex rounded-[14px] border border-pn-line bg-pn-canvas p-1" role="radiogroup" aria-label={tr ? 'Kart türü' : 'Card type'}>
        {(['stamps', 'points'] as LoyaltyKind[]).map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={draft.kind === k}
            disabled={kindLocked && draft.kind !== k}
            onClick={() =>
              setDraft((d) => ({
                ...d,
                kind: k,
                ...(k === 'points' && d.pointsPerVisit === 0 && d.pointsPerSpend === 0 ? { pointsPerVisit: 10 } : {}),
                rewards: d.rewards.map((r) => ({ ...r, cost: k === 'stamps' ? Math.min(r.cost, L.stampCostMax) : r.cost })),
                welcomeBonus: k === 'stamps' ? Math.min(d.welcomeBonus, L.welcomeBonusMaxStamps) : d.welcomeBonus,
              }))
            }
            className={`min-h-[36px] rounded-[10px] px-3 text-[13px] font-medium disabled:opacity-40 ${
              draft.kind === k ? 'bg-white text-pn-ink ' : 'text-[#525252]'
            }`}
          >
            {k === 'stamps' ? (tr ? 'Damga kartı' : 'Stamp card') : tr ? 'Puan kartı' : 'Points card'}
          </button>
        ))}
      </div>
    </Field>
  );

  const rulesSection = (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label={tr ? 'Kartın adı' : 'Card name'} htmlFor="loyalty-name" required>
          <input
            id="loyalty-name"
            value={draft.name}
            maxLength={L.nameMax}
            onChange={(e) => set('name', e.target.value)}
            className="bz-input w-full"
            placeholder={tr ? 'Kahve kartı' : 'Coffee card'}
          />
        </Field>
        {kindSwitch}
      </div>

      {draft.kind === 'points' && (
        <div className="rounded-[20px] border border-pn-line p-4">
          <p className="text-[13px] font-medium text-pn-ink">{tr ? 'Puan nasıl kazanılır?' : 'How points are earned'}</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <Field label={tr ? 'Her ziyarette' : 'Every visit'}>
              <NumberInput value={draft.pointsPerVisit} min={0} max={L.pointsPerVisitMax} onChange={(n) => set('pointsPerVisit', n)} suffix={tr ? 'puan' : 'points'} ariaLabel={tr ? 'Ziyaret başına puan' : 'Points per visit'} />
            </Field>
            <Field label={tr ? 'Harcamaya göre (isteğe bağlı)' : 'By spend (optional)'}>
              <div className="flex flex-wrap items-center gap-2 text-[13px] text-[#737373]">
                <span>{tr ? 'Her' : 'Every'}</span>
                <NumberInput value={draft.spendStep} min={0} max={L.spendStepMax} onChange={(n) => set('spendStep', n)} suffix="TL" ariaLabel={tr ? 'Harcama adımı (TL)' : 'Spend step (TL)'} />
                <span>{tr ? 'harcamaya' : '→'}</span>
                <NumberInput value={draft.pointsPerSpend} min={0} max={L.pointsPerSpendMax} onChange={(n) => set('pointsPerSpend', n)} suffix={tr ? 'puan' : 'points'} ariaLabel={tr ? 'Harcama başına puan' : 'Points per spend step'} />
              </div>
            </Field>
          </div>
          <p className="mt-3 text-[13px] text-[#737373]">{earnRuleLine(draft, locale)}</p>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between">
          <p className="text-[13px] font-medium text-pn-ink">{tr ? 'Ödüller' : 'Rewards'}</p>
          <span className="text-[12px] text-[#737373]">
            {draft.kind === 'stamps'
              ? tr
                ? 'Ödül kaç damgada verilir?'
                : 'How many stamps for the reward?'
              : tr
                ? 'Ödül kaç puan?'
                : 'How many points for the reward?'}
          </span>
        </div>
        <ul className="mt-2 space-y-2">
          {draft.rewards.map((r, i) => (
            <li key={r.id ?? `new-${i}`} className="flex flex-col gap-2 rounded-[20px] border border-pn-line p-3 sm:flex-row sm:items-center">
              <input
                value={r.title}
                maxLength={L.rewardTitleMax}
                onChange={(e) => set('rewards', draft.rewards.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))}
                className="bz-input min-w-0 flex-1"
                placeholder={tr ? 'Ücretsiz kahve' : 'Free coffee'}
                aria-label={tr ? `${i + 1}. ödülün adı` : `Reward ${i + 1} name`}
              />
              <div className="flex items-center gap-2">
                <NumberInput
                  value={r.cost}
                  min={1}
                  max={stampMax ? L.stampCostMax : L.pointCostMax}
                  onChange={(n) => set('rewards', draft.rewards.map((x, j) => (j === i ? { ...x, cost: n } : x)))}
                  suffix={stampMax ? (tr ? 'damga' : 'stamps') : tr ? 'puan' : 'points'}
                  ariaLabel={tr ? `${i + 1}. ödülün bedeli` : `Reward ${i + 1} cost`}
                />
                <APSwitch
                  size="sm"
                  checked={r.isActive}
                  onChange={(v) => set('rewards', draft.rewards.map((x, j) => (j === i ? { ...x, isActive: v } : x)))}
                  ariaLabel={tr ? 'Ödül açık' : 'Reward active'}
                />
                <button
                  type="button"
                  onClick={() => set('rewards', draft.rewards.filter((_, j) => j !== i))}
                  disabled={draft.rewards.length <= 1}
                  className="bz-btn-icon disabled:opacity-30"
                  aria-label={tr ? 'Ödülü sil' : 'Remove reward'}
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </li>
          ))}
        </ul>
        {draft.rewards.length < L.rewardsMax && (
          <button
            type="button"
            onClick={() => set('rewards', [...draft.rewards, { title: '', description: '', cost: stampMax ? 10 : 200, isActive: true }])}
            className="bz-btn-ghost mt-2 inline-flex items-center gap-1.5"
          >
            <Plus size={14} /> {tr ? 'Ödül ekle' : 'Add reward'}
          </button>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          label={tr ? 'Katılınca hediye' : 'Welcome bonus'}
          hint={tr ? 'Kartı açan müşteriye ilk günden verilen damga / puan.' : 'Stamps / points given when a customer joins.'}
        >
          <NumberInput
            value={draft.welcomeBonus}
            min={0}
            max={stampMax ? L.welcomeBonusMaxStamps : L.welcomeBonusMaxPoints}
            onChange={(n) => set('welcomeBonus', n)}
            suffix={stampMax ? (tr ? 'damga' : 'stamps') : tr ? 'puan' : 'points'}
          />
        </Field>
        <Field
          label={tr ? 'Aynı karta tekrar işlem' : 'Repeat visits'}
          hint={tr ? 'Bir ziyaret iki kez sayılmasın diye. Kasada onayla geçilebilir.' : 'Stops a visit being counted twice. Staff can override.'}
        >
          <PulseSelect
            value={String(draft.visitCooldownMinutes)}
            onChange={(v) => set('visitCooldownMinutes', Number(v))}
            ariaLabel={tr ? 'Bekleme süresi' : 'Cooldown'}
            options={[0, 30, 60, 120, 240, 720, 1440].map((m) => ({
              value: String(m),
              label:
                m === 0
                  ? tr
                    ? 'Sınır yok'
                    : 'No limit'
                  : m < 60
                    ? tr
                      ? `${m} dakikada bir`
                      : `Once per ${m} min`
                    : tr
                      ? `${m / 60} saatte bir`
                      : `Once per ${m / 60} h`,
            }))}
          />
        </Field>
      </div>

      <details className="group rounded-[20px] border border-pn-line p-4">
        <summary className="cursor-pointer list-none text-[13px] font-medium text-pn-ink">
          {tr ? 'Gelişmiş: seviyeler, doğum günü, süre, görünüm' : 'Advanced: tiers, birthday, expiry, look'}
          <span className="ml-2 font-normal text-[#737373] group-open:hidden">{tr ? '(isteğe bağlı)' : '(optional)'}</span>
        </summary>
        <div className="mt-4 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={tr ? 'Bakiye süresi' : 'Balance expiry'} hint={tr ? 'Son ziyaretten sonra bu süre geçerse bakiye sıfırlanır.' : 'The balance resets after this long without a visit.'}>
              <PulseSelect
                value={String(draft.expiryDays ?? 0)}
                onChange={(v) => set('expiryDays', Number(v) || null)}
                ariaLabel={tr ? 'Bakiye süresi' : 'Balance expiry'}
                options={[0, 90, 180, 365, 730].map((d) => ({
                  value: String(d),
                  label: d === 0 ? (tr ? 'Süresiz' : 'Never') : tr ? `${d} gün` : `${d} days`,
                }))}
              />
            </Field>
            <Field label={tr ? 'Doğum günü hediyesi' : 'Birthday gift'} hint={tr ? 'Doğum gününü yazan üyeye, doğduğu ay içinde yılda bir kez.' : 'Once a year in the member’s birth month (if they gave it).'}>
              <input
                value={draft.birthdayReward}
                maxLength={L.birthdayRewardMax}
                onChange={(e) => set('birthdayReward', e.target.value)}
                className="bz-input w-full"
                placeholder={tr ? 'Boş bırakırsanız kapalı' : 'Empty = off'}
              />
            </Field>
          </div>

          <div>
            <p className="text-[13px] font-medium text-pn-ink">{tr ? 'Seviyeler (en çok 3)' : 'Tiers (up to 3)'}</p>
            <p className="mt-0.5 text-[13px] text-[#737373]">
              {tr ? 'Ziyaret sayısına göre; ayrıcalığı kasada siz uygularsınız.' : 'By visit count; staff applies the perk.'}
            </p>
            <ul className="mt-2 space-y-2">
              {draft.tiers.map((t, i) => (
                <li key={i} className="grid gap-2 rounded-[20px] border border-pn-line p-3 sm:grid-cols-[1fr_auto_2fr_auto] sm:items-center">
                  <input value={t.name} maxLength={L.tierNameMax} onChange={(e) => set('tiers', draft.tiers.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)))} className="bz-input" placeholder={tr ? 'Gümüş' : 'Silver'} aria-label={tr ? 'Seviye adı' : 'Tier name'} />
                  <NumberInput value={t.minVisits} min={1} max={L.tierMinVisitsMax} onChange={(n) => set('tiers', draft.tiers.map((x, j) => (j === i ? { ...x, minVisits: n } : x)))} suffix={tr ? 'ziyaret' : 'visits'} ariaLabel={tr ? 'Gereken ziyaret' : 'Visits needed'} />
                  <input value={t.perk} maxLength={L.tierPerkMax} onChange={(e) => set('tiers', draft.tiers.map((x, j) => (j === i ? { ...x, perk: e.target.value } : x)))} className="bz-input" placeholder={tr ? 'Her ziyarette ücretsiz içecek' : 'A free drink every visit'} aria-label={tr ? 'Ayrıcalık' : 'Perk'} />
                  <button type="button" onClick={() => set('tiers', draft.tiers.filter((_, j) => j !== i))} className="bz-btn-icon" aria-label={tr ? 'Seviyeyi sil' : 'Remove tier'}>
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
            {draft.tiers.length < L.tiersMax && (
              <button
                type="button"
                onClick={() => set('tiers', [...draft.tiers, { name: '', minVisits: (draft.tiers.at(-1)?.minVisits ?? 5) + 5, perk: '' }])}
                className="bz-btn-ghost mt-2 inline-flex items-center gap-1.5"
              >
                <Plus size={14} /> {tr ? 'Seviye ekle' : 'Add tier'}
              </button>
            )}
          </div>

          <Field label={tr ? 'Kart rengi' : 'Card colour'}>
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label={tr ? 'Kart rengi' : 'Card colour'}>
              {SWATCHES.map((c) => {
                const on = (draft.accentColor ?? '#0A0A0A') === c;
                return (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={on}
                    aria-label={c}
                    onClick={() => set('accentColor', c === '#0A0A0A' ? null : c)}
                    className={`h-9 w-9 rounded-full border-2 ${on ? 'border-pn-accent-hover ring-2 ring-pn-accent/60' : 'border-pn-line'}`}
                    style={{ background: c }}
                  />
                );
              })}
            </div>
          </Field>

          <Field label={tr ? 'Koşullar (müşteri kartında görünür)' : 'Terms (shown on the card)'}>
            <textarea
              value={draft.terms}
              maxLength={L.termsMax}
              onChange={(e) => set('terms', e.target.value)}
              rows={3}
              className="bz-input w-full"
              placeholder={tr ? 'Örn. Ödüller nakde çevrilmez. Kampanyalarla birleştirilmez.' : 'E.g. Rewards cannot be exchanged for cash.'}
            />
          </Field>
        </div>
      </details>

      <AlertBanner kind="info">
        {tr
          ? 'Kart yalnız ziyaret ve alışverişle dolar. Yorum ya da puan karşılığında damga vermeyin; Google kuralları buna izin vermez.'
          : 'The card fills only with visits and purchases. Never give stamps for a review or a rating — Google does not allow it.'}
      </AlertBanner>
    </div>
  );

  const summary = (
    <ul className="space-y-1.5 text-[14px] text-[#262626]">
      <li>{earnRuleLine(draft, locale)}</li>
      {draft.rewards
        .filter((r) => r.isActive && r.title.trim())
        .map((r, i) => (
          <li key={i}>• {rewardRuleLine(draft.kind, r, locale)}</li>
        ))}
      {draft.welcomeBonus > 0 && (
        <li>• {tr ? `Katılınca ${draft.welcomeBonus} ${draft.kind === 'stamps' ? 'damga' : 'puan'} hediye` : `Welcome bonus: ${draft.welcomeBonus}`}</li>
      )}
      {draft.birthdayReward.trim() && <li>• {tr ? `Doğum günü: ${draft.birthdayReward}` : `Birthday: ${draft.birthdayReward}`}</li>}
      {draft.tiers.filter((t) => t.name.trim()).map((t, i) => (
        <li key={`t${i}`}>• {tr ? `${t.name}: ${t.minVisits}. ziyaretten sonra${t.perk ? ` — ${t.perk}` : ''}` : `${t.name}: from visit ${t.minVisits}${t.perk ? ` — ${t.perk}` : ''}`}</li>
      ))}
    </ul>
  );

  const previewColumn = (
    <aside className="space-y-3 lg:sticky lg:top-4">
      <p className="text-[12px] font-medium text-[#737373]">{tr ? 'Müşterinin göreceği kart' : 'What the customer sees'}</p>
      {preview}
      <div className="rounded-[20px] border border-pn-line bg-pn-canvas p-4">{summary}</div>
    </aside>
  );

  if (!canManage) {
    return (
      <AlertBanner kind="info">
        {tr ? 'Programı yalnız işletme sahibi ya da yönetici düzenleyebilir.' : 'Only the owner or a manager can edit the programme.'}
      </AlertBanner>
    );
  }

  if (mode === 'wizard') {
    const steps = [
      { label: tr ? 'Kart türü' : 'Card type', short: tr ? 'Tür' : 'Type' },
      { label: tr ? 'Kurallar ve ödüller' : 'Rules and rewards', short: tr ? 'Kurallar' : 'Rules' },
      { label: tr ? 'Önizle ve yayınla' : 'Preview and publish', short: tr ? 'Yayınla' : 'Publish' },
    ];
    return (
      <div className="bz-card p-4 sm:p-6">
        <WizardSteps
          steps={steps}
          current={step}
          canSelect={(i) => i < step || (i === step + 1 && !stepProblem(step))}
          onSelect={(i) => setStep(i)}
          ariaLabel={tr ? 'Kurulum adımları' : 'Setup steps'}
        />
        <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_340px]">
          <div className="min-w-0">
            <div hidden={step !== 0}>{templatePicker}</div>
            <div hidden={step !== 1}>{rulesSection}</div>
            <div hidden={step !== 2}>
              <p className="text-[14px] text-[#262626]">
                {tr
                  ? 'Yayına aldığınızda müşteriler kasadaki QR ile kart açabilir, siz de “Kasa” ekranından damga / puan verirsiniz.'
                  : 'Once published, customers open a card with the QR at the counter and you add stamps / points from the “Counter” screen.'}
              </p>
              <p className="mt-3 text-[13px] text-[#737373]">
                {tr ? 'Yayına alarak ' : 'By publishing you accept the '}
                <a href={`/${locale}/sadakat-isletme-eki`} target="_blank" rel="noopener" className="font-medium text-pn-ink underline underline-offset-2">
                  {tr ? 'Sadakat programı işletme ekini' : 'loyalty programme business addendum'}
                </a>
                {tr
                  ? ' kabul edersiniz: üye bilgilerinin veri sorumlusu işletmenizdir; yorum ya da puan karşılığı damga verilmez.'
                  : ': your business is the data controller of member data; no stamps for reviews or ratings.'}
              </p>
              <div className="mt-4 lg:hidden">{summary}</div>
            </div>
            {error && (
              <div className="mt-4">
                <AlertBanner kind="danger" onDismiss={() => setError(null)}>
                  {error}
                </AlertBanner>
              </div>
            )}
            <div className="mt-6 flex flex-col-reverse gap-2 border-t border-pn-line pt-4 sm:flex-row sm:items-center sm:justify-between">
              <button type="button" className="bz-btn-ghost" disabled={step === 0} onClick={() => setStep((s) => Math.max(0, s - 1))}>
                {tr ? 'Geri' : 'Back'}
              </button>
              {step < 2 ? (
                <button
                  type="button"
                  className="bz-btn-primary"
                  onClick={() => {
                    const p = stepProblem(step);
                    if (p) setError(p);
                    else {
                      setError(null);
                      setStep((s) => s + 1);
                    }
                  }}
                >
                  {tr ? 'İleri' : 'Next'}
                </button>
              ) : (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <button type="button" className="bz-btn-ghost" disabled={saving !== null} onClick={() => void save('draft')}>
                    {saving === 'draft' && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
                    {tr ? 'Taslak olarak kaydet' : 'Save as draft'}
                  </button>
                  <button type="button" className="bz-btn-lime" disabled={saving !== null} onClick={() => void save('publish')}>
                    {saving === 'publish' && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
                    {tr ? 'Kartı yayına al' : 'Publish the card'}
                  </button>
                </div>
              )}
            </div>
          </div>
          <div className="hidden lg:block">{previewColumn}</div>
          {step > 0 && <div className="lg:hidden">{preview}</div>}
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <div className="bz-card min-w-0 p-4 sm:p-6">
        <div className="mb-5 flex flex-col gap-3 border-b border-pn-line pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[15px] font-medium text-pn-ink">{tr ? 'Program ayarları' : 'Programme settings'}</p>
            <p className="text-[13px] text-[#737373]">
              {tr ? 'Değişiklikler kaydedince müşterinin kartında hemen görünür.' : 'Changes show on customer cards as soon as you save.'}
            </p>
          </div>
          <APSwitch
            checked={draft.isActive}
            onChange={(v) => set('isActive', v)}
            label={draft.isActive ? (tr ? 'Yayında' : 'Live') : tr ? 'Duraklatıldı' : 'Paused'}
            sublabel={tr ? 'Kapalıyken katılım ve kasa işlemleri durur' : 'Paused: no joining, no counter actions'}
          />
        </div>
        {rulesSection}
        {error && (
          <div className="mt-4">
            <AlertBanner kind="danger" onDismiss={() => setError(null)}>
              {error}
            </AlertBanner>
          </div>
        )}
        {notice && (
          <div className="mt-4">
            <AlertBanner kind="success" onDismiss={() => setNotice(null)}>
              {notice}
            </AlertBanner>
          </div>
        )}
        <div className="mt-6 flex justify-end border-t border-pn-line pt-4">
          <button type="button" className="bz-btn-primary" disabled={saving !== null} onClick={() => void save('save')}>
            {saving === 'save' && <Loader2 size={14} className="mr-1.5 inline animate-spin" />}
            {tr ? 'Kaydet' : 'Save'}
          </button>
        </div>
      </div>
      {previewColumn}
    </div>
  );
}
