---
name: panel-design
description: Buaze owner ve admin panellerinde (src/app/admin, src/app/[locale]/dashboard, src/components/{dashboard,admin,panel,ui}) yeni ekran, kart, buton, tablo, grafik ya da form yazarken veya mevcut bir panel ekranını düzenlerken kullan. "Pano" tasarım sisteminin (Fintora + lumin harmanı, mor + beyaz palet) renk tokenlarını, buton ailesini, kart yapısını, gezinme düzenini, hareket kurallarını ve yasaklarını verir.
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
| `text-pn-ink` | Metin `#111110` (siyah dolgu yalnız ipucu / bildirim / cihaz çerçevesi) |
| `bg-pn-accent text-white` | Mor `#5D3EBC`: ana buton, aktif hap/sekme, ikon dairesi — üstündeki yazı ve ikon **her zaman beyaz** |
| `hover:bg-pn-accent-hover` | Mor hover / basılı `#4C2FA3` |
| `bg-pn-accent-soft` + `text-pn-accent` | Lavanta `#EFEAFB` zemin + mor yazı (seçili satır, yumuşak rozet) |
| `bg-[#3B1F8F]` + `text-white` | Koyu mor yüzey (AI kartı, seçim çubuğu, özet); üstündeki metin ve ikon her zaman beyaz |
| `bg-pn-olive` | İkinci veri serisi `#A68FEB` |
| `border-pn-line` | Ayraç / input çerçevesi |
| `text-[#737373]` / `text-[#9A9A9A]` | İkincil / soluk metin |

`#C6F24E`, `#A8D62E`, `#EAF9B8`, `#D7FE03`, `#78FC90`, `#5CF07A`, `pulse-eyebrow` yazma — `tests/pano-guard.test.ts` kırılır.
Recharts'a hex gerekirse: mor `#5D3EBC`, ikinci seri `#A68FEB`, lavanta `#DCD3F6`, koyu mor `#3B1F8F`.
Durum renkleri anlamını korur: olumlu `#23863A`, olumsuz `#D92D20`; mor yüzeyde artış `#C8F7D2`, azalış `#FFC4C0`.
Mor zemine siyah yazı yok; siyah ya da koyu mor zemine mor yazı yok (lavanta ya da beyaz kullan).
Müşterinin seçtiği renkler (işletme rengi, menü vurgusu, sadakat kartı, QR, anket vurgusu) veridir, değiştirme.

## Buton seçimi
- Ana eylem → `bz-btn-primary` (mor hap, beyaz yazı). Sayfada en çok bir tane.
- `bz-btn-lime` tarihî ad; panelde aynı mor hap. Mor / koyu mor yüzey üstünde birincil eylem beyaz hap + mor yazı (`bg-white text-pn-accent hover:bg-pn-accent-soft`).
- İkincil → `bz-btn` (tuvalde beyaz, kartta otomatik gri; çerçeve yok).
- Yalnız ikon, kart içinde → `bz-btn-icon` (40 px, kartta gri).
- Yalnız ikon, sayfa başlığında → `pn-icon-btn` (46 px beyaz daire).
- "Ayrıntıya git" → `pn-arrow-btn` (44 px gri daire, ↗ hover'da döner).
- Mor kart içinde ikon → `pn-dark-icon-btn` (yarı saydam beyaz, hover beyaz + mor ikon).
- Köşeli buton yazma; `rounded-lg` / `rounded-md` butonlarda yok.

## Kart seçimi
- İçerik bloğu → `bz-card p-5 sm:p-6` (çerçevesiz, 24 px köşe).
- Sayfanın en önemli verisi → `pn-card-dark` / `PanoHeroCard` (mor kart, beyaz yazı, ilerleme dolgusu beyaz), sayfada en çok bir.
- Kısayol → `PanoTile` (lavanta kutu, mor ikon dairesi). Kısa sıralı liste → `PanoStack`.
- Liste satırı → `pn-row` (gri, 16 px köşe) ya da tablo.
- Seçim kartı (tema, şablon, durum) → beyaz kart; seçili olan `border-pn-accent` (ya da `shadow-[0_0_0_2px_#5D3EBC]`) + `bg-pn-accent-soft`. Siyah seçim çerçevesi yok.
- İlerleme → `ProgressBar` (varsayılan mor dolgu); mor kartta beyaz dolgu + `pn-hatch-dark`.
- Kart başlığı: `<h2 className="pn-card-title">` (20 px / 500) + altında gri tarih, sağda ↗ ya da tarih hapı.

## Tipografi
- Plus Jakarta Sans. Başlık ve büyük sayı `font-medium` (500); gövde 400.
- Büyük sayı: `<PanoNumber value="37.201,00" />`; kesir otomatik gri.
- Etiketler cümle düzeninde; `uppercase`, `tracking-[0.18em]`, `bz-mono` yok.
- Mor yüzeyde soluk metin en az `text-white/75` (AA).

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
