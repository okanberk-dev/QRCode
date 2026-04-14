# Buaze QR Feedback Platform

Bu repo, restoranlar ve hizmet isletmeleri icin gelistirilmis bir QR tabanli geri bildirim ve dijital itibar yonetimi platformunun kaynak kodunu icerir.

Uygulama temel olarak su akisi uzerine kuruludur:

1. Isletme icin ozel bir QR kod uretilir.
2. Musteri QR kodu okutup geri bildirim ekranina gider.
3. Yuksek puan veren kullanicilar Google yorum sayfasina yonlendirilir.
4. Dusuk puanli geri bildirimler veritabanina kaydedilir ve isletmeye e-posta ile bildirilir.
5. Isletme sahipleri ve yoneticiler panelden tum geri bildirimleri, restoranlari ve QR kodlarini yonetir.

## Neler Var

- `tr` ve `en` dilleri icin route tabanli cok dilli yapi
- Pazarlama sayfalari, kayit ve giris ekranlari
- Superadmin, manager ve restaurant owner rollerine gore yetkilendirme
- Restoran bazli QR kod uretimi ve SVG/PNG indirme
- Google yorum yonlendirme akisi
- Dusuk puanli yorumlar icin dahili feedback toplama
- Geri bildirim analitigi, filtreleme ve export endpointleri
- Prisma uzerinden PostgreSQL/Supabase veri modeli
- JWT tabanli cookie authentication
- SMTP ile bildirim gonderimi

## Teknoloji Yigini

- Next.js App Router
- React 19
- TypeScript
- Prisma
- PostgreSQL / Supabase
- Tailwind CSS
- Recharts
- `jose` ile JWT
- `qrcode` ile QR uretimi
- Nodemailer

## Uygulama Mimarisi

Proje tek bir Next.js uygulamasi icinde hem public yuzeyi hem de yonetim panelini barindirir.

### Public alan

- `src/app/[locale]`
- Landing page, hakkimizda, fiyatlandirma, iletisim, KVKK ve diger yasal sayfalar
- Musteri kayit ve giris akislari
- Kullanici dashboard sayfalari

### Admin alan

- `src/app/admin`
- Superadmin ve manager kullanimina yonelik ic panel
- Musteriler, restoranlar, kullanicilar ve QR kodlari yonetimi

### API katmani

- `src/app/api`
- Auth, admin, restaurant, feedback, profile ve contact endpointleri

### QR akisi

- `src/app/r/[slug]`
- Musterinin QR ile ulasacagi public geri bildirim sayfasi
- `rating >= 4` ise Google yorum yonlendirmesi
- `rating <= 3` ise dahili feedback formu ve e-posta bildirimi

## Roller

### `superadmin`

- Tum sistemi gorur
- Restoran ve admin kullanicilari yonetir

### `manager`

- Belirli bir restorana baglidir
- Verilere sadece kendi restoran kapsami icinde erisir

### `restaurant_owner`

- SaaS musterisi roludur
- Kendi restoranlarini ve geri bildirimlerini gorur

## Veri Modeli

Prisma semasi bes ana model uzerine kurulu:

- `User`: restoran sahibi veya SaaS musterisi
- `Restaurant`: isletme kaydi ve QR hedefi
- `Feedback`: puan, yorum, servis tipi ve detayli alt puanlar
- `AdminUser`: superadmin veya manager hesabi
- `Settings`: sistem genel ayarlari

Iliski yapisi ozetle soyledir:

- Bir `User`, birden fazla `Restaurant` sahibi olabilir
- Bir `Restaurant`, birden fazla `Feedback` kaydina sahip olabilir
- Bir `Restaurant`, bir veya daha fazla `AdminUser` ile yonetilebilir

## Dizin Yapisi

```text
src/
  app/
    [locale]/           public sayfalar, auth ve user dashboard
    admin/              yonetim paneli
    api/                route handler'lar
    r/[slug]/           public QR landing sayfasi
  components/
    admin/              panel bilesenleri
    auth/               login/register bilesenleri
    marketing/          landing page bilesenleri
  lib/
    auth.ts             JWT islemleri
    prisma.ts           Prisma client
    translations.ts     i18n sozlukleri
    email.ts            SMTP yardimcilari
prisma/
  schema.prisma
docs/
  RESTAURANT_GUIDE_TR.md
```

## Lokal Kurulum

### Gereksinimler

- Node.js 20+
- npm
- PostgreSQL veya Supabase veritabani

### Kurulum

```bash
npm install
```

`.env.example` dosyasini kopyalayip `.env` olarak duzenleyin:

```bash
cp .env.example .env
```

Gelistirme sunucusunu baslatin:

```bash
npm run dev
```

Uygulama varsayilan olarak `http://localhost:3000` uzerinden calisir.

## Gerekli Ortam Degiskenleri

Ornek degerler icin [`.env.example`](/Users/okanberkmanavoglu/Downloads/QRCode/.env.example) dosyasina bakin.

Temel degiskenler:

```env
DATABASE_URL=
DIRECT_URL=
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASS=
SMTP_FROM=
NOTIFICATION_EMAIL=
ADMIN_USERNAME=
ADMIN_PASSWORD=
JWT_SECRET=
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_RESTAURANT_NAME=
```

Notlar:

- `DATABASE_URL` pooler baglantisi icin kullanilir.
- `DIRECT_URL` migration ve dogrudan baglanti islemleri icin gereklidir.
- `JWT_SECRET` production ortaminda mutlaka set edilmelidir.
- `NEXT_PUBLIC_APP_URL`, uretilen QR hedef linkleri icin kullanilir.

## Veritabani ve Prisma

Bu proje Prisma kullanir ve `prisma/schema.prisma` dosyasinda PostgreSQL datasource tanimlidir.

`package.json` icindeki `postinstall` komutu su islemi yapar:

```bash
export DIRECT_URL=${DIRECT_URL:-$DATABASE_URL} && prisma generate && prisma db push --accept-data-loss
```

Bu davranis deploy sirasinda faydali olabilir; ancak `db push --accept-data-loss` kullandigi icin production ortamlarda kontrollu kullanilmalidir.

## Auth Davranisi

Auth yapisi NextAuth yerine custom JWT tabanlidir.

- Tokenlar `httpOnly` cookie olarak tutulur
- `src/lib/auth.ts` imzalama ve dogrulama islemlerini yonetir
- Admin giris endpointi ilk kurulum senaryosunda environment degiskenlerinden bootstrap yapabilir

Ilk calistirmada veritabaninda hic admin yoksa:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`

ile giris yapildiginda ilk admin hesabi otomatik olusturulabilir.

## Ana Akislar

### 1. QR kod olusturma

- Admin panelinden restoran secilir
- Istege bagli masa numarasi eklenir
- QR SVG veya PNG olarak uretilir
- Hedef URL `NEXT_PUBLIC_APP_URL/r/[slug]` seklindedir

### 2. Musteri geri bildirim akisi

- Musteri QR kodu okutur
- `src/app/r/[slug]/page.tsx` sayfasi acilir
- Yuksek puanda Google yorum yonlendirmesi yapilir
- Dusuk puanda dahili form acilir ve yorum veritabanina kaydedilir

### 3. Bildirim ve operasyon

- Dusuk puanli yorumlarda e-posta bildirimi gonderilir
- Geri bildirimler panelde filtrelenebilir
- Restoran ve kullanici bazli yetki sinirlari korunur

## Build ve Deploy

Production build icin:

```bash
npm run build
npm run start
```

Vercel hedeflenerek yazilmis bir yapi vardir, ancak herhangi bir Node.js ortamina deploy edilebilir.

Deploy oncesi kontrol edilmesi gerekenler:

- Tum env degiskenleri tanimli mi
- `JWT_SECRET` guvenli bir deger mi
- Veritabani erisimi dogru mu
- SMTP bilgileri calisiyor mu
- `NEXT_PUBLIC_APP_URL` dogru domaine isaret ediyor mu

## Dikkat Edilmesi Gereken Noktalar

- QR kod linkleri `NEXT_PUBLIC_APP_URL` degerine baglidir
- Veritabani senkronu `postinstall` icinde otomatik tetiklenir
- Yetkilendirme mantigi hem admin hem de restaurant owner senaryolarini kapsar
- Public ve admin tarafi ayni repo icinde oldugu icin route yapisi dikkatli korunmalidir

## Faydalı Dosyalar

- [README.md](/Users/okanberkmanavoglu/Downloads/QRCode/README.md)
- [package.json](/Users/okanberkmanavoglu/Downloads/QRCode/package.json)
- [prisma/schema.prisma](/Users/okanberkmanavoglu/Downloads/QRCode/prisma/schema.prisma)
- [src/lib/auth.ts](/Users/okanberkmanavoglu/Downloads/QRCode/src/lib/auth.ts)
- [src/app/api/feedback/route.ts](/Users/okanberkmanavoglu/Downloads/QRCode/src/app/api/feedback/route.ts)
- [src/app/api/restaurants/[id]/qr/route.ts](/Users/okanberkmanavoglu/Downloads/QRCode/src/app/api/restaurants/[id]/qr/route.ts)
- [src/app/r/[slug]/page.tsx](/Users/okanberkmanavoglu/Downloads/QRCode/src/app/r/[slug]/page.tsx)

## Kisa Ozet

Bu repo, restoran odakli bir QR geri bildirim SaaS urunudur. Public landing page, auth, dashboard, admin paneli, QR generator, feedback toplama, Google review yonlendirmesi ve operasyonel bildirim akislari ayni uygulama icinde toplanmistir.
