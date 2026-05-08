'use client';

/**
 * Stage 68 §38.149 — HANDOFF JSX prototip "Admin & Owner panel UI v2"
 * showcase frames. Mevcut Stage 65 §38.146 + Stage 37 §38.117 + Stage 47
 * §38.128 ile production'a alınmış 24 AP* primitive'in canlı demo
 * sayfası. Owner + admin panellerinde dev-only (NODE_ENV !== 'production')
 * route'larında görünür: `/admin/dev/panel-ui` (admin) +
 * `/[locale]/dashboard/dev/panel-ui` (owner).
 *
 * 6 frame:
 *  1) APButtonShowcase — buttons (8 variant) + icon buttons (3 size) +
 *     segmented + chips (7 tone) + FAB + split + button group
 *  2) APTogglesShowcase — switches (sm/md/lg + locked) + checkbox
 *     (3-state) + radio group + toggle cards + slider + star input
 *  3) APKpiShowcase — 4 KPI cards with sparklines + delta chips
 *  4) APInboxShowcase — inbox card with segmented filter + items + bulk
 *  5) APOwnerShowcase — owner cards (location + team + billing + qr +
 *     alert + empty)
 *  6) APAlertsShowcase — alert + empty + composer + quick settings
 *
 * Compliance disipline (CLAUDE.md §35.8 + §35.10 + §19.1.1 + §38.130
 * paterni intact): tüm sample data jenerik (özel müşteri ismi yok,
 * verifiable claim — fake metric/rating yok). Email + name + KPI
 * value'lar showcase placeholder; gerçek backend bağlı değil.
 *
 * Pulse §11 disipline (kullanıcı kararı §38.114 "Asla pivot etme"
 * intact): synthetic italic Space Grotesk + lime/graphite/N-scale
 * palette; primitive'ler kendi içinde Pulse hex map taşır.
 *
 * State management: caller-controlled (showcase pages kendi useState
 * tutar, primitive'ler stateless).
 *
 * A11y: showcase wrapper `<section>` + `<h2>` + `aria-label`; primitive
 * a11y patternleri intact (focus-visible lime ring + aria-pressed +
 * role="switch"/"radiogroup"/"slider").
 */

import { useState } from 'react';
import {
  Bell,
  CalendarClock,
  CheckCircle2,
  MessageSquareText,
  Plus,
  RefreshCw,
  Send,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  APAIDraftCard,
  APAlertCard,
  APBillingCard,
  APButton,
  APButtonGroup,
  APCard,
  APCheckbox,
  APChip,
  APComposerCard,
  APEmptyCard,
  APFab,
  APIconButton,
  APInboxCard,
  APKpiCard,
  APLocationCard,
  APQRCard,
  APQuickSettingsCard,
  APRadioGroup,
  APSegmented,
  APSlider,
  APSplitButton,
  APStarInput,
  APSwitch,
  APTeamCard,
  APToggleCard,
} from '@/components/ui';

interface FrameProps {
  number: number;
  title: string;
  description: string;
  children: React.ReactNode;
}

function Frame({ number, title, description, children }: FrameProps) {
  return (
    <section
      aria-labelledby={`frame-${number}`}
      className="rounded-2xl border border-[#EDEDED] bg-white p-6 sm:p-8"
    >
      <header className="mb-6 flex items-baseline gap-3">
        <span className="pulse-eyebrow text-[#A3A3A3]">FRAME {number}</span>
        <h2
          id={`frame-${number}`}
          className="text-[20px] font-medium tracking-[-0.02em] text-[#0A0A0A]"
          style={{
            fontFamily: 'var(--font-heading), var(--font-space-grotesk), system-ui, sans-serif',
            fontStyle: 'italic',
          }}
        >
          {title}
        </h2>
      </header>
      <p className="mb-6 text-[13px] leading-[1.6] text-[#525252]">{description}</p>
      <div className="space-y-6">{children}</div>
    </section>
  );
}

function Subhead({ label }: { label: string }) {
  return <h3 className="pulse-eyebrow mb-2 text-[#525252]">{label}</h3>;
}

/* ============================================================
 * Frame 1 — Buttons / Icon Buttons / Segmented / Chips / FAB
 * ============================================================ */

function APButtonShowcase() {
  const [seg, setSeg] = useState<'all' | 'low' | 'high'>('all');
  return (
    <Frame
      number={1}
      title="APButton & APChip & APSegmented"
      description="8 variant buton (primary/secondary/dark/darkLime/ghost/danger/success/limeOutline) + 4 size + loading + badge + kbd + FAB + split + button group + 7 tone chip + segmented filter."
    >
      <div>
        <Subhead label="VARIANTS" />
        <div className="flex flex-wrap items-center gap-3">
          <APButton variant="primary">Primary</APButton>
          <APButton variant="secondary">Secondary</APButton>
          <APButton variant="dark">Dark</APButton>
          <APButton variant="darkLime" icon={<Sparkles size={14} />}>
            Dark + Lime
          </APButton>
          <APButton variant="ghost">Ghost</APButton>
          <APButton variant="danger" icon={<Trash2 size={14} />}>
            Danger
          </APButton>
          <APButton variant="success" icon={<CheckCircle2 size={14} />}>
            Success
          </APButton>
          <APButton variant="limeOutline">Lime outline</APButton>
        </div>
      </div>

      <div>
        <Subhead label="SIZES + STATES" />
        <div className="flex flex-wrap items-center gap-3">
          <APButton size="xs">XS</APButton>
          <APButton size="sm">Small</APButton>
          <APButton size="md">Medium</APButton>
          <APButton size="lg">Large</APButton>
          <APButton loading>Loading</APButton>
          <APButton disabled>Disabled</APButton>
          <APButton badge={3} icon={<Bell size={14} />}>
            With badge
          </APButton>
          <APButton kbd="⌘K">With kbd</APButton>
        </div>
      </div>

      <div>
        <Subhead label="ICON BUTTONS" />
        <div className="flex items-center gap-3">
          <APIconButton size="sm" ariaLabel="Notification">
            <Bell size={14} />
          </APIconButton>
          <APIconButton size="md" ariaLabel="Notification" badge={5}>
            <Bell size={16} />
          </APIconButton>
          <APIconButton size="lg" tone="lime" ariaLabel="Add">
            <Plus size={20} />
          </APIconButton>
          <APIconButton size="md" tone="dark" ariaLabel="Settings">
            <Sparkles size={16} />
          </APIconButton>
        </div>
      </div>

      <div>
        <Subhead label="SEGMENTED + CHIPS" />
        <div className="flex flex-wrap items-center gap-3">
          <APSegmented
            options={[
              { value: 'all', label: 'Tümü' },
              { value: 'low', label: 'Düşük' },
              { value: 'high', label: 'Yüksek' },
            ]}
            value={seg}
            onChange={setSeg}
            ariaLabel="Filter"
          />
          <APChip tone="lime" dot>
            Aktif
          </APChip>
          <APChip tone="success" dot>
            Onaylandı
          </APChip>
          <APChip tone="warn" dot>
            Beklemede
          </APChip>
          <APChip tone="danger" dot>
            Düşük puan
          </APChip>
          <APChip tone="info" dot>
            Yeni
          </APChip>
          <APChip tone="dark" dot>
            Pulse AI
          </APChip>
          <APChip tone="default" removable onRemove={() => {}} removeAriaLabel="Filtreyi kaldır">
            yemek
          </APChip>
        </div>
      </div>

      <div>
        <Subhead label="FAB / SPLIT / GROUP" />
        <div className="flex flex-wrap items-center gap-4">
          <APFab tone="lime" ariaLabel="Yeni QR" icon={<Plus size={20} />} />
          <APFab tone="dark" ariaLabel="Yeni mesaj" icon={<Send size={18} />} />
          <APSplitButton
            primaryAriaLabel="Onayla & gönder"
            menuAriaLabel="Daha fazla seçenek"
            onPrimaryClick={() => {}}
            onMenuClick={() => {}}
          >
            Onayla & gönder
          </APSplitButton>
          <APButtonGroup
            items={[
              { value: 'left', label: 'Sol' },
              { value: 'mid', label: 'Orta' },
              { value: 'right', label: 'Sağ' },
            ]}
            value="mid"
            onChange={() => {}}
            ariaLabel="Hizalama"
          />
        </div>
      </div>
    </Frame>
  );
}

/* ============================================================
 * Frame 2 — Toggles / Checkbox / Radio / Slider / Stars
 * ============================================================ */

function APTogglesShowcase() {
  const [s1, setS1] = useState(true);
  const [s2, setS2] = useState(false);
  const [s3, setS3] = useState(true);
  const [c1, setC1] = useState(false);
  const [c2, setC2] = useState(true);
  const [radio, setRadio] = useState<'tr' | 'en' | 'mix'>('tr');
  const [slider, setSlider] = useState(64);
  const [stars, setStars] = useState(4);
  const [tone1, setTone1] = useState(true);
  const [tone2, setTone2] = useState(false);

  return (
    <Frame
      number={2}
      title="APSwitch & APCheckbox & APRadioGroup & APSlider"
      description="iOS-style switch (sm/md/lg + locked) + indeterminate checkbox + radio group + slider + star input + toggle card. Pulse §11 lime fill + 240ms cubic-bezier transition."
    >
      <div>
        <Subhead label="SWITCHES" />
        <div className="flex flex-col gap-3">
          <APSwitch
            checked={s1}
            onChange={setS1}
            size="sm"
            label="Otomatik AI taslak"
            sublabel="Düşük puanlı yorumlara otomatik öneri."
          />
          <APSwitch
            checked={s2}
            onChange={setS2}
            size="md"
            label="Anlık bildirim"
            sublabel="1-3 yıldızda push gönder."
          />
          <APSwitch
            checked={s3}
            onChange={setS3}
            size="lg"
            label="Haftalık özet maili"
            sublabel="Her pazartesi 09:00 ekibe."
          />
          <APSwitch checked locked label="Premium özellik" sublabel="Plan: Pro & üzeri." />
        </div>
      </div>

      <div>
        <Subhead label="CHECKBOX (3-state)" />
        <div className="flex flex-col gap-2.5">
          <APCheckbox checked={c1} onChange={setC1} label="Bilgilendirme maili" sublabel="ETK uyumlu." />
          <APCheckbox
            checked={c2}
            onChange={setC2}
            label="Pazarlama izni"
            sublabel="Kampanya & duyurular için."
          />
          <APCheckbox
            indeterminate
            checked
            onChange={() => {}}
            label="Tüm yorumlar (kısmî seçim)"
            sublabel="3 / 5 alt grup seçili."
          />
        </div>
      </div>

      <div>
        <Subhead label="RADIO GROUP" />
        <APRadioGroup<'tr' | 'en' | 'mix'>
          name="locale"
          value={radio}
          onChange={(v) => setRadio(v)}
          options={[
            { value: 'tr', label: 'Türkçe', sublabel: 'Varsayılan' },
            { value: 'en', label: 'English' },
            { value: 'mix', label: 'Otomatik', sublabel: 'Müşteri locale\'i' },
          ]}
          ariaLabel="Yanıt dili"
        />
      </div>

      <div>
        <Subhead label="SLIDER + STARS" />
        <div className="grid gap-6 sm:grid-cols-2">
          <APSlider
            label="AI yanıt sıcaklığı"
            min={0}
            max={100}
            step={4}
            value={slider}
            onChange={setSlider}
            suffix="%"
          />
          <APStarInput value={stars} onChange={setStars} ariaLabel="Genel deneyim" />
        </div>
      </div>

      <div>
        <Subhead label="TOGGLE CARDS" />
        <div className="grid gap-3 sm:grid-cols-2">
          <APToggleCard
            icon={<Sparkles size={18} />}
            title="Pulse AI"
            description="Düşük puana otomatik taslak öner."
            checked={tone1}
            onChange={setTone1}
            badge={
              <APChip tone="lime" dot>
                Beta
              </APChip>
            }
          />
          <APToggleCard
            icon={<Bell size={18} />}
            title="Anlık bildirim"
            description="Sahibine push + e-posta."
            checked={tone2}
            onChange={setTone2}
          />
        </div>
      </div>
    </Frame>
  );
}

/* ============================================================
 * Frame 3 — KPI Cards
 * ============================================================ */

function APKpiShowcase() {
  return (
    <Frame
      number={3}
      title="APKpiCard"
      description="38px italic hero value + JetBrains Mono suffix + delta chip + sparkline (lime gradient + endpoint circle). Dashboard / analytics overview block."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <APKpiCard
          label="ORTALAMA PUAN"
          value="4.7"
          suffix="/ 5"
          delta="+0.2"
          deltaTone="success"
          spark={[4.4, 4.5, 4.5, 4.6, 4.6, 4.7, 4.7, 4.6, 4.7, 4.7, 4.8]}
          icon={<Sparkles size={13} />}
        />
        <APKpiCard
          label="TOPLAM YORUM"
          value="312"
          suffix="bu ay"
          delta="+18%"
          deltaTone="success"
          spark={[210, 234, 240, 256, 268, 280, 290, 295, 302, 308, 312]}
          icon={<MessageSquareText size={13} />}
        />
        <APKpiCard
          label="YANIT ORANI"
          value="92"
          suffix="%"
          delta="+4 puan"
          deltaTone="lime"
          spark={[78, 80, 84, 84, 86, 88, 90, 91, 92, 92, 92]}
          icon={<CheckCircle2 size={13} />}
        />
        <APKpiCard
          label="ORT. YANIT SÜRESİ"
          value="2"
          suffix="sa 18 dk"
          delta="-22 dk"
          deltaTone="success"
          spark={[180, 170, 162, 155, 150, 145, 140, 138, 135, 130, 138]}
          icon={<CalendarClock size={13} />}
        />
      </div>
    </Frame>
  );
}

/* ============================================================
 * Frame 4 — Inbox + AI Draft
 * ============================================================ */

const INBOX_ITEMS = [
  {
    id: 'r1',
    name: 'A. Yıldız',
    stars: 5,
    body: 'Servis çok hızlıydı, garson ekibi nazikti. Tatlı seçimi muhteşem.',
    time: '12 dk',
    avatarTone: 'success' as const,
    initial: 'A',
  },
  {
    id: 'r2',
    name: 'M. Kaya',
    stars: 2,
    body: 'Yemek geç geldi, çorba soğuktu. Geçen sefer çok daha iyiydi.',
    time: '1 sa',
    avatarTone: 'danger' as const,
    initial: 'M',
  },
  {
    id: 'r3',
    name: 'Z. Demir',
    stars: 4,
    body: 'Atmosfer güzel, fiyat/performans uygun. Tatlı çeşidi artırılabilir.',
    time: '3 sa',
    avatarTone: 'warn' as const,
    initial: 'Z',
  },
];

function APInboxShowcase() {
  const [tab, setTab] = useState<'all' | 'low' | 'unanswered'>('all');
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const selectedCount = Object.values(selected).filter(Boolean).length;

  return (
    <Frame
      number={4}
      title="APInboxCard & APAIDraftCard"
      description="Compound inbox (header + segmented + items + bulk actions) + AI taslak card (graphite header + tone segmented + edit/approve)."
    >
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <APInboxCard
          headerLabel="GELEN KUTUSU"
          tabs={[
            { value: 'all', label: 'Tümü', count: 28 },
            { value: 'low', label: 'Düşük puan', count: 4 },
            { value: 'unanswered', label: 'Yanıtsız', count: 12 },
          ]}
          activeTab={tab}
          onTabChange={setTab}
          items={INBOX_ITEMS}
          selected={selected}
          onSelectedChange={setSelected}
          selectedLabel={`${selectedCount} seçildi`}
          bulkActions={
            <>
              <APButton size="sm" variant="dark" icon={<Send size={12} />}>
                Toplu yanıtla
              </APButton>
              <APButton size="sm" variant="ghost">
                Arşivle
              </APButton>
            </>
          }
        />
        <APAIDraftCard
          reply={
            'Merhaba, deneyiminiz için içtenlikle özür dileriz. Garson ekibimizle ' +
            'paylaştık ve önümüzdeki ziyaretinizde size özel olarak ilgileneceğiz.'
          }
          tone="warm"
          onToneChange={() => {}}
          customerName="M. Kaya"
          customerStars={2}
          tags={[
            { label: 'empatik', tone: 'lime' },
            { label: 'çözüm-odaklı', tone: 'info' },
          ]}
          onRegenerate={() => {}}
          onEdit={() => {}}
          onApprove={() => {}}
        />
      </div>
    </Frame>
  );
}

/* ============================================================
 * Frame 5 — Owner cards (Location + Team + Billing + QR)
 * ============================================================ */

function APOwnerShowcase() {
  const [active1, setActive1] = useState(true);
  const [active2, setActive2] = useState(false);

  return (
    <Frame
      number={5}
      title="APLocationCard & APTeamCard & APBillingCard & APQRCard"
      description="Owner panel temel kart bloğu: lokasyon + ekip + fatura + QR. Pulse §11 lime gradient avatar + graphite header + lime corner glow paterni."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <APLocationCard
          name="Buaze Karaköy"
          address="Karaköy Mah. Tersane Cd. No: 12 · İstanbul"
          rating={4.8}
          reviewCount={342}
          active={active1}
          onActiveChange={setActive1}
          onOpen={() => {}}
        />
        <APLocationCard
          name="Buaze Cihangir"
          address="Cihangir Mah. Akarsu Yokuşu · İstanbul"
          rating={4.5}
          reviewCount={196}
          active={active2}
          onActiveChange={setActive2}
          onOpen={() => {}}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <APTeamCard name="Cem Aydın" email="cem@buaze.com" role="owner" online />
        <APTeamCard name="Selin Korkmaz" email="selin@buaze.com" role="admin" online />
        <APTeamCard name="Burak Toprak" email="burak@buaze.com" role="member" />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <APBillingCard
          planName="Pulse Pro"
          active
          renewsAt="14 Haziran 2026"
          monthlyPrice="₺899/ay"
          quotaUsed={184}
          quotaTotal={500}
          onManage={() => {}}
          onUpgrade={() => {}}
        />
        <APQRCard
          label="QR KOD · MASA-04"
          qrSlot={
            <div
              aria-hidden="true"
              className="flex aspect-square w-full items-center justify-center rounded-[14px] bg-white"
              style={{ border: '1px solid rgba(10,10,10,0.06)' }}
            >
              <span
                className="text-[40px] font-medium tracking-[-0.02em]"
                style={{
                  fontFamily: 'var(--font-heading), system-ui, sans-serif',
                  fontStyle: 'italic',
                }}
              >
                bz.
              </span>
            </div>
          }
          downloadLabel="PNG indir"
          onDownload={() => {}}
          onShare={() => {}}
          shareAriaLabel="Paylaş"
        />
      </div>
    </Frame>
  );
}

/* ============================================================
 * Frame 6 — Alerts + Empty + Composer + Quick Settings
 * ============================================================ */

function APAlertsShowcase() {
  const [stars, setStars] = useState(0);
  const [text, setText] = useState('');
  const [tags, setTags] = useState<Record<string, boolean>>({});
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [slider, setSlider] = useState(72);
  const [toggles, setToggles] = useState<Record<string, boolean>>({
    auto: true,
    push: false,
    weekly: true,
  });

  return (
    <Frame
      number={6}
      title="APAlertCard & APEmptyCard & APComposerCard & APQuickSettingsCard"
      description="Negatif uyarı + boş durum + composer + ayar paneli. Inbox alert hub + onboarding empty state + NPS survey + settings hub kullanım örnekleri."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <APAlertCard
          alertLabel="NEGATİF UYARI"
          timestamp="2 dakika önce"
          rating={1}
          customerName="Anonim müşteri"
          customerLocation="Karaköy şubesi"
          body="Servis çok yavaştı, kahve soğuk geldi. Yöneticiyle konuşmak istiyorum."
          primaryLabel="Yanıtla"
          secondaryLabel="Yok say"
          onPrimary={() => {}}
          onSecondary={() => {}}
        />
        <APEmptyCard
          icon={<MessageSquareText size={26} />}
          title="Henüz yorum yok"
          body="Müşterilerin masada QR'a dokunduğunda yorumlar burada anında görünür."
          ctaLabel="QR oluştur"
          ctaIcon={<Plus size={14} />}
          onCtaClick={() => {}}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <APComposerCard
          eyebrow="HIZLI GERİ BİLDİRİM"
          title="Bugünkü deneyimini paylaş"
          stars={stars}
          onStarsChange={setStars}
          tags={[
            { key: 'food', label: 'Yemek' },
            { key: 'service', label: 'Servis' },
            { key: 'speed', label: 'Hız' },
            { key: 'atmosphere', label: 'Atmosfer' },
          ]}
          selectedTags={tags}
          onTagsChange={setTags}
          text={text}
          onTextChange={setText}
          textPlaceholder="Birkaç cümle yeterli…"
          onSubmit={() => {}}
          onCancel={() => {}}
        />
        <APQuickSettingsCard
          eyebrow="HIZLI AYARLAR"
          title="Sahibinin paneli"
          toggles={[
            {
              key: 'auto',
              icon: <Sparkles size={16} />,
              title: 'Otomatik AI taslak',
              description: 'Düşük puanlara öner.',
              checked: toggles.auto,
              badge: <APChip tone="lime" dot>Pro</APChip>,
            },
            {
              key: 'push',
              icon: <Bell size={16} />,
              title: 'Anlık bildirim',
              description: '1-3 yıldız push.',
              checked: toggles.push,
            },
            {
              key: 'weekly',
              icon: <CalendarClock size={16} />,
              title: 'Haftalık özet',
              description: 'Pazartesi 09:00 mail.',
              checked: toggles.weekly,
            },
          ]}
          onToggleChange={(key, next) => setToggles((prev) => ({ ...prev, [key]: next }))}
          sliderValue={slider}
          sliderLabel="AI sıcaklık"
          sliderSuffix="%"
          onSliderChange={setSlider}
          theme={theme}
          onThemeChange={setTheme}
          themeLightLabel="Aydınlık"
          themeDarkLabel="Karanlık"
        />
      </div>
    </Frame>
  );
}

/* ============================================================
 * Public — combined showcase
 * ============================================================ */

export function PanelUiShowcase({ surface }: { surface: 'admin' | 'owner' }) {
  return (
    <div className="space-y-6">
      <APCard padding={20} accent="#C6F24E">
        <div className="flex items-start gap-3">
          <span
            aria-hidden="true"
            className="flex shrink-0 items-center justify-center rounded-[12px]"
            style={{ width: 40, height: 40, background: '#EAF9B8' }}
          >
            <ShieldCheck size={18} />
          </span>
          <div>
            <p className="pulse-eyebrow text-[#737373]">DEV ONLY</p>
            <p className="mt-1 text-[14px] leading-[1.55] text-[#0A0A0A]">
              Bu sayfa <strong>Stage 65 §38.146</strong> AP* primitive showcase&apos;idir. 24 component
              canlı render edilir; mevcut callsite&apos;lar dokunulmaz (PR1-5&apos;te kademeli migrate).
              Yalnızca <code>NODE_ENV !== &apos;production&apos;</code>{' '}
              {surface === 'admin' ? 'superadmin' : 'owner'} tarafından erişilebilir.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <APChip tone="lime" dot>
                {surface === 'admin' ? 'admin/dev/panel-ui' : 'dashboard/dev/panel-ui'}
              </APChip>
              <APChip tone="info">24 primitive · 6 frame</APChip>
              <APChip tone="default">Pulse §11 · synthetic italic</APChip>
            </div>
          </div>
          <APIconButton
            ariaLabel="Yenile"
            tone="default"
            size="md"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
          </APIconButton>
        </div>
      </APCard>

      <APButtonShowcase />
      <APTogglesShowcase />
      <APKpiShowcase />
      <APInboxShowcase />
      <APOwnerShowcase />
      <APAlertsShowcase />
    </div>
  );
}
