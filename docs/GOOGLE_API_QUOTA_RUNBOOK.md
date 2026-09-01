# Google Business Profile API erişimi — operatör runbook'u

> **Durum (2026-09-01):** Google Cloud projesi `864975573618` için
> `accounts.list` çağrısı `429 RESOURCE_EXHAUSTED` + **`quota_limit_value: "0"`**
> dönüyor. Yani API etkin ama Google **sıfır kota** vermiş.
>
> **Bu kod ile çözülemez.** Aşağıdaki adımlar tamamlanana kadar owner
> panelinde hiçbir Google konumu listelenmez — token geçerli olsa,
> `googleReviewManagementEnabled` açık olsa, OAuth başarılı olsa bile.

---

## Neden hiçbir işletme konum göremiyor?

Supabase'de OAuth bağlı **her** restoranda `account_count = 0` — bugün
senkron olanlar dahil. Kota proje-geneli olduğu için bu tek bir owner'ın
sorunu değil; tüm Buaze kullanıcıları aynı sıfır kotayı paylaşıyor.

İki farklı engeli karıştırmayın:

| Belirti | Sebep | Çözüm |
|---|---|---|
| Owner "Google Yorumları" sekmesini hiç göremiyor | `Restaurant.googleReviewManagementEnabled = false` | Superadmin → `/admin/restaurants/[id]` → **Paket Özellikleri** (CLAUDE.md §5.2) |
| Sekme açık, OAuth başarılı, ama **konum listesi boş** | Google API kotası = 0 | **Bu doküman** |

---

## Adım adım

### 1. Ön koşulları tamamla

Google başvuruyu manuel inceliyor; eksik profil **reddedilme sebebi**.

- [ ] Başvuruyu yapacağın Google hesabı, ilgili **Google İşletme Profili'nde
      sahip (owner) veya yönetici (manager)** olmalı.
- [ ] İşletme Profili eksiksiz ve güncel olmalı: adres, telefon, çalışma
      saatleri ve **resmi web sitesi** dolu.
- [ ] Google Cloud projesi bir **Organization** hesabına bağlı olmalı
      (kişisel hesap altındaki proje reddedilebilir).

### 2. Gerekli API'leri etkinleştir

Google Cloud Console → **APIs & Services → Library** → şunları etkinleştir:

- [ ] **My Business Account Management API** ← `accounts.list` bunu kullanır
- [ ] **My Business Business Information API** ← konum listesi
- [ ] **Google My Business API** (eski, bazı review uçları hâlâ buna bakar)

> Etkinleştirmek tek başına yetmez — kota yine 0 kalır. Asıl kapı 3. adım.

### 3. Erişim başvurusunu gönder  ← **asıl adım**

Form: **https://support.google.com/business/contact/api_default**

- [ ] Açılır menüden **"Application for Basic API Access"** seç.
- [ ] **Google Cloud Project ID**'yi gir: `864975573618`
      (Console → sağ üst proje seçici → Project number).
- [ ] E-posta olarak, 1. adımdaki **GBP owner/manager** hesabını kullan.
- [ ] Kullanım amacını net yaz. Öneri:
      *"SaaS platform for restaurants and local businesses. We read the
      owner's own Business Profile reviews and publish replies on their
      behalf, with their explicit OAuth consent. Read + reply only; no
      bulk data export, no resale."*

**Beklenen süre:** genelde birkaç iş günü, bazen 1-2 hafta. Google onay/red
kararını başvuru e-postasına yollar.

### 4. Onay sonrası doğrula

Onay gelince kota otomatik açılır (Account Management API varsayılanı
**300 QPM**, sıfır değil).

- [ ] Owner panelinde **Ayarlar → Platform Bağlantıları → Google** →
      "Konumları yenile" → konumlar listeleniyor mu?
- [ ] Gelmiyorsa Console → **APIs & Services → Quotas** → ilgili API →
      "Requests per minute" değerini kontrol et; hâlâ 0 ise formda
      **"Quota increase request"** ile takip et.

### 5. Kod tarafında yapılacak bir şey yok

Onay geldiği anda mevcut kod çalışır:

- `googleBusinessFetch` `quota_limit_value: "0"` imzasını `GOOGLE_API_NOT_PROVISIONED`
  olarak sınıflandırır (CLAUDE.md §38.231) ve kota gelince bu dal hiç tetiklenmez.
- Owner paneli ve Platform Bağlantıları paneli bu durumu ayrı ayrı
  anlatır (§38.231 + §38.238); kota açılınca banner kendiliğinden kaybolur.
- Negatif cache 90 sn (§38.209) — onaydan sonra ilk denemede boş görürsen
  bir dakika bekleyip **"Konumları yenile"** de.

---

## Yapma

- **Kotayı auto-retry ile aşmaya çalışma.** Kota proje-geneli; retry onu
  tüketir ve tüm kullanıcıları birlikte 429'a sokar (CLAUDE.md §38.211 /
  §38.238 — bu anti-pattern iki kez kaldırıldı, geri eklenmemeli).
- **Owner'a "farklı Google hesabıyla dene" deme.** Kota hesaba değil
  projeye bağlı; hesap değiştirmek düzeltmez ve owner'ı boşuna uğraştırır.
- **Yeni bir Cloud projesi açıp oradan denemeyi çözüm sanma.** Yeni proje
  de onaysız sıfır kotayla başlar; üstelik OAuth client + redirect URI +
  env'leri yeniden kurman gerekir.

---

## Kaynaklar

- Ön koşullar: https://developers.google.com/my-business/content/prereqs
- Başvuru formu: https://support.google.com/business/contact/api_default
- Başvuru rehberi: https://support.google.com/business/workflow/16726127
- Kota limitleri: https://developers.google.com/my-business/content/limits
