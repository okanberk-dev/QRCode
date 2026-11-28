# Buaze pazarlama sitesi — "Ritim" tasarım sistemi

> Kaynak: `ritim-pos-paketi` (2026-11). Paket, pos.toasttab.com'un tasarım dilini
> (renk mantığı, tipografi ölçeği, boşluklar, köşe/gölge/hareket, bileşen ve
> sayfa düzenleri) 1440 px masaüstü ve 390 px mobilde `getComputedStyle` ile
> ölçerek çıkardı. Buaze'ye bu ölçülerle birebir uyarlandı; **içerik Buaze'nin**.
> Referans sitenin logosu, fotoğrafı, videosu ve metni kullanılmaz (telif ve
> marka hakkı).
>
> Kod: `src/components/marketing/ritim/` — `ritim.css` (token + bileşen),
> `interactive.tsx` (istemci adaları), `icons.tsx`, `media.ts`.
> Kapsam: yalnız pazarlama sayfaları (üst menüsü `.rt-header` olan sayfalar).
> Owner/admin panelleri, `/r`, `/menu`, `/l`, `/hesap`, auth Pulse tasarımında
> kalır (CLAUDE.md §11, §49).

---

## 1. Tasarım dili — 10 kural

1. **Tek ağırlık, büyük başlık.** Başlıklar `400` ağırlıkta, büyük puntoda (64/64, 48/52.8). Hiyerarşiyi boyut kurar.
2. **Sıkı satır yüksekliği.** Görüntü başlıklarında satır yüksekliği puntoya eşit ya da küçük (100/80, 64/64).
3. **Sıcak nötrler.** Saf gri yok: metin `#252525`, ikincil `#565352`, krem zemin `#F9F5F3`.
4. **Pulse renkleri.** Grafit dolgu, lime vurgu ve birincil buton, beyaz zemin; alt bilgi grafit çerçeve.
5. **Hap butonlar.** Buton ve inputlar `border-radius: 100px`. Birincil buton içe gölgeli.
6. **Büyük yuvarlak paneller.** Bölüm panelleri ve alt bilgi kartı 48 px, kartlar 20–24 px.
7. **Fotoğraf + marka örtüsü.** Ürün kartında fotoğrafın altına marka gradyanı; beyaz, ortalı metin.
8. **Vurgu kelime.** Bazı başlıklarda alt yarısı lime vurgulu kelime (`rt-script`) ya da lime çizim halkası (`Scribble`).
9. **Krem/beyaz katmanlar.** Beyaz bölümler alt köşeleri 48 px "yaprak" gibi krem zeminin üstüne biner (`.rt-sheet`).
10. **Sakin hareket.** Bölümler kaydırınca 24 px aşağıdan belirir; hover 300 ms `cubic-bezier(.4,0,.2,1)`.

---

## 2. Renkler (`--rt-*`, `ritim.css` en üstte)

### 2.1 Marka rampası — Pulse (2026-11-28, kullanıcı kararı)
Düzen ve ölçüler Ritim paketinden kalır; renkler ve yazı tipleri Pulse'tır (CLAUDE.md §11).

| Token | Değer | Kullanım |
|---|---|---|
| `--rt-brand-300` | `#C6F24E` | Lime: koyu zeminde vurgu, el çizimi halka, seçim |
| `--rt-brand-500` | `#0A0A0A` | Grafit: ikon, aktif segment, onay işareti, odak |
| `--rt-brand-600` | `#C6F24E` | **Birincil buton** lime, yazı grafit (hover `--rt-brand-hover` `#A8D62E`) |
| `--rt-brand-700` | `#0A0A0A` | Link, çerçeveli buton, koyu ürün kartı |
| `--rt-brand-800` | `#1A1A1A` | Koyu panel, kapanış örtüsü |
| `--rt-brand-950` | `#0A0A0A` | Alt bilgi çerçevesi |
| `--rt-brand-50` | `#EAF9B8` | Lime soft: rozet, ikon kutusu |

> Lime zeminde yazı grafit; beyaz zeminde lime yazı yok (okunmaz). `rt-btn--solid` grafit + beyaz.

### 2.2 Nötrler
| Token | Değer | Kullanım |
|---|---|---|
| `--rt-ink-900` | `#0A0A0A` | Ana metin, başlık |
| `--rt-ink-700` | `#525252` | İkincil metin, lead |
| `--rt-ink-500` | `#737373` | Soluk metin |
| `--rt-ink-300` | `#D4D4D4` | Pasif madde |
| `--rt-line` / `--rt-line-2` | `#EDEDED` / `#E5E5E5` | Kart / form çerçevesi |
| `--rt-cream` / `-2` / `-3` | `#FAFAFA` / `#F5F5F5` / `#FAFAFA` | Açık gri yüzeyler (adlar paketten kaldı) |

### 2.3 Destek renkleri ve gradyanlar
| Token | Değer | Nerede |
|---|---|---|
| `--rt-lime` | `#C6F24E` | Varsayılan rozet ("ÜCRETSİZ ARAÇ") |
| `--rt-sky` | `#9FC5F0` | "ÖNE ÇIKAN" rozeti, önerilen paket bayrağı |
| `--rt-sun` | `#FED850` | "Yeni" rozeti (koyu kartlar) |
| `--rt-grad-brand` | `130deg, #262626 → #0A0A0A` (grafit) | Güven paneli, özellik "bir bakışta" paneli, CTA bandı |
| `--rt-grad-plan-card` | `0deg, #FAFAFA → #FFFFFF` | Fiyat kartları, ticari kartlar |
| `--rt-grad-dark-card` | `#0A0A0A → #262626` | Koyu "yorumların ötesinde" kartları |
| `--rt-grad-ai` | sarı → turuncu → pembe → mor → lacivert → açık mavi | Pulse AI başlığı ve sohbet çerçevesi |

---

## 3. Tipografi

| Rol | Font | Değişken |
|---|---|---|
| Başlık (h1–h6, `rt-t-display…rt-t-h5`) | **Clash Display** 500 (Pulse, §11) | `--rt-font-display` |
| Gövde, menü, form etiketi | **Inter** | `--rt-font-sans`, `--rt-font-ui` |
| Eyebrow (büyük harf etiket) | **JetBrains Mono** 500, 0,18em | `--rt-font-mono` |
| Vurgu kelime (`rt-script`) | Clash Display + alt yarısı lime vurgu | `--rt-font-script` |

Fontlar `src/components/root/fonts.ts`'te. Pazarlama sayfasında `body` üzerinde
`--font-heading` Clash Display, `--font-body` Inter, `--font-mono` JetBrains Mono olur.
Figtree, Source Sans 3 ve Caveat 2026-11-28'de kaldırıldı.

### Ölçek (masaüstü / mobil ≤767 px)
| Sınıf | Masaüstü | Mobil | Kullanım |
|---|---|---|---|
| `.rt-hero__title` | 100/80 | 64/56 → `clamp(42px, 13.5vw, 64px)` | Ana sayfa H1 |
| `.rt-t-display` | 80/80 | 52/52 → `clamp(40px, 12vw, 52px)` | Kapanış CTA |
| `.rt-t-h1` | 64/64 | 40/40 | Bölüm ve iç sayfa başlığı |
| `.rt-t-h2` | 48/52.8 | 32/35.2 | Alt bölüm, SSS başlığı |
| `.rt-t-h3` | 32/35.2 | 26/28.6 | Kart başlığı |
| `.rt-hero__sub` | 28/39.2 | 18/23.4 | Hero alt metni |
| `.rt-t-h4` | 26/28.6 | 22/24.2 | Ürün kartı, adım |
| `.rt-t-h5` | 22/24.2 | 22/24.2 | Plan adı |
| `.rt-t-lead` | 20/28, `ink-700` | 18/25.2 | Bölüm açıklaması |
| gövde | 16/24 | 16/24 | — |
| nav | 15/15 | — | Üst menü |
| `.rt-eyebrow` | 12/14.4, 600, BÜYÜK HARF, +1.2 px, Source Sans 3 | aynı | Sayfa üstü etiket |

Kurallar: başlıklar 400; kalın yalnız istatistik ve rozet. Vurgu kelime `Scribble`
(halka) ya da `.rt-script` (−2° el yazısı). **H1 SEO için anahtar kelimeyle başlar**
(CLAUDE.md §35.11); paketteki "H1 = eyebrow" deseni kullanılmaz.

---

## 4. Yerleşim

| Öğe | Değer |
|---|---|
| Konteyner `.rt-container` | 1320 px (yan boşluk 32 px → içerik 1256 px), mobil yan boşluk 16 px |
| Bölümler arası `.rt-section` | 144 px (mobil 64 px) |
| Şablon bölüm iç boşluğu (özellik/sektör/ticari) | `py-[64px] lg:py-[112px]` |
| Duyuru şeridi | 40 px, `cream-2` |
| Header | 72 px (mobil 56 px), sticky, beyaz; kaydırınca 1 px alt çizgi |
| Ürün ızgarası | 4 × 296 px, `gap: 48px 24px` (≤1279: 2'li, ≤767: tek) |
| Koyu kartlar | 3 sütun, 550 px yükseklik, `gap: 16px` |
| SSS | 314 px başlık + liste, `gap: 64px` |

Kırılımlar: `≤1279` (4'lü → 2'li), `≤1023` (menü → çekmece, 2 sütun → 1), `≤767` (mobil tipografi).
Eski sayfa kodundaki `max-w-[1200px]` / `max-w-[1100px]` konteynerleri 1320'ye genişler.

---

## 5. Köşe, gölge, hareket

| Token | Değer | Kullanım |
|---|---|---|
| `--rt-r-pill` | 100 px | Buton, input, segment |
| `--rt-r-chip` | 72 px | İşletme hapları |
| `--rt-r-xl` | 48 px | Panel, hero altı, alt bilgi kartı, SSS satırı |
| `--rt-r-lg` | 24 px | Plan, medya kartı, form çerçevesi, ticari kart |
| `--rt-r-md` | 20 px | Ürün kartı, koyu kart |
| `--rt-r-sm` | 16 px | Menü kartı, tablo iç yüzeyi |
| `--rt-r-input` | 6 px | Form inputları |
| `--rt-sh-soft` | `0 4px 12px rgba(0,0,0,.04)` | — |
| `--rt-sh-lg` | 2 katmanlı | Mega menü, yüzen çip |
| `--rt-sh-panel` | 2 katmanlı | Gradyan panel |
| `--rt-sh-float` | 4 katmanlı uzun yumuşak | Alt bilgi kartı, hero fotoğrafı |
| `--rt-sh-btn-inset` | içe 3 katman | Birincil buton, aktif segment |
| `--rt-ease` / `--rt-dur` | `cubic-bezier(.4,0,.2,1)` / 300 ms | Tüm geçişler |

**Belirme** (`.rt-reveal`): JS'siz kaydırmaya bağlı CSS animasyonu
(`animation-timeline: view()`), dolgu yok → kaydırılmayan tam sayfa görüntüsünde
ve Google render'ında içerik her zaman görünür. `prefers-reduced-motion` açıkken
tüm hareket kapanır.

---

## 6. Bileşenler (`rt-` sınıfları)

| Bileşen | Sınıf / React | Ölçü |
|---|---|---|
| Butonlar | `.rt-btn` + `--primary` (içe gölge) · `--solid` · `--outline` · `--white` · `--ghost-white` · `--sm` · `--block` | 48 px (sm 40), `16px 32px`, 16/16 |
| Duyuru + header + mega menü + çekmece | `MarketingNavbarClient` | 72 px; açık öğede 4 px marka çizgisi; mega: 264 px kart sütunu + 3 link sütunu, alt köşeler 48 px, sayfa `rgba(37,37,37,.45)` ile kararır |
| Hero | `HeroCinematic` (`.rt-hero`) | 720 px, alt köşeler 48 px; play hap → H1 → alt metin → e-posta yakalama (489×64) → not → küçük link |
| E-posta yakalama | `RtCapture` | Hap input, içinde 48 px birincil buton; `/auth/register?email=` |
| İşletme şeridi | `HomeBusinessStrip` (`.rt-logos`) | 40 sn kayan kelime şeridi — müşteri logosu değil |
| Ürün kartı | `.rt-product-card` | 296×414, 20 px köşe, alttan marka gradyanı, sağ üstte 40 px cam ok |
| Segment kontrol | `RtSegmented` | Krem hap, aktif marka dolgu + içe gölge |
| Pulse AI | `HomePulseAi` | Gradyan 64 px başlık, 2 px gradyan çerçeveli "Örnek ekran", 4 numaralı adım |
| Yapışkan özellik | `RtStickyFeature` | Krem panel, 48/52.8 liste, 636×720 yapışkan foto |
| Gradyan panel | `.rt-cta-panel` | 64 px iç boşluk, 48 px köşe, `grad-brand` — **mühür/ödül rozeti yok** (§51) |
| Sektör rayı | `RtStories` | 958×630 ana kart + daralan şeritler; müşteri hikâyesi değil, sektör bilgisi |
| İşletme hapları | `.rt-chips` / `.rt-chip` | 32/40, hover'da −4° foto önizleme |
| Koyu kartlar | `.rt-dark-card` | 550 px, 20 px köşe, foto + örtü |
| Banner | `.rt-banner` | Krem, 1 fr + 360 px görsel |
| SSS | `RtFaqList` (buton) · `FaqList` / `.rt-faqd` (`<details>`, çapalı) | Krem hap satır, açık satır koyu |
| Dikey sekmeler | `RtVTabs` | 590×600 görsel + çizgili sekmeler |
| Kapanış | `HomeFinalCta` (`.rt-closing`) | 1320 px, üst köşeler 48 px, alt bilgiye 40 px biner, 80 px başlık + halka |
| Alt bilgi | `MarketingFooter` | Düz `--rt-brand-950` grafit çerçeve (40 px; mobil 24/12 px) içinde 1260 px beyaz kart (48 px köşe, `64px 90px`). Kartın altında hiçbir şey yok: gradyan, nokta deseni, "yapay zekâya sor" simgeleri ve dev logo 2026-11-27'de kaldırıldı (kullanıcı: yapay zekâ işi gibi duruyor) |
| Plan kartı | `PricingPlans` | 24 px köşe, `grad-plan-card`; önerilen: 2 px marka çerçeve + `sky` bayrak |
| Uzun metin | `.rt-prose` | 18/30 (mobil 16/26), h2 32, h3 26 |

Ortak şablonlar: `FeaturePageLayout` (bölünmüş hero: metin + foto + üstünde yüzen
"Örnek ekran"), `SolutionPageLayout` (bölünmüş hero, sektör fotoğrafı ya da krem
panelde illüstrasyon), `commercial/*` (`PageHero`, `SectionHeader`, `CtaBand` =
gradyan panel, `FaqList` = `.rt-faqd`), `LegalDocumentPage` (krem sayfa başı + `.rt-prose`).

---

## 7. Sayfa şablonları

**Ana sayfa:** duyuru → header → hero → işletme şeridi → ürün kartları (Yorumlar | İşletme araçları) → Pulse AI → yapışkan "nasıl çalışır" → güven paneli (Google kuralları + KVKK) → sektör rayı + işletme hapları → platform bağlantıları → koyu kartlar (Denetim, Anket, Sadakat) → ücretsiz QR banner → SSS → kapanış → alt bilgi.

**Özellik:** bölünmüş hero → tanım → yetenek kartları (krem) → adımlar → gradyan "bir bakışta" paneli → sektörler → SSS → ilgili özellikler → ortalı CTA + geniş foto.

**Sektör:** breadcrumb + bölünmüş hero → nasıl işler → QR yerleşimi → panel özellikleri → platformlar → sorular → (gizlilik) → SSS → ilgili sektörler → CTA.

---

## 8. Medya

- Fotoğraflar `public/images/site/*.jpg` (39 adet, Unsplash lisansı; liste: `MARKETING_IMAGES.md`). Aynı dosya adıyla değiştirilir. `next/image` ile servis edilir.
- **Video yuvaları** `src/components/marketing/ritim/media.ts` → `SITE_VIDEOS.hero`, `SITE_VIDEOS.closing`. `null` iken fotoğraf görünür. Kendi `.mp4`'ünüzü `public/videos/` altına koyup yolunu yazın (sessiz, döngülü, `playsInline`).
- Başka bir şirketin fotoğrafı, videosu ya da logosu kullanılmaz.

---

## 9. Metin kuralları (değişmedi)

İçerik CLAUDE.md §51'e uyar: yorum akışı tek doğru anlatım (D1), uyum davranışla
(D2), isimli alıntı / kurgusal hikâye / doğrulanamayan rakam yok. Paketteki
"Örnek içerik" müşteri hikâyeleri, ödül rozetleri, ₺ fiyatları, 0850 telefonları
ve "7/24 destek" gibi iddialar **Buaze'ye taşınmadı**.

---

## 10. Erişilebilirlik

- Odak halkası 2 px marka rengi, 3 px ofset; "İçeriğe geç" linki.
- Mega menü `aria-expanded`/`aria-controls`, Esc ve dışarı tıklama kapatır; kapalı paneller `inert`.
- SSS ve sekmeler `aria-expanded` / `aria-selected`; tüm yanıtlar sunucu HTML'inde.
- Beyaz metin yalnız ≥4.5:1 marka tonlarında ya da örtülü fotoğrafta.

## 11. Yeni sayfa / bölüm kontrol listesi

1. `rt-container` + `rt-section` (ya da şablonun `SECTION_Y`'si); konteyner ve renkleri elle yazma.
2. Başlık `rt-t-h1`/`rt-t-h2` (400), açıklama `rt-t-lead`, etiket `rt-eyebrow`.
3. Buton `rt-btn` varyantları; yeni Pulse renk sınıfı (`#0A0A0A`, `#C6F24E`) yazma — güvenlik ağı yalnız eski kod içindir.
4. Görsel `next/image` + `img('dosya')`; dekoratif görselde `alt=""`.
5. Etkileşim gerekiyorsa `interactive.tsx`'teki adaları kullan; içerik sunucuda render edilsin.
6. Mobilde 390 px'te yatay taşma yok (uzun Türkçe kelimeler).
