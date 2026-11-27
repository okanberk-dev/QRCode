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
4. **Tek güçlü marka rengi.** Butonlar, vurgular, ürün kartları ve alt bilgi aynı rampadan (açık → ana → koyu).
5. **Hap butonlar.** Buton ve inputlar `border-radius: 100px`. Birincil buton içe gölgeli.
6. **Büyük yuvarlak paneller.** Bölüm panelleri ve alt bilgi kartı 48 px, kartlar 20–24 px.
7. **Fotoğraf + marka örtüsü.** Ürün kartında fotoğrafın altına marka gradyanı; beyaz, ortalı metin.
8. **El yazısı vurgu.** Bazı başlıklarda el yazısı (Caveat) satır ya da kelimeyi saran çizim halkası (`Scribble`).
9. **Krem/beyaz katmanlar.** Beyaz bölümler alt köşeleri 48 px "yaprak" gibi krem zeminin üstüne biner (`.rt-sheet`).
10. **Sakin hareket.** Bölümler kaydırınca 24 px aşağıdan belirir; hover 300 ms `cubic-bezier(.4,0,.2,1)`.

---

## 2. Renkler (`--rt-*`, `ritim.css` en üstte)

### 2.1 Marka rampası — lime (2026-11-27, Buaze Pulse rengi)
| Token | Değer | Kullanım |
|---|---|---|
| `--rt-brand-300` | `#DCF78F` | Açık lime: gradyan başlangıcı, koyu zeminde vurgu, sektör kartı başlığı |
| `--rt-brand-500` | `#C6F24E` | Lime: dolgu, aktif segment, çizgi, karalama, odak halkası |
| `--rt-brand-600` | `#C6F24E` | **Birincil buton** (yazı `--rt-on-brand`) |
| `--rt-brand-hover` | `#A8D62E` | Lime dolgu hover, gradyan panel bitişi |
| `--rt-on-brand` | `#0A0A0A` | Lime dolgu üstündeki yazı ve ikon (≈ 14:1) |
| `--rt-brand-700` | `#3F5408` | Zeytin: link, çerçeveli buton, açık zeminde ikon/onay; beyaz yazılı koyu dolgu (ürün kartı) |
| `--rt-brand-800` | `#1F2908` | Koyu zeytin: fotoğraf üstü karartma |
| `--rt-brand-950` | `#0A0A0A` | Grafit: alt bilgi gradyanının sonu |
| `--rt-brand-50` | `#EAF9B8` | Lime soft: rozet, hover |

> Lime açık bir renktir: beyaz zeminde yazı ya da ikon olarak kullanılmaz
> (≈ 1,3:1). Lime dolgunun üstünde yazı `--rt-on-brand`, beyaz zeminde
> vurgu yazısı `--rt-brand-700`. Gradyan paneller (`.rt-cta-panel`) lime
> olduğu için içindeki onay işaretleri, "ghost" düğme ve eyebrow
> `--rt-on-brand`'a çevrilir (`ritim.css`).

### 2.2 Nötrler
| Token | Değer | Kullanım |
|---|---|---|
| `--rt-ink-900` | `#252525` | Ana metin, başlık, açık SSS satırı |
| `--rt-ink-700` | `#565352` | İkincil metin, lead, alt bilgi linkleri |
| `--rt-ink-500` | `#99928E` | Soluk metin, pasif sekme |
| `--rt-ink-300` | `#D0CAC6` | Yapışkan listede pasif madde |
| `--rt-line` | `#E7E2DF` | Kart çerçevesi, ayraç |
| `--rt-line-2` | `#E5E7EB` | Form çerçevesi |
| `--rt-line-3` | `#C0C0C0` | Hero e-posta input çerçevesi |
| `--rt-cream` | `#F9F5F3` | Krem zemin (bölüm, kart, hap) |
| `--rt-cream-2` | `#F6F1EE` | Duyuru şeridi |
| `--rt-cream-3` | `#F7F5F2` | Sohbet balonu |

### 2.3 Destek renkleri ve gradyanlar
| Token | Değer | Nerede |
|---|---|---|
| `--rt-lime` | `#AFE26C` | Varsayılan rozet ("ÜCRETSİZ ARAÇ") |
| `--rt-sky` | `#9FC5F0` | "ÖNE ÇIKAN" rozeti, önerilen paket bayrağı |
| `--rt-sun` | `#FED850` | "Yeni" rozeti (koyu kartlar) |
| `--rt-grad-brand` | `130deg, 300 %2.95 → 500 %46.45 → hover %101.77` (lime, yazı grafit) | Güven paneli, özellik "bir bakışta" paneli, CTA bandı |
| `--rt-grad-plan-card` | `0deg, #F9F9F9 → #F8F6F4` | Fiyat kartları, ticari kartlar |
| `--rt-grad-dark-card` | `#252525 → #413E3D` | Koyu "yorumların ötesinde" kartları |
| `--rt-grad-footer` | 180deg lime 500 → 800 %38 → grafit 950 %70 | Alt bilgi zemini (+ nokta deseni): üstte lime, altta grafit; yazılar beyaz |
| `--rt-grad-ai` | sarı → turuncu → pembe → mor → lacivert → açık mavi | Pulse AI başlığı ve sohbet çerçevesi |

---

## 3. Tipografi

| Rol | Font | Değişken |
|---|---|---|
| Başlık + gövde | **Figtree** (OFL, Google Fonts) | `--rt-font-sans` |
| Menü, form etiketi, eyebrow | **Source Sans 3** (OFL) | `--rt-font-ui` |
| El yazısı vurgu | **Caveat** (OFL) | `--rt-font-script` |

Fontlar `src/components/root/fonts.ts`'te (`preload: false`, `latin` + `latin-ext`).
Pazarlama sayfasında `body` üzerinde `--font-heading`, `--font-body`, `--font-mono`
bu fontlara döner; eski sayfa kodu da Figtree/Source Sans 3 ile görünür.
**Clash Display pazarlama sayfalarında kullanılmaz** (lisans sorunu yok, tasarım kararı).

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
| Alt bilgi | `MarketingFooter` | Gradyan + nokta deseni; 1260 px beyaz kart (48 px köşe, `64px 90px`); yapay zekâya sor; büyük beyaz "buaze." |
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
