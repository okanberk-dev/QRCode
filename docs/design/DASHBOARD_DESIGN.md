# Buaze panelleri — "Pano" tasarım sistemi

> Kaynak: iki Behance konsepti harmanlandı.
> **Fintora** ("Modern Fintech CRM & SaaS Dashboard", Sriraj Mohan, 2026):
> düzen, renk, yazı tipi, kart ve grafik dili — 18 görsel 3840 px
> genişlikte incelendi (`#111110`, `#F6F6F6`, `#FFFFFF`; Plus Jakarta Sans; 1440 px tuval, 20 px kenar,
> 16 px oluk). **lumin** ("Online Bank / Finance SaaS", Mikalai Haluza,
> 2024): yalnız kayan sekme hapı ve gri kesirli sayılar kaldı; koyu/ışımalı
> kahraman kart, üst üste binen kartlar ve kısayol kutuları 2026-11-28'de kaldırıldı.
> **Renk (2026-11-28):** Fintora'nın kendi paleti: siyah `#111110` dolgu,
> yeşil `#78FC90` vurgu, beyaz kart, `#F6F6F6` tuval. 2026-11-27'de denenen
> mor + beyaz palet kullanıcı isteğiyle geri alındı.
> İçerik, logo ve marka Buaze'nindir. Referansların logosu, adı ("Greyola",
> "lumin"), avatar fotoğrafları, illüstrasyonları ve metinleri kullanılmaz.
>
> Kod: `src/components/panel/pano/`. Kapsam: `.bz-panel` kökünün olduğu
> sayfalar (owner `/[locale]/dashboard/*`, admin `/admin/*`). Pazarlama
> "Ritim" (`MARKETING_DESIGN.md`), `/r`, `/menu`, `/l`, `/hesap`, auth ve
> e-postalar bu sistemi kullanmaz.

---

## 1. Tasarım dili — 10 kural

1. **Gri tuval, beyaz kartlar.** Zemin `#F6F6F6`; her içerik bloğu
   çerçevesiz beyaz, 24 px köşeli karttır. Gölge yok.
2. **Solda etiketli menü, üstte hap sekmeler.** Günlük 4 sayfa üstte beyaz
   haplar; yönetim, araçlar, hesap ve admin sayfa grupları solda ikon +
   isimle (daraltılınca ikon + ipucu). Aktif olan her yerde siyah dolar,
   yazısı beyaz; aktif menü satırının ikonu yeşil.
3. **Siyah, yeşil, beyaz.** Siyah `#111110` (ana buton, aktif hap, ikon
   dairesi), yeşil `#78FC90` (vurgu: siyah üstünde ikon/nokta, yeşil zemin
   üstünde siyah yazı), açık yeşil `#F1FDF3` (seçili satır, sakin not),
   beyaz kart, tuval `#F6F6F6`. Siyah zeminde yazı beyaz, yeşil zeminde
   yazı siyah; beyaz zeminde yeşil yazı yok (okunmaz).
4. **Hap ve daire.** Metinli her buton hap; ikonlu her buton dairedir.
   Tuvalde beyaz, beyaz kart içinde gri (`#F6F6F6`). Çerçeve yok.
5. **Plus Jakarta Sans, orta kalınlık.** Başlıklar ve büyük sayılar 500;
   gövde 400. Büyük harf etiket yok.
6. **Sayının kesri gri.** `37.201,00` → `37.201` siyah, `,00` gri.
7. **Klasörlü yol göstergesi.** Sayfa başlığının üstünde
   "📁 Panel → 📁 Yorumlar"; geri butonu yok.
8. **Fintora ana kartı.** Sayfanın en önemli verisi beyaz kartta: gri
   etiket + ↗, büyük sayı, yumuşak değişim hapı, 4 gri eylem hapı, siyah
   trend çizgisi ve gri döküm satırları. Koyu dolgulu kahraman kart yok.
9. **Taralı grafik.** Çubuk ve ilerleme göstergelerinde dolmayan / seçili
   olmayan kısım 45° çizgili gridir; seçili çubuk yeşil + taralı, ipucu siyah hap.
10. **Sakin hareket.** Aktif sekme hapı sekmeler arasında kayar (420 ms);
    ok butonu hover'da siyah dolup 45° döner; basınca her buton %3 küçülür.

---

## 2. Renkler

Tokenlar `globals.css` `@theme` bloğunda `--color-pn-*` (Tailwind
`bg-pn-accent`, `text-pn-ink`, `border-pn-line`…). Panel dışında Pulse
değerleri, panelde (`:root:has(.bz-panel)`) aşağıdakiler; paylaşılan
bileşenler iki yüzeyde de doğru rengi alır.

| Token | Panel | Kullanım |
|---|---|---|
| `pn-accent` | `#111110` | Siyah: ana buton, aktif sekme/hap, ikon dairesi, grafik ana seri |
| `pn-accent-hover` | `#2B2B2A` | Siyah buton hover / basılı |
| `pn-accent-soft` | `#F1FDF3` | Açık yeşil: seçili liste satırı, sakin not kutusu |
| `pn-accent-ink` | `#111110` | Beyaz üstünde vurgu metni / ikon |
| `pn-olive` | `#78FC90` | Yeşil: ikinci veri serisi, seçili çubuk, siyah üstünde ikon |
| `pn-canvas` | `#F6F6F6` | Tuval, kart içi gri yüzey ve butonlar |
| `pn-line` / `pn-line-strong` | `#EBEBEB` / `#E0E0E0` | Ayraç, input çerçevesi |
| `pn-ink` | `#111110` | Metin; ipucu (tooltip), bildirim (toast), telefon çerçevesi |
| `pn-ink-2` / `pn-ink-3` | `#1C1C1B` / `#2B2B2A` | Nötr koyu katmanlar |

Siyah `#000000` (`--pn-deep`) koyu yüzeylerdir: seçim çubuğu, deneme
bandı, bildirim. Üstünde vurgu yeşil `#78FC90` (`--pn-green`), birincil
buton yeşil hap + siyah yazı (`bz-btn-lime`). İkincil metin `#737373`,
soluk metin `#9A9A9A`, olumsuz `#D92D20` (rozet `#D92D20` / `#FDECEC`).
Durum renkleri anlamını korur: olumlu `#23863A` (açık zeminde), olumsuz
`#D92D20`. Grafik kütüphanesine hex gerekirse: siyah `#111110`, yeşil
`#78FC90`, açık gri `#E0E0E0`.
Müşterinin seçtiği renkler (işletme rengi, menü vurgusu, sadakat kartı,
QR, anket vurgusu) veridir; panel paletine çevrilmez.

---

## 3. Tipografi — Plus Jakarta Sans

| Rol | Boyut | Ağırlık |
|---|---|---|
| H1 sayfa başlığı | 34 px (mobil 28) | 500, -0,02em |
| H1 kompakt | 30 px (mobil 24) | 500 |
| Kart başlığı (`pn-card-title`) | 20 / 26 | 500 |
| Büyük sayı (`pn-num`, StatCard) | 36–48 px | 500, -0,025em, kesir gri |
| Gövde | 14 / 20 | 400 |
| Buton / sekme | 14 / 20 | 500 |
| Küçük / tarih | 13 px | 400, `#9A9A9A` |
| Rozet | 12 px | 500 |

---

## 4. Ölçüler

| Öğe | Değer |
|---|---|
| Sol menü genişliği | 256 px açık, 92 px daraltılmış; satır 48 px, ikon dairesi 40 px |
| Üst satır yüksekliği | 80 px; sekme hapı 44 px, aralık 8 px |
| Üst satır daire butonları / avatar | 46 px |
| Kartlar arası | 10 px |
| Kart iç boşluğu | 20–28 px (mobil 20) |
| Kart köşesi | 24 px; koyu kart 28 px; kart içi gri kutu 18 px |
| Liste satırı (`pn-row`) | gri, 16 px köşe, 40 px ikon dairesi |
| Kart içi daire buton (↗) | 44 px gri |
| Buton | 44 px (küçük 36 px) |
| Input | 46 px hap, `1px pn-line` |
| Menü / popover | 24 px köşe, madde 44 px |
| Modal | 28–32 px köşe |

---

## 5. Bileşenler

### 5.1 Kabuk (masaüstü ≥1024)
```
┌──────┬──────────────────────────────────────────────────────────────┐
│ ◆    │ [Panel] (Yorumlar) (Google) (QR) (Analitik)  [İşletme⌄][+ QR][⌕][🔔][●] │ 80px
│      │                                                              │
│ (👥) │  📁 Panel → 📁 Yorumlar                                       │
│ (🍴) │  Yorumlar                               (⌕)(⚙)[📅 Son 7 gün ⌄]│
│ (🎁) │  ┌────────┐┌────────┐┌────────┐                              │
│ (📖) │  │  kart  ││  kart  ││  kart  │                              │
│      │                                                              │
│ (🎧) │                                                              │
└──────┴──────────────────────────────────────────────────────────────┘
```
- **Sol menü** (`PanelRail`): üstte logo + "buaze", altında işletme seçici
  (owner), sonra başlıklı bölümler — owner: Yönetim (Platform bağlantıları,
  İşletmeler), Araçlar (Müşteriler, Menü, Sadakat, Anketler, Denetim,
  Kılavuz), Hesap (Hesabım, Faturalama); admin: her sayfa grubu bir bölüm.
  Beyaz, 28 px köşeli yüzen panel (tuvalden 10 px içeride). Satır = 34 px
  ikon kutusu + isim; hover gri, aktif satır siyah + beyaz yazı + yeşil ikon.
  Altta Yardım merkezi (owner) / Profilim (admin) ve "Menüyü daralt".
  1440 px altında varsayılan daraltılmış (76 px, ikon + ipucu; admin
  grupları sağa açılan menü); seçim `localStorage` `buaze:panel:sidebar`.
  Bölüm listesi kendi içinde kayar, hiçbir şey kesilmez.
- **Üst satır** (`PanelTopNav`): tuvalin üstünde 4 beyaz hap (Panel,
  Yorumlar, QR, Analitik; Google yorumları Yorumlar'ın içinde); aktif sekme tek bir siyah hap, sekmeler
  arasında kayar. Sağda "+ QR oluştur" beyaz hap (≥1280), arama alanı
  (`SearchTrigger`, ≥1280 hap, altında daire), bildirim, avatar.
- Sayfa, sekme satırının altında kendi sütununda kayar (§42.5.1).

### 5.2 Sayfa başlığı (`PageHeader`)
Klasörlü yol göstergesi (`PanelBreadcrumb`: "Panel → sayfa adı", ilk adım
panel ana sayfasına bağlantı; `crumb` prop'u son adımı değiştirir,
`crumb={false}` gizler), altında H1, sağda aynı hizada eylemler (daire
butonlar, tarih hapı, siyah ana eylem). Mobilde yol göstergesi gizli.

### 5.3 Butonlar
| Sınıf | Görünüm |
|---|---|
| `bz-btn-primary` | Siyah hap, beyaz yazı (sayfada en çok bir) |
| `bz-btn-lime` | Yeşil hap, siyah yazı (siyah yüzey üstünde ya da basılı filtre) |
| `bz-btn` / `bz-btn-ghost` | Tuvalde beyaz hap, kart/menü/pencere içinde gri hap; çerçeve yok |
| `bz-btn-danger` | Beyaz hap, kırmızı yazı |
| `bz-btn-icon` | 40 px daire; tuvalde beyaz, kartta gri |
| `pn-icon-btn` | 46 px beyaz daire (üst satır, sayfa başlığı) |
| `pn-arrow-btn` | 44 px gri daire, ↗; hover siyah + 45° döner |
| `pn-action-pill` | Ana kartta eşit genişlikte gri ikon hapı (40 px) |
| `pn-side-item` | Sol menü satırı: 34 px ikon kutusu + isim, aktif siyah + yeşil ikon |

### 5.4 Kartlar
- `bz-card`: beyaz, 24 px. Başlık `pn-card-title` + gri tarih satırı,
  sağda ↗ ya da tarih hapı.
- `PanoHeroCard`: Fintora "Total Portfolio Value" kartı — beyaz; gri etiket
  + ⓘ + ↗; büyük sayı (gri kesir); `pn-change` yumuşak değişim hapı; 4 gri
  `pn-action-pill`; siyah trend çizgisi + açık dolgu + siyah değer çipi
  (`pn-chart-tip`); ince siyah ilerleme + taralı gri kalan; gri döküm satırları.
- Kısayollar: gri satırlar (ikon dairesi + isim + ↗), kutu/fanned kart yok.
- `pn-row`: gri liste satırı (Fintora "Portfolio Breakdown").

### 5.5 Sayı (`PanoNumber`)
Tam kısım siyah, ondalık ve önek/sonek gri. `StatCard` ve analitik KPI'ları.

### 5.6 Rozet (`bz-badge`)
24 px hap. `ok` yeşil yazı açık yeşil zemin, `danger` kırmızı yazı açık
kırmızı zemin, `lime` yeşil zemin siyah yazı, `dark` siyah zemin beyaz yazı.

### 5.7 Sekmeler / segment
Beyaz haplar arası 8 px, aktif siyah hap (beyaz yazı). Kart/menü içinde pasif sekmenin
zemini yok (Fintora "All / Unread"). Seçim kartları (tema, yazı tipi, durum,
şablon kartı) beyaz kalır; seçili olan 2 px siyah halka ve açık yeşil
zeminle işaretlenir. İlerleme çubuğunun dolgusu siyah (`ProgressBar`
varsayılanı), siyah yüzeyde yeşil.

**Yorumlar kaynak seçici** (`ReviewSourceSwitch`): Yorumlar sayfasının QR
geri bildirimleri ile Google yorumları aynı sayfanın iki bölümüdür. Beyaz
kapsül içinde iki bölüm; aktif bölüm siyah hap + yeşil ikon dairesi + sayı.
Owner gelen kutusunda araç çubuğu iki satırdır: [kaynak seçici · arama ·
"Filtreler" (sayılı, tarih/puan/platform/durum penceresini açar)] ve altında
sakin durum sekmeleri (`InboxStatusTabs variant="soft"`: pasif gri metin,
aktif beyaz hap).

### 5.8 Menü, popover, komut paleti
Beyaz, çerçevesiz, 24 px köşe, yumuşak gölge; madde 44 px, 12 px köşe,
hover ve seçili gri. Komut paleti: 52 px gri arama hapı + gri kapat dairesi,
satırlar 16 px köşe, aktif satırda ikon dairesi siyah.

### 5.9 Grafik
Çubuklar yuvarlak; ana seri siyah, ikinci seri yeşil; seçili çubuk yeşil +
taralı, pasif çubuklar açık gri; ipucu siyah yuvarlak kutu (değer önünde yeşil nokta);
ızgara kesikli `pn-line`; eksen çizgisi yok.

### 5.10 Sihirbazlar (`WizardSteps` kiti)
Masaüstünde adım hapları (28 px numara dairesi; aktif siyah + beyaz, biten
beyaz + siyah tik, sıradaki beyaz + gri); telefonda "Adım 2 / 3 · Maddeler"
satırı + ince siyah ilerleme. `surface="card"` beyaz kart/pencere içinde
pasif hapları gri yapar, `locale` telefon metnini seçer. Adım gövdesi tek
beyaz kart (20 px başlık + tek satır gri yardım); seçim satırları gri, seçili
olan açık yeşil + 1,5 px siyah halka + siyah tik; özet adımı döküm satırları.
Alt çubuk: gri "Geri" + siyah ana hap; telefonda tam genişlik, alta yapışık,
güvenli alan boşluklu.

### 5.11 Arama (`SearchTrigger` + palet)
Üst satırda beyaz arama hapı (ipucu metni + ⌘K / Ctrl K çipi). Palet:
masaüstünde ortada 640 px beyaz pencere, telefonda tam ekran. Boş sorguda
"Hızlı işlemler" ve "Son açılanlar" (`buaze:palette:recent:owner|admin`,
yalnız panel yolları, yorum metni saklanmaz); yazınca Sayfalar (kendi ikonu
+ tek satır açıklama, ham yol yok), İşletmeler (işletme renkli kısaltma),
Yorumlar (5 küçük yıldız, isim, göreli tarih, eşleşme vurgulu kesit).
Grup başlıkları cümle düzeninde + sayı. Kod `src/components/panel/search/`.

### 5.12 Yan panel (çekmece)
Masaüstünde ekran kenarından 8 px içeride, 32 px köşeli beyaz panel;
mobilde tam ekran.

---

## 6. Hareket

| Ne | Süre | Davranış |
|---|---|---|
| Sekme hapı | 420 ms `cubic-bezier(.32,.72,0,1)` | aktif sekmeye kayar |
| Hover | 200 ms | zemin rengi |
| Basma | 120 ms | `scale(.97)` |
| Ok butonu | 260 ms | siyah dolar, ↗ 45° döner |
| Sol menü daralt/aç | 320 ms | genişlik kayar; daraltılmışta isim ipucunda |
| Menü açılışı | 200 ms | ölçek .96→1 + saydamlık |
| Sayfa girişi | 360 ms | içerik 8 px aşağıdan, rota değişiminde bir kez |

`prefers-reduced-motion: reduce` → hepsi kapalı.

---

## 7. Mobil (<1024)

- Sol menü ve sekme satırı yok; beyaz bar (logo + bildirim + siyah menü
  dairesi) ve tam ekran çekmece. Çekmece işletme seçici, tüm sayfalar
  (araçlar dahil), "QR oluştur" ve hesap bağlantılarını listeler.
- Telefonda (<640) tuval beyaz, kartlar gri `#F6F6F6`; kart içindeki
  butonlar ve satırlar beyaz. Menüler alttan açılır, üstte tutamaç.
- Alt sekme çubuğu yok; `--dash-bottom-nav-h` yalnız güvenli alan.

---

## 8. Kod haritası

| Dosya | İçerik |
|---|---|
| `src/components/panel/pano/pano.css` | Panel kapsamı: tokenlar, yazı tipi, `bz-*` yeniden tanımı, `pn-*` parçalar, hareket, güvenlik ağı |
| `src/components/panel/pano/PanelRail.tsx` | Etiketli, daraltılabilir sol menü (`RailSection`) |
| `src/components/panel/pano/PanelTopNav.tsx` | Kayan haplı sekme satırı, `MenuLinks` |
| `src/components/panel/pano/PanelMobileNav.tsx` | Mobil bar + tam ekran çekmece |
| `src/components/panel/pano/PanelBreadcrumb.tsx` | Klasörlü yol göstergesi |
| `src/components/panel/pano/PanoNumber.tsx` | Kesri gri sayı |
| `src/components/panel/search/` | `SearchTrigger`, `PaletteFrame`, `search-utils.ts` |
| `src/components/ui/WizardSteps.tsx` | Sihirbaz kiti (adım hapları, adım kartı, seçim satırı, alt çubuk) |
| `src/components/panel/pano/sentence-case.ts` | Büyük harf etiketleri cümle düzenine çevirir |
| `src/components/dashboard/UserDashboardShell.tsx` | Owner kabuğu |
| `src/components/admin/AdminPanoChrome.tsx` | Admin kabuğu (admin-nav.ts'ten) |
| `src/components/dashboard/PanoHeroCard.tsx` | Ana sayfadaki Fintora ana kartı |
| `src/components/root/fonts.ts` | `--font-jakarta` |
| `.claude/skills/panel-design/SKILL.md` | Yeni panel ekranı yazarken kurallar |
| `tests/pano-design.test.ts`, `tests/pano-guard.test.ts` | Sayı / cümle düzeni; panel dosyalarında eski renk yasağı |

**Güvenlik ağı** (`pano.css` sonu) yalnız eski işaretleme içindir: satır
içi segment kontrolleri (bir izin içindeki — `bg-pn-canvas`, `tablist`,
`group` ya da ızgara olmayan `radiogroup` — doğrudan çocuk, `bg-white` /
`shadow-sm` aktif öğe) siyah hap olur (`data-tone="soft"` hariç); kart ızgarasındaki seçim kartlarına
dokunmaz, küçük kart başlıkları 20 px olur,
`.uppercase` ve `.pulse-eyebrow` büyük harf yazmaz, büyük tabular sayılar
500 olur, kart ızgarası 10 px aralık alır. Yeni kod buna güvenmez.

---

## 9. Yapma

- Panelde Pulse lime hex'i (`#C6F24E`, `#A8D62E`, `#EAF9B8`, `#D7FE03`)
  ya da `pulse-eyebrow` yazma (koruma testi kırılır); `pn-*` tokenlarını
  kullan. Müşterinin marka/menü renk varsayılanları istisnadır
  (testteki listeye eklenir).
- Geri butonu, köşeli buton, büyük harf etiket, kart gölgesi ya da dış
  çerçeve ekleme.
- Beyaz zemine yeşil yazı yazma (okunmaz); yeşil zeminde yazı siyah,
  siyah zeminde yazı beyaz ya da yeşil.
- Mor ya da başka bir marka rengini panel vurgusu yapma; vurgu siyah +
  yeşildir. Müşterinin seçtiği renkler veridir, değişmez.
- Referansların logosunu, adını, fotoğraflarını ya da metnini kullanma.
