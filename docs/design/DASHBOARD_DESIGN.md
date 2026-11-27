# Buaze panelleri — "Pano" tasarım sistemi

> Kaynak: iki Behance konsepti harmanlandı.
> **Fintora** ("Modern Fintech CRM & SaaS Dashboard", Sriraj Mohan, 2026):
> düzen, renk, yazı tipi, kart ve grafik dili — 18 görsel 3840 px
> genişlikte incelendi, renkler görselden örneklendi (`#78FC90`, `#111110`,
> `#F6F6F6`, `#FFFFFF`; Plus Jakarta Sans; 1440 px tuval, 20 px kenar,
> 16 px oluk). **lumin** ("Online Bank / Finance SaaS", Mikalai Haluza,
> 2024): kayan siyah sekme hapı, ışımalı koyu kahraman kart, taralı
> ilerleme çubuğu, gri kesirli sayılar.
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
   Aktif olan her yerde siyah dolar.
3. **Dört renk.** Siyah `#111110`, beyaz, tuval `#F6F6F6`, yeşil `#78FC90`.
   Yeşil yalnız siyah yazıyla ya da siyah zeminde kullanılır.
4. **Hap ve daire.** Metinli her buton hap; ikonlu her buton dairedir.
   Tuvalde beyaz, beyaz kart içinde gri (`#F6F6F6`). Çerçeve yok.
5. **Plus Jakarta Sans, orta kalınlık.** Başlıklar ve büyük sayılar 500;
   gövde 400. Büyük harf etiket yok.
6. **Sayının kesri gri.** `37.201,00` → `37.201` siyah, `,00` gri.
7. **Klasörlü yol göstergesi.** Sayfa başlığının üstünde
   "📁 Panel → 📁 Yorumlar"; geri butonu yok.
8. **Koyu kahraman kart.** Sayfanın en önemli verisi siyah kartta; alttan
   yeşil ışıma yükselir (lumin).
9. **Taralı grafik.** Çubuk ve ilerleme göstergelerinde dolmayan / seçili
   olmayan kısım 45° çizgili gridir; seçili çubuk yeşil, ipucu siyah hap.
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
| `pn-accent` | `#78FC90` | Yeşil: vurgu, ikon dairesi, grafik ana seri, kısayol kutusu |
| `pn-accent-hover` | `#5CF07A` | Yeşil buton hover |
| `pn-accent-soft` | `#E6FDEA` | "+7,5%" rozeti zemini, seçili satır |
| `pn-accent-ink` | `#23863A` | Beyaz üstünde yeşil metin |
| `pn-olive` | `#2FB24C` | İkinci yeşil seri |
| `pn-canvas` | `#F6F6F6` | Tuval, kart içi gri yüzey ve butonlar |
| `pn-line` / `pn-line-strong` | `#EBEBEB` / `#E0E0E0` | Ayraç, input çerçevesi |
| `pn-ink` | `#111110` | Metin, siyah buton ve hap, koyu kart |
| `pn-ink-2` / `pn-ink-3` | `#1C1C1B` / `#2B2B2A` | Koyu kart içi katmanlar |

İkincil metin `#737373`, soluk metin `#9A9A9A`, olumsuz `#E5484D`
(rozet `#D92D20` / `#FDECEC`). Grafik kütüphanesine hex gerekirse:
yeşil `#78FC90`, ikinci yeşil `#2FB24C`, siyah `#111110`.

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
  tek bir siyah hap, sekmeler arasında kayar. 1440 px altında "Platformlar"
  ve "İşletmeler" "Diğer" menüsüne iner. Sağda işletme seçici hapı,
  "+ QR oluştur" beyaz hap (≥1280), arama, bildirim, avatar.
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
| `bz-btn-lime` | Yeşil hap, siyah yazı |
| `bz-btn` / `bz-btn-ghost` | Tuvalde beyaz hap, kart/menü/pencere içinde gri hap; çerçeve yok |
| `bz-btn-danger` | Beyaz hap, kırmızı yazı |
| `bz-btn-icon` | 40 px daire; tuvalde beyaz, kartta gri |
| `pn-icon-btn` | 46 px beyaz daire (üst satır, sayfa başlığı) |
| `pn-arrow-btn` | 44 px gri daire, ↗; hover siyah + 45° döner |
| `pn-dark-icon-btn` | 52 px koyu daire (koyu kart içinde) |
| `pn-rail-btn` | 48 px beyaz daire, aktif siyah (ikon şeridi) |

### 5.4 Kartlar
- `bz-card`: beyaz, 24 px. Başlık `pn-card-title` + gri tarih satırı,
  sağda ↗ ya da tarih hapı.
- `pn-card-dark` (`PanoHeroCard`): siyah, yeşil ışıma, 52 px eylem
  daireleri, taralı ilerleme + kaydırma topuzu (`pn-knob`), koyu satırlar
  (`pn-dark-row`, değişim `pn-up` yeşil / `pn-down` kırmızı).
- `pn-tile` (`PanoTile`): yeşil kısayol kutusu, siyah ikon dairesi.
- `PanoStack`: üst üste binen kısa sıralı liste (siyah / yeşil / beyaz).
- `pn-row`: gri liste satırı (Fintora "Portfolio Breakdown").

### 5.5 Sayı (`PanoNumber`)
Tam kısım siyah, ondalık ve önek/sonek gri. `StatCard` ve analitik KPI'ları.

### 5.6 Rozet (`bz-badge`)
24 px hap. `ok` yeşil yazı açık yeşil zemin, `danger` kırmızı yazı açık
kırmızı zemin, `lime` yeşil zemin siyah yazı, `dark` siyah zemin yeşil yazı.

### 5.7 Sekmeler / segment
Beyaz haplar arası 8 px, aktif siyah hap. Kart/menü içinde pasif sekmenin
zemini yok (Fintora "All / Unread").

### 5.8 Menü, popover, komut paleti
Beyaz, çerçevesiz, 24 px köşe, yumuşak gölge; madde 44 px, 12 px köşe,
hover ve seçili gri. Komut paleti: 52 px gri arama hapı + gri kapat dairesi,
satırlar 16 px köşe, aktif satırda ikon dairesi siyah.

### 5.9 Grafik
Çubuklar yuvarlak; ana seri yeşil, ikinci seri siyah; pasif çubuklar
taralı gri; ipucu siyah yuvarlak kutu (değer önünde yeşil nokta);
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
| Ok butonu | 260 ms | siyah dolar, ↗ 45° döner |
| İkon şeridi ipucu | 160 ms | 4 px kayarak belirir |
| Menü açılışı | 200 ms | ölçek .96→1 + saydamlık |
| Sayfa girişi | 360 ms | içerik 8 px aşağıdan, rota değişiminde bir kez |

`prefers-reduced-motion: reduce` → hepsi kapalı.

---

## 7. Mobil (<1024)

- İkon şeridi ve sekme satırı yok; beyaz bar (logo + bildirim + siyah menü
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
| `src/components/dashboard/PanoHeroCard.tsx` | Ana sayfadaki koyu kahraman kart |
| `src/components/root/fonts.ts` | `--font-jakarta` |
| `.claude/skills/panel-design/SKILL.md` | Yeni panel ekranı yazarken kurallar |
| `tests/pano-design.test.ts`, `tests/pano-guard.test.ts` | Sayı / cümle düzeni; panel dosyalarında eski renk yasağı |

**Güvenlik ağı** (`pano.css` sonu) yalnız eski işaretleme içindir: satır
içi segment kontrolleri siyah hap olur, küçük kart başlıkları 20 px olur,
`.uppercase` ve `.pulse-eyebrow` büyük harf yazmaz, büyük tabular sayılar
500 olur, kart ızgarası 10 px aralık alır. Yeni kod buna güvenmez.

---

## 9. Yapma

- Panelde Pulse ya da eski lime hex'i (`#C6F24E`, `#A8D62E`, `#EAF9B8`,
  `#D7FE03`) ya da `pulse-eyebrow` yazma (koruma testi kırılır); `pn-*`
  tokenlarını kullan. Müşterinin marka/menü renk varsayılanları istisnadır
  (testteki listeye eklenir).
- Kenar çubuğuna metinli menü, geri butonu, köşeli buton, büyük harf
  etiket, kart gölgesi ya da dış çerçeve ekleme.
- Beyaz zemine yeşil metin yazma (yeşil metin için `pn-accent-ink`).
- Referansların logosunu, adını, fotoğraflarını ya da metnini kullanma.
