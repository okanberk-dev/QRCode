# Buaze panel tasarım sistemi (NICKLPASS uyarlaması)

Owner (`/[locale]/dashboard/**`) ve admin (`/admin/**`) panellerinin görsel dili. Kaynak: Behance
"NICKLPASS | HYPERACTIVE | SAAS" (Hyperactive Studio, 2025). Ölçüler, tipografi ve bileşen anatomisi bu
projeden alındı; **renkler Buaze Pulse paletine uyarlandı** (CLAUDE.md §11). Proje "All Rights Reserved":
görselleri, logoları, illüstrasyonları ve metinleri kopyalamıyoruz; yalnız ölçü ve düzen dilini
uyguluyoruz.

Bu belge tek kaynaktır. Kod: `src/app/globals.css` → `§53 Panel design system` bloğu (`:root:has(.bz-panel)`),
`src/lib/panel-fonts.ts` + `src/components/panel/PanelTheme.tsx`, `src/components/ui/` (aşağıdaki
bileşenler). Pazarlama sitesi, `/r`, `/menu`, `/s`, `/billing/*` ve e-postalar bu sistemi kullanmaz.

---

## 1. Kaynaktan ölçülenler

Görseller 2880 px genişliğinde, panel ekranları yaklaşık 1,65-1,7 ölçekle yerleştirilmiş. Değerler
1440 px masaüstü tasarımına çevrildi ve 4 px ızgarasına yuvarlandı.

| Öğe | NICKLPASS | Buaze |
|---|---|---|
| Yazı ailesi | Geometrik grotesk (DM Sans karakterinde: çift katlı a, düz kuyruklu y, açık aperture) | **DM Sans** (SIL OFL, Google Fonts), `latin` + `latin-ext` |
| Vurgu yazısı | Pazarlamada serif italik | Panelde yok (panel sade kalır) |
| Sayfa zemini | Soğuk açık gri `#F2F3F6` | `--pn-canvas` `#F4F4F5` |
| Kart yüzeyi | Kırık beyaz `#FAFAFA`, kenarlıksız, çok yumuşak gölge | `--pn-surface` `#FFFFFF`, kenarlık yok, gölge `--pn-shadow-card` |
| İç satır yüzeyi | `#F6F7F9` | `--pn-surface-2` `#F7F7F8` |
| Birincil renk | Kobalt mavi `#2849D4` (dolgulu kart, aktif menü, birincil düğme, sayı çipi) | **Grafit** `#0A0A0A` (aynı roller) + **lime** `#C6F24E` vurgu (aktif menü ikonu, odak halkası, ilerleme, desen çizgileri) |
| Pastel karolar | Şeftali / kum | `--pn-tint-lime` `#EAF9B8`, `--pn-tint-sand` `#F4EFE6`, `--pn-tint-neutral` `#F4F4F5` |
| Ana metin | `#16171C` | `--pn-ink` `#0A0A0A` |
| İkincil metin | Mavi-gri `#8A92A3` | `--pn-ink-2` `#737373` |
| Üçüncül metin | `#B4B9C4` | `--pn-ink-3` `#A3A3A3` |
| Ayırıcı | `#ECEDF1` | `--pn-line` `#EDEDED` |

## 2. Tipografi (DM Sans)

| Rol | Boyut / satır | Ağırlık | Not |
|---|---|---|---|
| Sayfa başlığı (h1) | 24/30 (telefon 22/28) | 600 | `letter-spacing: -0.015em` |
| Bölüm başlığı (h2, "Community") | 18/24 | 600 | |
| Kart başlığı (h3) | 16/22 | 600 | |
| Öne çıkan kart başlığı | 20/26 | 600 | beyaz, grafit kart üstünde |
| Gövde | 14/20 | 400 | |
| Satır başlığı | 14/20 | 500 | liste, tablo |
| Etiket + değer ("Started: 10/09") | 13/18 | etiket 400 `--pn-ink-2`, değer 500 `--pn-ink` | |
| Meta / ikincil | 12.5/18 | 400 | `--pn-ink-2` |
| Küçük | 12/16 | 500 | çip, rozet |
| Eyebrow | 11/14 | 600, büyük harf, `0.06em` | DM Sans (mono değil) |
| Sayı (KPI) | 28/32 | 600 | `font-variant-numeric: tabular-nums` |

Mono (JetBrains Mono) yalnız kod, kimlik ve kısayol tuşu gösterimlerinde kalır.

## 3. Ölçüler

| Token | Değer | Kullanım |
|---|---|---|
| `--pn-radius-xs` | 6 px | çip, rozet |
| `--pn-radius-sm` | 8 px | düğme, girdi, logo karosu, menü öğesi |
| `--pn-radius-md` | 12 px | liste satırı, menü kutusu, segment kontrol |
| `--pn-radius-lg` | 16 px | kart, öne çıkan kart, pencere |
| `--pn-radius-xl` | 20 px | kenar çubuğu yüzeyi (yüzen ray) |
| Izgara aralığı | 16 px (telefon 12) | kart ızgaraları |
| Kart iç boşluğu | 20 px (telefon 16) | |
| Liste satırı | min 56 px, 12/14 px iç boşluk, satırlar arası 8 px | bildirim, makale, işletme satırları |
| Kenar çubuğu | 248 px (daraltılmış 72), öğe 40 px, ikon 18 px / 1.75 çizgi, metin 14/500, öğeler arası 2 px | |
| Üst çubuk | 64 px | |
| Avatar | 40 px liste, 32 px üst çubuk, 56 px topluluk | |
| Logo karosu | 36 px, 8 px köşe, beyaz zemin, 1 px `--pn-line` | öne çıkan kartta beyaz, kenarlıksız |

Gölgeler:
- `--pn-shadow-card`: `0 1px 2px rgba(10,10,10,.04), 0 6px 20px -8px rgba(10,10,10,.06)`
- `--pn-shadow-pop`: `0 16px 40px -12px rgba(10,10,10,.18), 0 2px 6px rgba(10,10,10,.06)` (menü, pencere)

Odak: `0 0 0 3px rgba(198,242,78,.55)` + grafit kenarlık (tüm etkileşimli öğeler).

## 4. Bileşenler

### 4.1 Düğmeler (CSS sınıfları; ortak `Button` bileşeni yok, CLAUDE.md §7)

| Sınıf | Görünüm | Kaynaktaki karşılığı |
|---|---|---|
| `bz-btn-primary` | Grafit dolgu, beyaz yazı, 8 px | "Continue reading on the site", "Next", "Pay now" |
| `bz-btn-lime` | Lime dolgu, grafit yazı | Buaze'ye özgü vurgu CTA |
| `bz-btn-outline` **(yeni)** | 1 px grafit kenarlık, şeffaf zemin, grafit yazı | "Add to favorites", "Request Now" |
| `bz-btn-ghost` | Beyaz zemin, 1 px `--pn-line`, yumuşak gölge | ikincil işlemler |
| `bz-btn-text` **(yeni)** | Zeminsiz, ikon + yazı, hover'da lime alt çizgi | "Send", "Buy NICKLs", "View all your publishers" |
| `bz-btn-danger`, `bz-btn-warn` | mevcut | |
| `bz-btn-icon` | 36 px kare, 8 px | üst çubuk, satır sonu |
| Boyut: `bz-btn-sm` / varsayılan / `bz-btn-lg` **(yeni)** | 32 / 36 / 44 px yükseklik | telefonda en az 44 px dokunma alanı korunur |

### 4.2 Çipler ve rozetler

| Sınıf | Görünüm | Karşılığı |
|---|---|---|
| `bz-chip` **(yeni)** | Grafit dolgu, beyaz 12/500 yazı, 6 px, 24 px yükseklik | "500 NICKLs", "Mootley Group" |
| `bz-chip-lime` **(yeni)** | Lime dolgu, grafit yazı | öne çıkan sayı |
| `bz-chip-soft` **(yeni)** | `--pn-surface-2` zemin, ikincil yazı | "+150", "3h ago" |
| `bz-chip-sand` **(yeni)** | kum zemin, kahverengi yazı | "300 realtime readers" |
| `bz-badge--*` | mevcut durum rozetleri (6 px) | |

### 4.3 React bileşenleri (`src/components/ui`)

| Bileşen | Amaç | Karşılığı |
|---|---|---|
| `MetaBar` + `MetaItem` **(yeni)** | Sayfa üstü etiket/değer şeridi; açık zeminli 28 px kutular | "Started: 10/09/2022 · Next payment · You have 11 members" |
| `FeatureCard` **(yeni)** | Grafit kart, lime çizgi deseni, beyaz logo karosu, 20/600 başlık, beyaz/70 meta; link olabilir | yayıncı kartları ("Bloomberg / Last visited") |
| `ListRow` **(yeni)** | Önde avatar/karo, başlık + meta, sonda değer/ok; `active` grafit dolgu | bildirim ve makale satırları |
| `LogoTile` **(yeni)** | 36 px karo, harf ya da görsel | yayıncı logoları |
| `StatCard` | `tone`: `default` / `lime` / `sand` / `graphite` **(yeni)** | "91% Usage Rate" pastel karolar |
| `PageHeader` | 24/600 başlık, 13 px açıklama, sağda işlemler; `meta` prop'u başlığın altına `MetaBar` koyar (telefonda gizlenebilir) | "Welcome, John Doe" |

### 4.4 Diğer

- **Kenar çubuğu**: beyaz yüzey; gruplar arası 1 px ayırıcı; öğe 40 px, 10 px köşe; aktif öğe grafit dolgu + beyaz yazı + lime ikon; hover `--pn-surface-2`.
- **Sekmeler (`bz-tabs`)**: segment kontrol; aktif sekme grafit dolgu + beyaz yazı (kaynaktaki "Trending / Saved").
- **Girdiler**: 44 px (masaüstü 40), 8 px, 1 px `#E4E4E7`, beyaz; odakta grafit kenarlık + lime halka.
- **Tablolar**: başlık 12.5/500 ikincil, satır 56 px, hover `--pn-surface-2`, kenarlıksız kart içinde.
- **Menü / pencere**: 12 px / 16 px köşe, `--pn-shadow-pop`.
- **İlerleme**: 6 px, lime dolgu, grafit iz (başarı satırlarındaki mavi çubuk).

### 4.5 Uygulanan sayfalar

- Owner ana panel: `meta` şeridi (İşletme, Bugün; telefonda gizli), KPI'larda ilk kart `tone="graphite"`, yanıt oranı `tone="lime"`.
- Admin ana panel: `meta` şeridi (İşletme, Deneme, son 24 saat; `md` altında gizli), MRR `graphite`, aktif denemeler `lime`.
- Bir sayfada en çok bir grafit ve bir lime kart: vurgu seyrek kalır.

## 5. Kurallar

- Paneller dışında kullanılmaz; seçici her zaman `:root:has(.bz-panel)`.
- Yeni renk yok: yalnız Pulse paleti + `--pn-tint-sand`.
- Grafit dolgu = "seçili / birincil"; lime = "vurgu / odak / ilerleme". Lime üstüne beyaz yazı yazılmaz.
- Müşteri içeriği (menü önizlemesi, QR görselleri) bu fontu kullanmaz; menü kendi `--m-*` değişkenlerini kullanır.
- Telefonda dokunma alanı en az 44 px, yatay kaydırma yok, en küçük metin 12 px.
- Yeni panel bileşeni eklerken bu belgeye satır ekle.

## 6. QA listesi

375 / 768 / 1440 px: owner ana panel, yorumlar, müşteriler, analitik, QR, menü, Hesabım → Plan ve faturalama;
admin ana panel, işletmeler, işletme sahipleri. Kontrol: yatay taşma, metin kesilmesi, odak halkası,
kontrast (AA), konsol hatası.
