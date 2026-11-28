---
name: panel-design
description: Buaze owner ve admin panellerinde (src/app/admin, src/app/[locale]/dashboard, src/components/{dashboard,admin,panel,ui}) yeni ekran, kart, buton, tablo, grafik ya da form yazarken veya mevcut bir panel ekranını düzenlerken kullan. "Pano" tasarım sisteminin (Fintora + lumin harmanı, siyah + Pulse lime + beyaz palet) renk tokenlarını, buton ailesini, kart yapısını, gezinme düzenini, hareket kurallarını ve yasaklarını verir.
---

# Panel tasarımı — Pano

Tam ölçüler: `docs/design/DASHBOARD_DESIGN.md`. Kod: `src/components/panel/pano/`.
Bu dosya yazarken bakılacak kısa kural listesidir.

## Başlamadan
1. Ekran `.bz-panel` kökünün altında mı? (owner `/[locale]/dashboard/*`, admin `/admin/*`) Değilse bu skill geçerli değil.
2. Önce var olan parçaya bak: `PageHeader`, `StatCard`, `Badge`, `Modal`, `PulseSelect`, `PulseMenu`, `APSwitch`, `EmptyState`, `Tabs`, `PanoNumber`, `PanoHeroCard`, `WizardSteps` (sihirbaz kiti), `SettingsCard`, `ReviewSourceSwitch`.
3. Sayfa sarmalayıcısı: `mx-auto max-w-[1440px] px-4 sm:px-6 py-6 lg:py-8` + bölümler arası `space-y-2.5` (10 px) ya da `grid gap-2.5`.
4. Gezinme: günlük ana sayfa → `UserDashboardShell` `navItems` (üst sekme + sol menüde "Genel", en çok 4: Panel, Yorumlar, QR, Analitik); yönetim/araç sayfası → sol menü bölümü (`railSections`); hesap → menünün altındaki kullanıcı kartı; admin → `admin-nav.ts` (her grup sol menüde bir bölüm). Aynı konunun ikinci kaynağı (ör. Google yorumları) ayrı sekme değil, sayfa içi bölümlü seçicidir. Kabuğa kendi menünü ekleme.

## Renk — yalnız token
| Sınıf | Anlam |
|---|---|
| `bg-pn-canvas` | Gri tuval `#F6F6F6` / kart içi gri yüzey |
| `bg-white` | Kart |
| `text-pn-ink` | Metin `#111110` |
| `bg-pn-accent text-white` | Siyah `#111110`: ana buton, aktif hap/sekme, ikon dairesi |
| `hover:bg-pn-accent-hover` | Siyah hover / basılı `#2B2B2A` |
| `bg-pn-accent-soft` | Açık lime `#F4FBDC`: seçili liste satırı, sakin not kutusu |
| `bg-pn-olive text-pn-ink` | Lime vurgu `#C6F24E`: siyah üstündeki ikon dairesi, lime hap (`bz-btn-lime`), seçili çubuk, ikinci veri serisi (CSS içinde `var(--pn-green)`) |
| `border-pn-line` | Ayraç / input çerçevesi |
| `text-[#737373]` / `text-[#9A9A9A]` | İkincil / soluk metin |

Emekli vurguları (Fintora yeşili `#78FC90` / `#5CF07A`, lumin lime `#D7FE03`, mor `#5D3EBC` ailesi) ve `pulse-eyebrow` yazma — `tests/pano-guard.test.ts` kırılır. Lime'a token ile ulaş, hex yazma.
Recharts'a hex gerekirse: siyah `#111110`, lime `#C6F24E`, açık gri `#E0E0E0`.
Durum renkleri anlamını korur: olumlu `#23863A`, olumsuz `#D92D20`.
Siyah zeminde yazı beyaz (vurgu ikonu lime); lime zeminde yazı siyah; beyaz zeminde lime yazı yok.
Mor, eski yeşil ya da başka marka rengini panel vurgusu yapma. Müşterinin seçtiği renkler (işletme rengi, menü vurgusu, sadakat kartı, QR, anket vurgusu) veridir, değiştirme.

## Buton seçimi
- Ana eylem → `bz-btn-primary` (siyah hap, beyaz yazı). Sayfada en çok bir tane.
- Siyah yüzey üstünde ya da basılı filtre → `bz-btn-lime` (lime hap, siyah yazı).
- İkincil → `bz-btn` (tuvalde beyaz, kartta otomatik gri; çerçeve yok).
- Yalnız ikon, kart içinde → `bz-btn-icon` (40 px, kartta gri).
- Yalnız ikon, sayfa başlığında → `pn-icon-btn` (46 px beyaz daire).
- "Ayrıntıya git" → `pn-arrow-btn` (44 px gri daire, ↗ hover'da döner).
- Köşeli buton yazma; `rounded-lg` / `rounded-md` butonlarda yok.

## Kart seçimi
- İçerik bloğu → `bz-card p-5 sm:p-6` (çerçevesiz, 24 px köşe).
- Sayfanın en önemli verisi → `PanoHeroCard` düzeni (Fintora ana kartı: beyaz, büyük sayı, `pn-change` hapı, gri `pn-action-pill`'ler, siyah trend, gri döküm satırları). Koyu dolgulu kahraman kart yazma.
- Kısayol ve kısa sıralı liste → gri `pn-row` satırları (ikon dairesi + başlık + gri alt satır + sağda değer/↗).
- Sihirbaz → `WizardSteps` (+ `surface="card"` kart/pencere içinde, `locale`), adım başına tek beyaz kart, alt çubukta gri "Geri" + siyah ana hap.
- Liste satırı → `pn-row` (gri, 16 px köşe) ya da tablo.
- Seçim kartı (tema, şablon, durum) → beyaz kart; seçili olan 2 px siyah halka + `bg-pn-accent-soft`.
- İlerleme → `ProgressBar` (varsayılan siyah dolgu); siyah yüzeyde lime.
- Kart başlığı: `<h2 className="pn-card-title">` (20 px / 500) + altında gri tarih, sağda ↗ ya da tarih hapı.
- Sakin durum sekmeleri (güçlü bir seçicinin altında) → `InboxStatusTabs variant="soft"` (`data-tone="soft"` güvenlik ağından çıkar).

## Tipografi
- Plus Jakarta Sans. Başlık ve büyük sayı `font-medium` (500); gövde 400.
- Büyük sayı: `<PanoNumber value="37.201,00" />`; kesir otomatik gri.
- Etiketler cümle düzeninde; `uppercase`, `tracking-[0.18em]`, `bz-mono` yok.

## Hareket
- Basılabilir her öğe `active:scale-[.97]` (bz-* butonlar zaten yapar).
- Süreler `pano.css`'ten: 200 ms hover, 420 ms kayma, 360 ms giriş; `prefers-reduced-motion` altında kapat.
- Kartlara hover'da kaldırma (lift) ekleme.

## Yapay zekâ
- AI çağrısı yalnız kullanıcı bir düğmeye basınca yapılır ("Taslak oluştur", "AI taslağı", "Özet çıkar"). Sayfa ya da kayıt açılınca kendiliğinden AI çalıştırma (CLAUDE.md §15).
- Yalnız ikonlu kısayola tek kelimelik görünür ad ekle; ikon tek başına yetmez.

## Kontrol listesi (bitirmeden)
- [ ] `npm test -- tests/pano-guard.test.ts` geçiyor; renkler token.
- [ ] Butonlar hap/daire; ikon butonların `aria-label`'ı var.
- [ ] Mobil 390 px: tek sütun, yatay taşma yok, dokunma alanı ≥ 44 px.
- [ ] Odak halkası görünür; kontrast AA.
- [ ] `PageHeader` başlığı düz metin değilse `crumb` verildi.
- [ ] `loading.tsx` sayfa sarmalayıcısıyla aynı (CLAUDE.md §40.10).
