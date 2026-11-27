---
name: panel-design
description: Buaze owner ve admin panellerinde (src/app/admin, src/app/[locale]/dashboard, src/components/{dashboard,admin,panel,ui}) yeni ekran, kart, buton, tablo, grafik ya da form yazarken veya mevcut bir panel ekranını düzenlerken kullan. "Pano" tasarım sisteminin (Fintora + lumin harmanı) renk tokenlarını, buton ailesini, kart yapısını, gezinme düzenini, hareket kurallarını ve yasaklarını verir.
---

# Panel tasarımı — Pano

Tam ölçüler: `docs/design/DASHBOARD_DESIGN.md`. Kod: `src/components/panel/pano/`.
Bu dosya yazarken bakılacak kısa kural listesidir.

## Başlamadan
1. Ekran `.bz-panel` kökünün altında mı? (owner `/[locale]/dashboard/*`, admin `/admin/*`) Değilse bu skill geçerli değil.
2. Önce var olan parçaya bak: `PageHeader`, `StatCard`, `Badge`, `Modal`, `PulseSelect`, `PulseMenu`, `APSwitch`, `EmptyState`, `Tabs`, `PanoNumber`, `PanoHeroCard`, `PanoStack`, `PanoTile`.
3. Sayfa sarmalayıcısı: `mx-auto max-w-[1440px] px-4 sm:px-6 py-6 lg:py-8` + bölümler arası `space-y-2.5` (10 px) ya da `grid gap-2.5`.
4. Gezinme: yeni ana sayfa → `UserDashboardShell` `navItems` (üst sekme); araç → `toolItems` (sol ikon şeridi); admin → `admin-nav.ts`. Kabuğa kendi menünü ekleme.

## Renk — yalnız token
| Sınıf | Anlam |
|---|---|
| `bg-pn-canvas` | Gri tuval `#F6F6F6` / kart içi gri yüzey |
| `bg-white` | Kart |
| `bg-pn-ink` / `text-pn-ink` | Siyah `#111110` |
| `bg-pn-accent` | Yeşil `#78FC90` (yalnız siyah yazıyla) |
| `bg-pn-accent-soft` + `text-pn-accent-ink` | Açık yeşil zemin + yeşil yazı (artış rozeti) |
| `bg-pn-olive` | İkinci yeşil seri |
| `border-pn-line` | Ayraç / input çerçevesi |
| `text-[#737373]` / `text-[#9A9A9A]` | İkincil / soluk metin |

`#C6F24E`, `#A8D62E`, `#EAF9B8`, `#D7FE03`, `pulse-eyebrow` yazma — `tests/pano-guard.test.ts` kırılır.
Recharts'a hex gerekirse: yeşil `#78FC90`, ikinci yeşil `#2FB24C`, siyah `#111110`.

## Buton seçimi
- Ana eylem → `bz-btn-primary` (siyah hap). Sayfada en çok bir tane.
- Vurgu / koyu kart üstünde → `bz-btn-lime` (yeşil hap).
- İkincil → `bz-btn` (tuvalde beyaz, kartta otomatik gri; çerçeve yok).
- Yalnız ikon, kart içinde → `bz-btn-icon` (40 px, kartta gri).
- Yalnız ikon, sayfa başlığında → `pn-icon-btn` (46 px beyaz daire).
- "Ayrıntıya git" → `pn-arrow-btn` (44 px gri daire, ↗ hover'da döner).
- Koyu kart içinde ikon → `pn-dark-icon-btn`.
- Köşeli buton yazma; `rounded-lg` / `rounded-md` butonlarda yok.

## Kart seçimi
- İçerik bloğu → `bz-card p-5 sm:p-6` (çerçevesiz, 24 px köşe).
- Sayfanın en önemli verisi → `pn-card-dark` / `PanoHeroCard`, sayfada en çok bir.
- Kısayol → `PanoTile` (yeşil kutu). Kısa sıralı liste → `PanoStack`.
- Liste satırı → `pn-row` (gri, 16 px köşe) ya da tablo.
- Kart başlığı: `<h2 className="pn-card-title">` (20 px / 500) + altında gri tarih, sağda ↗ ya da tarih hapı.

## Tipografi
- Plus Jakarta Sans. Başlık ve büyük sayı `font-medium` (500); gövde 400.
- Büyük sayı: `<PanoNumber value="37.201,00" />`; kesir otomatik gri.
- Etiketler cümle düzeninde; `uppercase`, `tracking-[0.18em]`, `bz-mono` yok.

## Hareket
- Basılabilir her öğe `active:scale-[.97]` (bz-* butonlar zaten yapar).
- Süreler `pano.css`'ten: 200 ms hover, 420 ms kayma, 360 ms giriş; `prefers-reduced-motion` altında kapat.
- Kartlara hover'da kaldırma (lift) ekleme.

## Kontrol listesi (bitirmeden)
- [ ] `npm test -- tests/pano-guard.test.ts` geçiyor; renkler token.
- [ ] Butonlar hap/daire; ikon butonların `aria-label`'ı var.
- [ ] Mobil 390 px: tek sütun, yatay taşma yok, dokunma alanı ≥ 44 px.
- [ ] Odak halkası görünür; kontrast AA.
- [ ] `PageHeader` başlığı düz metin değilse `crumb` verildi.
- [ ] `loading.tsx` sayfa sarmalayıcısıyla aynı (CLAUDE.md §40.10).
