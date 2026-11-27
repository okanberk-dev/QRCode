# Buaze panelleri — "Pano" tasarım sistemi

> Kaynak: Behance "lumin — Online Bank / Finance SaaS UX UI Design" (Mikalai
> Haluza, 2024). 22 görsel 3840 px genişlikte indirildi; düz çekilmiş "Cards"
> ekranı (1440 px tuval, 1 CSS px = 2,217 görsel px) üzerinden piksel ölçüldü,
> renkler görselden örneklendi. Bu ölçüler Buaze'nin owner ve admin
> panellerine birebir uyarlandı; **içerik, logo ve marka Buaze'nin**.
> Referansın logosu, "lumin" adı, illüstrasyonları (megafon, el fotoğrafları),
> avatarları, kart görselleri ve metinleri kullanılmaz.
>
> Kod: `src/components/panel/pano/` — `pano.css` (token + bileşen),
> `PanelTopNav.tsx` (üst menü), `PanoNumber.tsx` (kesirli sayı).
> Kapsam: `.bz-panel` kökünün olduğu sayfalar (owner `/[locale]/dashboard/*`,
> admin `/admin/*`). Pazarlama "Ritim" (`docs/design/MARKETING_DESIGN.md`),
> `/r`, `/menu`, `/l`, `/hesap`, auth ve e-postalar bu sistemi kullanmaz.

---

## 1. Tasarım dili — 10 kural

1. **Gri tuval, beyaz kartlar.** Sayfa zemini `#F5F5F8`; her içerik bloğu
   çerçevesiz beyaz, 28 px köşeli bir karttır. Gölge yok.
2. **Sıkı ızgara.** Kartlar arası boşluk 10 px. Boşluk kartın *içinde* (28 px),
   kartların arasında değil.
3. **Üç renk.** Siyah `#000`, beyaz, lime `#D7FE03`. Zeytin `#83AF3B` yalnız
   ikinci veri serisi ve olumlu metin içindir.
4. **Hap ve daire.** Metinli her buton hap (`border-radius: 999px`); ikonlu her
   buton 40–46 px dairedir. Köşeli buton yoktur.
5. **İnce, açık yazı.** Urbanist; başlıklar `400`, büyük sayılar `300`.
   Hiyerarşi boyutla kurulur, kalınlıkla değil.
6. **Sayının kesri gri.** `6.010,29` → `6.010` siyah, `,29` gri. Yüzde ve
   para birimi işareti de gri ve küçük.
7. **Yüzen üst menü.** Kenar çubuğu yok. Masaüstünde beyaz, 24 px köşeli,
   78 px yüksek bir bar; ortada metin sekmeleri, aktif sekme siyah hap.
8. **Koyu kahraman kart.** Sayfanın en önemli verisi siyah kartta durur;
   alt köşeden lime ışıma (radyal gradyan) yükselir.
9. **Taranmış kalan pay.** İlerleme ve halka grafiklerde dolmayan kısım
   45° çizgili (hatch) desenle gösterilir, düz gri değil.
10. **Sakin, yumuşak hareket.** Aktif sekme hapı sekmeler arasında kayar;
    ok butonu hover'da 45° döner; basınca her buton %3 küçülür.

---

## 2. Renkler

Tokenlar `globals.css` `@theme` bloğunda `--color-pn-*` olarak tanımlıdır
(Tailwind: `bg-pn-accent`, `text-pn-ink`, `border-pn-line`…). Değerler
**kapsama göre değişir**: panel dışında Pulse değerleri (§11), panelde
(`:root:has(.bz-panel)`) Pano değerleri. Böylece paylaşılan bileşenler
(`src/components/ui`, `audits`, `reply`, `loyalty`) her iki yüzeyde de doğru
rengi alır.

| Token | Panel (Pano) | Panel dışı (Pulse) | Kullanım |
|---|---|---|---|
| `pn-accent` | `#D7FE03` | `#C6F24E` | Lime: aktif vurgu, CTA, tile, grafik ana seri |
| `pn-accent-hover` | `#C6EB00` | `#A8D62E` | Lime buton hover |
| `pn-accent-soft` | `#F3FDC4` | `#EAF9B8` | Açık lime zemin (rozet, seçili satır) |
| `pn-accent-ink` | `#4F7A18` | `#A8D62E` | Beyaz üstünde yeşil metin / ikon |
| `pn-olive` | `#83AF3B` | `#A8D62E` | İkinci seri, segment çubuğunun 2. parçası |
| `pn-canvas` | `#F5F5F8` | `#FAFAFA` | Sayfa zemini, kart içi gri yüzey |
| `pn-line` | `#ECECF0` | `#EDEDED` | Kart içi çerçeve, ayraç |
| `pn-line-strong` | `#E2E2E7` | `#D4D4D4` | Tuval üstündeki buton çerçevesi, hover |
| `pn-ink` | `#000000` | `#0A0A0A` | Metin, siyah buton, koyu kart |
| `pn-ink-2` | `#1E1E1E` | `#1A1A1A` | Koyu kart içindeki ikinci katman |
| `pn-ink-3` | `#2A2A2A` | `#262626` | Koyu üstünde buton/çerçeve |

Sabit (kapsamdan bağımsız):

| Ad | Değer | Kullanım |
|---|---|---|
| Metin ikincil | `#6E6E73` | Açıklama, alt metin (beyaz üstünde 5,0:1) |
| Metin soluk | `#9A9AA0` | Tarih, ipucu, pasif |
| Olumlu | `#3A8228` | "+%4" gibi artış metni (beyazda 4,8:1) |
| Olumsuz | `#E5484D` | Düşüş metni, hata, bildirim noktası `#DD312E` |
| Koyu kart metni | `rgba(255,255,255,.62)` | Siyah kart üstünde ikincil metin |

> Lime üstüne yalnız siyah yazılır. Beyaz üstüne lime metin yazılmaz
> (1,1:1); yeşil metin için `pn-accent-ink` ya da olumlu rengi kullan.

---

## 3. Tipografi

Yazı tipi: **Urbanist** (OFL, Google Fonts, değişken 100–900, `latin` +
`latin-ext` — Türkçe ğ/ş/İ). `next/font` değişkeni `--font-urbanist`;
panel kapsamında `--font-body` ve `--font-heading` Urbanist'e döner. Mono
yazı (JetBrains Mono) panelde kullanılmaz; küçük etiketler Urbanist.

| Rol | Boyut / satır | Ağırlık | İzleme | Örnek |
|---|---|---|---|---|
| H1 sayfa başlığı | 46 / 52 (mobil 32 / 38) | 400 | -0,01em | "Yorumlar" |
| H1 kompakt | 36 / 42 (mobil 28 / 34) | 400 | -0,01em | yoğun sayfalar |
| Kart başlığı (H2) | 22 / 28 | 400 | -0,005em | "Son yorumlar" |
| Koyu kart başlığı | 28 / 34 | 400 | -0,01em | kahraman kart |
| Büyük sayı | 40 / 44 | 300 | -0,02em | `6.010,29` |
| KPI sayı | 32 / 36 | 300 | -0,02em | `4,6` |
| Liste başlığı | 16 / 22 | 500 | 0 | satır adı |
| Gövde | 14 / 20 | 400 | 0 | açıklama |
| Buton / sekme | 14 / 20 | 500 | 0 | "Kaydet" |
| Küçük | 13 / 18 | 400 | 0 | tarih, alt metin |
| Mikro | 12 / 16 | 500 | 0 | rozet, çip |

Kurallar: büyük harf (ALL CAPS) etiket yok; başlıkların üstünde eyebrow
yok (eski `pulse-eyebrow` panelde normal küçük metne döner); sayılarda
`font-variant-numeric: tabular-nums`.

---

## 4. Ölçüler

### 4.1 Boşluk
| Ölçü | Değer |
|---|---|
| Sayfa yatay iç boşluğu | 24 px (mobil 16) |
| Üst menü dış boşluğu | 8 px (ekran kenarından) |
| Üst menü ↔ sayfa başlığı | 40 px |
| Sayfa başlığı ↔ ilk kart | 28 px |
| Kartlar arası | 10 px |
| Kart iç boşluğu | 28 px (mobil 20) |
| Kart başlığı ↔ içerik | 20 px |
| Liste satırları arası | 10 px |
| Yan yana daire butonlar | 6 px |

### 4.2 Köşe
| Öğe | Köşe |
|---|---|
| Üst menü | 24 px |
| Kart | 28 px |
| Koyu kahraman kart | 32 px |
| Lime tile | 22 px |
| Liste satırı (çerçeveli) | 24 px |
| Koyu kart içi kutu | 20 px |
| Input / textarea | 16 px (tek satır input hap: 999) |
| Menü / popover | 20 px; madde 12 px |
| Modal | 32 px |
| Buton, çip, sekme | 999 px |

### 4.3 Yükseklik
| Öğe | Yükseklik |
|---|---|
| Üst menü | 78 px |
| Sekme hapı | 42 px |
| Üst menü daire butonu / avatar | 46 px |
| Sayfa başlığı daire butonu (geri, ara, filtre) | 46 px |
| Kart içi daire buton (↗, ayar) | 40 px |
| Buton (normal) | 44 px |
| Buton (küçük) | 36 px |
| Input | 46 px |
| Liste ikon dairesi | 40 px |
| Çip / rozet | 28 px / 24 px |

---

## 5. Bileşenler

### 5.1 Üst menü (`PanelTopNav`, masaüstü ≥1024)
```
┌───────────────────────────────────────────────────────────────────────┐ 8px
│ [◆ buaze]      Panel  [Yorumlar]  Google  QR  Analitik  Diğer ▾    (⌕)(🔔)(●) │ 78px
└───────────────────────────────────────────────────────────────────────┘ r24
```
- Beyaz bar, `margin: 8px 8px 0`, köşe 24 px, gölge yok, `position: sticky; top: 8px`.
- Logo solda; sekmeler ortada; sağda daire butonlar + avatar.
- Sekme: 14 px / 500, `padding: 0 18px`, 42 px yükseklik, siyah metin.
  Aktif sekme: siyah hap, beyaz metin. Hap tek bir öğedir ve aktif sekmenin
  altına **kayar** (§6). Hover: metin altında `pn-canvas` hap.
- Grup (Araçlar, Hesaplar…): metin + küçük chevron, tıklayınca menü (§5.10).
  Grubun bir alt sayfası açıksa grup sekmesi aktif hap alır.
- 1024–1279 px'de öncelikli olmayan sekmeler "Diğer" menüsüne iner.
- Sağ daire butonlar 46 px, beyaz zemin, `1px pn-line` çerçeve; bildirim
  noktası 8 px `#DD312E`, sağ üstte.

### 5.2 Sayfa başlığı (`PageHeader`)
```
(←)  Yorumlar                                   (⌕) (⚙) [ 📅 27 Oca – 27 Şub ⌄ ]
```
- Solda 46 px geri dairesi (çerçeveli, tuvalde şeffaf zemin), 20 px sonra H1.
  Panel ana sayfasında geri dairesi yok.
- Açıklama H1'in altında, 14 px ikincil metin, en çok 640 px.
- Sağda eylemler: daire butonlar ve hap butonlar 46 px.

### 5.3 Butonlar
| Sınıf | Görünüm | Kullanım |
|---|---|---|
| `bz-btn-primary` | Siyah hap, beyaz yazı, 44 px, `padding 0 24px` | Ana eylem (Kaydet, Sipariş ver) |
| `bz-btn-lime` | Lime hap, siyah yazı | Vurgulu ikincil eylem, kahraman kartta |
| `bz-btn` / `bz-btn-ghost` | Beyaz hap, `1px pn-line-strong`, siyah yazı | İkincil eylem |
| `bz-btn-danger` | Beyaz hap, kırmızı yazı, açık kırmızı çerçeve | Silme |
| `bz-btn-on-dark` | `#2A2A2A` hap, beyaz yazı | Koyu kart içinde |
| `bz-btn-icon` | 40 px daire, çerçeveli | Kart başlığı eylemleri |
| `pn-icon-btn` | 46 px daire, çerçeveli | Üst menü, sayfa başlığı |
| `pn-arrow-btn` | 40 px daire, içinde ↗ | Kartı/ayrıntıyı aç |
| `pn-dark-icon-btn` | 52 px `#1E1E1E` daire, beyaz ikon | Koyu kart eylemleri |

Durumlar: hover → siyah `#1F1F1F`, lime `pn-accent-hover`, çerçeveli
`pn-canvas` zemin + `pn-line-strong` çerçeve; basma `scale(.97)`; odak
`0 0 0 3px` lime halka (siyah butonda) / siyah halka (lime butonda);
devre dışı `#EDEDF0` zemin, `#A0A0A6` yazı.

### 5.4 Kartlar
- **Beyaz kart** (`bz-card`): beyaz, çerçevesiz, 28 px köşe, 28 px iç boşluk
  (sayfalar kendi `p-*` sınıflarını verir). Kart başlığı 22 px / 400, sağında
  40 px daire eylemler (filtre, ↗).
- **Yumuşak kart** (`bz-card-soft`): `pn-canvas` zemin, 24 px köşe (kart içinde).
- **Koyu kahraman** (`pn-card-dark`): siyah, 32 px köşe, beyaz metin,
  alt-orta radyal lime ışıma `radial-gradient(60% 70% at 30% 110%, rgba(215,254,3,.55), transparent 70%)`.
- **Lime tile** (`pn-tile`): lime zemin, 22 px köşe, alt solda 14 px / 500
  siyah etiket, üstte siyah hap ya da ikon.
- **Çerçeveli satır** (`pn-row`): beyaz, `1px pn-line`, 24 px köşe,
  `padding 16px 20px`, solda 40 px siyah ikon dairesi.
- **Hap çip** (`pn-chip`): `1px pn-line` çerçeveli hap, solda 40 px siyah
  daire, sağında iki satır (16 px / 14 px ikincil).

### 5.5 Sayı (`PanoNumber`)
`<PanoNumber value="6.010,29" />` → tam kısım ink, ondalık ayırıcı + kesir
`#9A9AA0` ve %88 boyut. Önek/sonek (`₺`, `%`, `★`) aynı gri ve %70 boyut.
`StatCard` değerleri bu bileşenle çizilir.

### 5.6 Input
Beyaz, `1px pn-line-strong`, 46 px, tek satır input köşesi 999 px,
textarea 16 px; odak: siyah çerçeve + `0 0 0 4px` açık lime halka.
Placeholder `#9A9AA0`. Select aynı (`PulseSelect`), chevron 12 px.

### 5.7 Sekmeler (`bz-tabs`)
Hap segment: kapsayıcı yok (şeffaf), sekme 40 px hap, pasif siyah metin,
aktif siyah hap + beyaz metin; hover `pn-canvas`. Üst menü sekmeleriyle aynı.

### 5.8 Tablo
Başlık 13 px / 500 `#6E6E73`, büyük harf yok, zemin yok; satır 64 px,
ayraç `1px pn-line`; hover satır `pn-canvas`; ilk sütun 16 px / 500.

### 5.9 Rozet (`bz-badge`)
24 px hap, 12 px / 500. Renkli rozetler açık zemin + koyu metin; `lime`
rozeti lime zemin + siyah metin; `dark` siyah + lime metin.

### 5.10 Menü / popover (`bz-menu`)
Beyaz, 20 px köşe, `padding 8px`, gölge `0 24px 48px -12px rgba(0,0,0,.18)`,
`1px pn-line`. Madde 44 px, 12 px köşe, hover `pn-canvas`, seçili madde
lime zemin. Açılış: 200 ms ölçek .96→1 + saydamlık.

### 5.11 İlerleme (`bz-progress`, `pn-hatch`)
12 px hap; dolu kısım lime (koyu kartta) / siyah (beyaz kartta); kalan
kısım `pn-hatch`: `repeating-linear-gradient(-45deg, …)` 6 px çizgi.

### 5.12 Modal
Beyaz, 32 px köşe, 32 px iç boşluk, arka plan `rgba(10,10,14,.32)` +
4 px blur. Kapat butonu 40 px çerçeveli daire.

### 5.13 Grafik
Ana seri siyah ince çizgi (1,5 px) ya da lime dolgu; ikinci seri zeytin;
üçüncü `#1E1E1E`; ızgara çizgisi yok ya da `pn-line` kesikli; tooltip:
siyah hap içinde beyaz metin, vurgulu değer lime hap. Ay etiketleri küçük
çerçeveli haplar, seçili ay siyah hap.

---

## 6. Hareket

| Ne | Süre | Eğri | Davranış |
|---|---|---|---|
| Sekme hapı | 420 ms | `cubic-bezier(.32,.72,0,1)` | `transform` + `width` ile aktif sekmeye kayar |
| Buton hover | 200 ms | `cubic-bezier(.2,.8,.2,1)` | zemin + çerçeve rengi |
| Buton basma | 120 ms | aynı | `scale(.97)` |
| Ok butonu | 260 ms | aynı | hover: siyah dolar, ikon beyaz, ↗ 45° döner (→) |
| Menü açılışı | 200 ms | `cubic-bezier(.16,1,.3,1)` | ölçek .96→1 + saydamlık, kaynak tetikleyici |
| Sayfa girişi | 360 ms | `cubic-bezier(.2,.8,.2,1)` | içerik 8 px aşağıdan, bir kez, her rota değişiminde |
| Kart hover (tıklanabilir) | 200 ms | aynı | yalnız ok butonu tepki verir, kart sabit |
| İlerleme dolumu | 700 ms | aynı | genişlik 0'dan değere |
| Skeleton | 1,4 s | `ease-in-out` | `pn-canvas` ↔ `#EDEDF1` nabız |

`prefers-reduced-motion: reduce` → tümü kapalı; sekme hapı anında yer
değiştirir (globals.css blanket'ı süreleri sıfırlar).

---

## 7. Mobil (<1024)

- Üst menü yerine aynı stilde beyaz bar (`margin 8px`, 64 px, 20 px köşe):
  solda logo, sağda bildirim + 44 px siyah menü dairesi (iki çizgi ikon).
- Menü dairesi tam ekran beyaz çekmeceyi açar: sekmeler 52 px haplar,
  aktif siyah; altta hesap ve çıkış.
- Alt sekme çubuğu yoktur. `--dash-bottom-nav-h` yalnız güvenli alanı tutar.
- Kartlar tek sütun, 10 px aralık; kart iç boşluğu 20 px; H1 32 px.

---

## 8. Kod haritası

| Dosya | İçerik |
|---|---|
| `src/app/globals.css` `@theme` | `--color-pn-*` panel dışı (Pulse) değerleri |
| `src/components/panel/pano/pano.css` | Panel kapsamı: token değerleri, Urbanist, `bz-*` yeniden tanımı, `pn-*` bileşenler, hareket |
| `src/components/panel/pano/PanelTopNav.tsx` | Kayan haplı üst menü (owner + admin) |
| `src/components/panel/pano/PanelMobileNav.tsx` | Mobil beyaz bar + tam ekran çekmece |
| `src/components/panel/pano/PageBackButton.tsx` | Sayfa başlığındaki geri dairesi |
| `src/components/panel/pano/PanoNumber.tsx` | Kesri gri sayı |
| `src/components/panel/pano/sentence-case.ts` | Büyük harf etiketleri Türkçe cümle düzenine çevirir |
| `src/components/admin/AdminPanoChrome.tsx` | Admin üst menü + çekmece (admin-nav.ts'ten) |
| `src/components/dashboard/PanoHeroCard.tsx` | Panel ana sayfasındaki siyah kahraman kart |
| `src/components/root/fonts.ts` | `--font-urbanist` |
| `.claude/skills/panel-design/SKILL.md` | Yeni panel ekranı yazarken izlenecek kurallar |
| `tests/pano-design.test.ts` | Kesirli sayı ve cümle düzeni testleri |

### 8.1 Eski koddan geçiş
- Renkler: iki dönüştürücü panel dosyalarındaki Pulse hex sınıflarını `pn-*` tokenlarına, `font-semibold/bold`'u `font-medium`'a, 9–11,5 px puntoları 12 px'e, köşeleri Pano ölçeğine (inline-flex + items-center → hap; lg 14, xl 20, 2xl 24, 3xl 28 px) çevirdi; `uppercase`, `tracking-[…em]`, `pulse-eyebrow`, `bz-mono`, küçük gölgeler silindi.
- `pano.css`'in sonundaki **güvenlik ağı** yalnız eski işaretleme içindir (satır içi segment kontrolleri, küçük yarı kalın kart başlıkları, kart ızgarası boşluğu). Yeni kod buna güvenmez.

---

## 9. Yapma

- Panelde `#C6F24E`, `#A8D62E`, `#EAF9B8`, `#FAFAFA` gibi Pulse hex'i yazma;
  `pn-*` token sınıflarını kullan (`bg-pn-accent`, `text-pn-ink`…).
- Köşeli (8 px) buton, kenar çubuğu, büyük harf etiket, eyebrow ekleme.
- Kartlara gölge ya da `1px` dış çerçeve ekleme (çerçeve yalnız kart *içindeki* satırlarda).
- Beyaz zemine lime metin yazma.
- Referansın logosunu, adını, illüstrasyonlarını, avatar fotoğraflarını ya
  da metnini kopyalama.
