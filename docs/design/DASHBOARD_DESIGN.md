# Buaze panelleri — "Pano" tasarım sistemi

> Kaynak: iki Behance konsepti harmanlandı.
> **Fintora** ("Modern Fintech CRM & SaaS Dashboard", Sriraj Mohan, 2026):
> düzen, renk, yazı tipi, kart ve grafik dili — 18 görsel 3840 px
> genişlikte incelendi (`#111110`, `#F6F6F6`, `#FFFFFF`; Plus Jakarta Sans; 1440 px tuval, 20 px kenar,
> 16 px oluk). **lumin** ("Online Bank / Finance SaaS", Mikalai Haluza,
> 2024): kayan sekme hapı, ışımalı kahraman kart, taralı ilerleme
> çubuğu, gri kesirli sayılar.
> **Renk (2026-11-27):** Fintora'nın yeşili yerine mor + beyaz palet
> (`#5D3EBC` ana mor, `#3B1F8F` koyu mor, `#EFEAFB` lavanta). Yalnız renk
> ailesi alındı; başka bir markanın logosu, adı ya da metni kullanılmaz.
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
2. **Solda ikon şeridi, üstte hap sekmeler.** Ana sayfalar üstte beyaz
   haplar; araçlar ve sayfa grupları solda 48 px yuvarlak ikonlar.
   Aktif olan her yerde mor dolar, yazısı beyaz.
3. **Mor ve beyaz.** Mor `#5D3EBC`, koyu mor `#3B1F8F`, lavanta `#EFEAFB`,
   beyaz, tuval `#F6F6F6`, metin `#111110`. Morun (her tonunun) üstündeki
   yazı ve ikon **her zaman beyazdır**. Beyaz üstünde mor yazı serbest;
   mor zemine siyah yazı, siyah ya da koyu mor zemine mor yazı yok.
4. **Hap ve daire.** Metinli her buton hap; ikonlu her buton dairedir.
   Tuvalde beyaz, beyaz kart içinde gri (`#F6F6F6`). Çerçeve yok.
5. **Plus Jakarta Sans, orta kalınlık.** Başlıklar ve büyük sayılar 500;
   gövde 400. Büyük harf etiket yok.
6. **Sayının kesri gri.** `37.201,00` → `37.201` siyah, `,00` gri.
7. **Klasörlü yol göstergesi.** Sayfa başlığının üstünde
   "📁 Panel → 📁 Yorumlar"; geri butonu yok.
8. **Mor kahraman kart.** Sayfanın en önemli verisi mor kartta, beyaz
   yazıyla; alttan daha açık bir mor ışıma yükselir (lumin).
9. **Taralı grafik.** Çubuk ve ilerleme göstergelerinde dolmayan / seçili
   olmayan kısım 45° çizgili gridir; seçili çubuk mor, ipucu siyah hap.
10. **Sakin hareket.** Aktif sekme hapı sekmeler arasında kayar (420 ms);
    ok butonu hover'da mor dolup 45° döner; basınca her buton %3 küçülür.

---

## 2. Renkler

Tokenlar `globals.css` `@theme` bloğunda `--color-pn-*` (Tailwind
`bg-pn-accent`, `text-pn-ink`, `border-pn-line`…). Panel dışında Pulse
değerleri, panelde (`:root:has(.bz-panel)`) aşağıdakiler; paylaşılan
bileşenler iki yüzeyde de doğru rengi alır.

| Token | Panel | Kullanım |
|---|---|---|
| `pn-accent` | `#5D3EBC` | Mor: ana buton, aktif sekme/hap, ikon dairesi, grafik ana seri, kahraman kart |
| `pn-accent-hover` | `#4C2FA3` | Mor buton hover / basılı |
| `pn-accent-soft` | `#EFEAFB` | Lavanta: kısayol kutusu, seçili satır, odak halkası |
| `pn-accent-ink` | `#5D3EBC` | Beyaz üstünde mor metin / ikon |
| `pn-olive` | `#A68FEB` | İkinci veri serisi (açık mor) |
| `pn-canvas` | `#F6F6F6` | Tuval, kart içi gri yüzey ve butonlar |
| `pn-line` / `pn-line-strong` | `#EBEBEB` / `#E0E0E0` | Ayraç, input çerçevesi |
| `pn-ink` | `#111110` | Metin; ipucu (tooltip), bildirim (toast), telefon çerçevesi |
| `pn-ink-2` / `pn-ink-3` | `#1C1C1B` / `#2B2B2A` | Nötr koyu katmanlar |

Koyu mor `#3B1F8F` (`--pn-deep`) koyu yüzeylerdir: AI öneri kartı,
seçim çubuğu, özet kartları, deneme bandı. Üstünde vurgu metni lavanta
`#DCD3F6` (`--pn-lavender`), birincil buton beyaz hap + mor yazı.
İkincil metin `#737373`, soluk metin `#9A9A9A`, olumsuz `#D92D20`
(rozet `#D92D20` / `#FDECEC`). Durum renkleri anlamını korur: olumlu
`#23863A` (açık zeminde), olumsuz `#D92D20`; mor yüzeyde artış `#C8F7D2`,
azalış `#FFC4C0`. Grafik kütüphanesine hex gerekirse: mor `#5D3EBC`,
ikinci seri `#A68FEB`, lavanta `#DCD3F6`, koyu mor `#3B1F8F`.
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
| İkon şeridi genişliği | 92 px; düğme 48 px, aralık 10 px |
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
- **İkon şeridi** (`PanelRail`): üstte logo, ortada düğmeler, altta yardım
  (owner) / profil (admin). Owner: Araçlar (Müşteriler, Menü, Sadakat,
  Anketler, Denetim, Kılavuz). Admin: sayfa grupları, her biri sağa açılan
  menü. Düğmenin adı hover/odakta sağda siyah ipucunda görünür.
- **Üst satır** (`PanelTopNav`): tuvalin üstünde beyaz haplar; aktif sekme
  tek bir mor hap (beyaz yazı), sekmeler arasında kayar. 1440 px altında "Platformlar"
  ve "İşletmeler" "Diğer" menüsüne iner. Sağda işletme seçici hapı,
  "+ QR oluştur" beyaz hap (≥1280), arama, bildirim, avatar.
- Sayfa, sekme satırının altında kendi sütununda kayar (§42.5.1).

### 5.2 Sayfa başlığı (`PageHeader`)
Klasörlü yol göstergesi (`PanelBreadcrumb`: "Panel → sayfa adı", ilk adım
panel ana sayfasına bağlantı; `crumb` prop'u son adımı değiştirir,
`crumb={false}` gizler), altında H1, sağda aynı hizada eylemler (daire
butonlar, tarih hapı, mor ana eylem). Mobilde yol göstergesi gizli.

### 5.3 Butonlar
| Sınıf | Görünüm |
|---|---|
| `bz-btn-primary` | Mor hap, beyaz yazı (sayfada en çok bir) |
| `bz-btn-lime` | Tarihî ad; panelde aynı mor hap, beyaz yazı |
| `bz-btn` / `bz-btn-ghost` | Tuvalde beyaz hap, kart/menü/pencere içinde gri hap; çerçeve yok |
| `bz-btn-danger` | Beyaz hap, kırmızı yazı |
| `bz-btn-icon` | 40 px daire; tuvalde beyaz, kartta gri |
| `pn-icon-btn` | 46 px beyaz daire (üst satır, sayfa başlığı) |
| `pn-arrow-btn` | 44 px gri daire, ↗; hover mor + 45° döner (`--dark`: mor kartta yarı saydam beyaz, hover beyaz + mor ikon) |
| `pn-dark-icon-btn` | 52 px yarı saydam beyaz daire (mor kart içinde); hover beyaz + mor ikon |
| `pn-rail-btn` | 48 px beyaz daire, aktif mor + beyaz ikon (ikon şeridi) |

### 5.4 Kartlar
- `bz-card`: beyaz, 24 px. Başlık `pn-card-title` + gri tarih satırı,
  sağda ↗ ya da tarih hapı.
- `pn-card-dark` (`PanoHeroCard`; ad tarihî): mor `#5D3EBC` kart, alttan
  açık mor ışıma, tüm yazı beyaz (soluk metin %78 beyaz), 52 px yarı saydam
  eylem daireleri, beyaz dolan taralı ilerleme + koyu mor topuz (`pn-knob`),
  yarı saydam satırlar (`pn-dark-row`, değişim `pn-up` `#C8F7D2` /
  `pn-down` `#FFC4C0`).
- `pn-tile` (`PanoTile`): lavanta kısayol kutusu, mor ikon dairesi + beyaz ikon.
- `PanoStack`: üst üste binen kısa sıralı liste (koyu mor / lavanta / beyaz).
- `pn-row`: gri liste satırı (Fintora "Portfolio Breakdown").

### 5.5 Sayı (`PanoNumber`)
Tam kısım siyah, ondalık ve önek/sonek gri. `StatCard` ve analitik KPI'ları.

### 5.6 Rozet (`bz-badge`)
24 px hap. `ok` yeşil yazı açık yeşil zemin, `danger` kırmızı yazı açık
kırmızı zemin, `lime` mor zemin beyaz yazı, `dark` koyu mor zemin beyaz yazı.

### 5.7 Sekmeler / segment
Beyaz haplar arası 8 px, aktif mor hap (beyaz yazı). Kart/menü içinde pasif sekmenin
zemini yok (Fintora "All / Unread"). Seçim kartları (tema, yazı tipi, durum,
şablon kartı) beyaz kalır; seçili olan mor çerçeve / 2 px mor halka ve
lavanta zeminle işaretlenir, siyah çerçeve kullanılmaz. İlerleme çubuğunun
dolgusu mor (`ProgressBar` varsayılanı), mor kartta beyaz.

### 5.8 Menü, popover, komut paleti
Beyaz, çerçevesiz, 24 px köşe, yumuşak gölge; madde 44 px, 12 px köşe,
hover ve seçili gri. Komut paleti: 52 px gri arama hapı + gri kapat dairesi,
satırlar 16 px köşe, aktif satırda ikon dairesi mor.

### 5.9 Grafik
Çubuklar yuvarlak; ana seri mor, ikinci seri açık mor ya da siyah; pasif çubuklar
taralı gri; ipucu siyah yuvarlak kutu (değer önünde mor nokta);
ızgara kesikli `pn-line`; eksen çizgisi yok.

### 5.10 Yan panel (çekmece)
Masaüstünde ekran kenarından 8 px içeride, 32 px köşeli beyaz panel;
mobilde tam ekran.

---

## 6. Hareket

| Ne | Süre | Davranış |
|---|---|---|
| Sekme hapı | 420 ms `cubic-bezier(.32,.72,0,1)` | aktif sekmeye kayar |
| Hover | 200 ms | zemin rengi |
| Basma | 120 ms | `scale(.97)` |
| Ok butonu | 260 ms | mor dolar, ↗ 45° döner |
| İkon şeridi ipucu | 160 ms | 4 px kayarak belirir |
| Menü açılışı | 200 ms | ölçek .96→1 + saydamlık |
| Sayfa girişi | 360 ms | içerik 8 px aşağıdan, rota değişiminde bir kez |

`prefers-reduced-motion: reduce` → hepsi kapalı.

---

## 7. Mobil (<1024)

- İkon şeridi ve sekme satırı yok; beyaz bar (logo + bildirim + mor menü
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
| `src/components/panel/pano/PanelRail.tsx` | Sol ikon şeridi (`RailLink`, grup menüleri) |
| `src/components/panel/pano/PanelTopNav.tsx` | Kayan haplı sekme satırı, `MenuLinks` |
| `src/components/panel/pano/PanelMobileNav.tsx` | Mobil bar + tam ekran çekmece |
| `src/components/panel/pano/PanelBreadcrumb.tsx` | Klasörlü yol göstergesi |
| `src/components/panel/pano/PanoNumber.tsx` | Kesri gri sayı |
| `src/components/panel/pano/PanoStack.tsx` | `PanoStack`, `PanoTile` |
| `src/components/panel/pano/sentence-case.ts` | Büyük harf etiketleri cümle düzenine çevirir |
| `src/components/dashboard/UserDashboardShell.tsx` | Owner kabuğu |
| `src/components/admin/AdminPanoChrome.tsx` | Admin kabuğu (admin-nav.ts'ten) |
| `src/components/dashboard/PanoHeroCard.tsx` | Ana sayfadaki mor kahraman kart |
| `src/components/root/fonts.ts` | `--font-jakarta` |
| `.claude/skills/panel-design/SKILL.md` | Yeni panel ekranı yazarken kurallar |
| `tests/pano-design.test.ts`, `tests/pano-guard.test.ts` | Sayı / cümle düzeni; panel dosyalarında eski renk yasağı |

**Güvenlik ağı** (`pano.css` sonu) yalnız eski işaretleme içindir: satır
içi segment kontrolleri (bir izin içindeki — `bg-pn-canvas`, `tablist`,
`group` ya da ızgara olmayan `radiogroup` — doğrudan çocuk, `bg-white` /
`shadow-sm` aktif öğe) mor hap olur; kart ızgarasındaki seçim kartlarına
dokunmaz, küçük kart başlıkları 20 px olur,
`.uppercase` ve `.pulse-eyebrow` büyük harf yazmaz, büyük tabular sayılar
500 olur, kart ızgarası 10 px aralık alır. Yeni kod buna güvenmez.

---

## 9. Yapma

- Panelde Pulse ya da eski lime / yeşil hex'i (`#C6F24E`, `#A8D62E`,
  `#EAF9B8`, `#D7FE03`, `#78FC90`, `#5CF07A`) ya da `pulse-eyebrow` yazma (koruma testi kırılır); `pn-*`
  tokenlarını kullan. Müşterinin marka/menü renk varsayılanları istisnadır
  (testteki listeye eklenir).
- Kenar çubuğuna metinli menü, geri butonu, köşeli buton, büyük harf
  etiket, kart gölgesi ya da dış çerçeve ekleme.
- Mor (her tonu) zemine beyazdan başka renkte yazı ya da ikon koyma; siyah
  ya da koyu mor zemine mor yazı yazma; her mor zeminde metin ve ikon beyazdır (lavanta metin de yok).
- Aktif / birincil dolguyu siyah yapma; aktif hap, sekme, anahtar ve ana
  buton mordur. Siyah yalnız metin, ipucu, bildirim ve cihaz çerçevesidir.
- Referansların logosunu, adını, fotoğraflarını ya da metnini kullanma.
