---
name: panel-design
description: Buaze owner ve admin panellerinde (src/app/admin, src/app/[locale]/dashboard, src/components/{dashboard,admin,panel,ui}) yeni ekran, kart, buton, tablo, grafik ya da form yazarken veya mevcut bir panel ekranını düzenlerken kullan. "Pano" tasarım sisteminin (lumin referansı) renk tokenlarını, buton ailesini, kart yapısını, hareket kurallarını ve yasaklarını verir.
---

# Panel tasarımı — Pano

Tam ölçüler: `docs/design/DASHBOARD_DESIGN.md`. Kod: `src/components/panel/pano/`.
Bu dosya yazarken bakılacak kısa kural listesidir.

## Başlamadan
1. Ekran `.bz-panel` kökünün altında mı? (owner `/[locale]/dashboard/*`, admin `/admin/*`) Değilse bu skill geçerli değil.
2. Önce var olan primitive'e bak: `PageHeader`, `StatCard`, `Badge`, `Modal`, `PulseSelect`, `PulseMenu`, `APSwitch`, `EmptyState`, `Tabs`, `PanoNumber`.
3. Sayfa sarmalayıcısı: `mx-auto max-w-[1440px] px-4 sm:px-6 py-6 lg:py-8` + bölümler arası `space-y-2.5` (10 px) ya da `grid gap-2.5`.

## Renk — yalnız token
| Sınıf | Anlam |
|---|---|
| `bg-pn-canvas` | Gri tuval / kart içi gri yüzey |
| `bg-white` | Kart |
| `bg-pn-ink` / `text-pn-ink` | Siyah |
| `bg-pn-ink-2` | Koyu kart içi katman |
| `bg-pn-accent` | Lime (yalnız siyah yazıyla) |
| `hover:bg-pn-accent-hover` | Lime hover |
| `bg-pn-accent-soft` | Açık lime zemin |
| `text-pn-accent-ink` | Beyaz üstünde yeşil metin |
| `bg-pn-olive` | İkinci veri serisi |
| `border-pn-line` / `border-pn-line-strong` | Çerçeve |
| `text-[#6E6E73]` / `text-[#9A9AA0]` | İkincil / soluk metin |

Hex olarak `#C6F24E`, `#A8D62E`, `#EAF9B8`, `#FAFAFA`, `#EDEDED` yazma (Pulse değerleri; panel dışı).
Grafik kütüphanesine (recharts) renk verirken hex gerekir: lime `#D7FE03`, zeytin `#83AF3B`, siyah `#000000`, koyu `#1E1E1E`.

## Buton seçimi
- Ana eylem → `bz-btn-primary` (siyah hap). Sayfada en çok bir tane.
- Vurgu / koyu kart üstünde → `bz-btn-lime`.
- İkincil → `bz-btn` ya da `bz-btn-ghost` (çerçeveli beyaz hap).
- Yalnız ikon, kart başlığında → `bz-btn-icon` (40 px daire).
- Yalnız ikon, sayfa başlığında / üst menüde → `pn-icon-btn` (46 px daire).
- "Ayrıntıya git" → `pn-arrow-btn` (↗, hover'da döner).
- Koyu kart içinde ikon → `pn-dark-icon-btn`.
- Köşeli buton yazma; `rounded-lg` / `rounded-md` butonlarda yok.

## Kart seçimi
- İçerik bloğu → `bz-card p-5 sm:p-7` (çerçevesiz, 28 px köşe).
- Sayfanın en önemli verisi → `pn-card-dark` (siyah + lime ışıma), sayfada en çok bir.
- Öne çıkan kısa eylem/kısayol → `pn-tile` (lime).
- Liste satırı → `pn-row` (çerçeveli, 24 px köşe) ya da tablo.
- Kart başlığı: `<h2 className="pn-card-title">` (22 px / 400) + sağda daire butonlar.

## Tipografi
- Başlıklar `font-normal` (400). `font-semibold`/`font-bold` başlıkta kullanma.
- Büyük sayı: `<PanoNumber value="4,6" />` ya da `pn-num` sınıfı; kesir otomatik gri.
- Etiketler cümle düzeninde; `uppercase`, `tracking-[0.18em]`, `pulse-eyebrow`, `bz-mono` yeni kodda yok.

## Hareket
- Basılabilir her öğe `active:scale-[.97]` hissi verir (bz-* butonlar zaten yapar).
- Yeni animasyon eklerken `pano.css` sürelerini kullan (200 ms hover, 420 ms kayma, 360 ms giriş) ve `prefers-reduced-motion` altında kapat.
- Kartlara hover'da kaldırma (lift) ekleme.

## Kontrol listesi (bitirmeden)
- [ ] Pulse hex yok, token var (`grep -n "#C6F24E\|#FAFAFA\|#EDEDED" <dosya>` boş).
- [ ] Butonlar hap/daire; ikon butonların `aria-label`'ı var.
- [ ] Mobil 390 px: tek sütun, yatay taşma yok, dokunma alanı ≥ 44 px.
- [ ] Odak halkası görünür; renk kontrastı AA.
- [ ] `loading.tsx` sayfa sarmalayıcısıyla aynı (CLAUDE.md §40.10).
