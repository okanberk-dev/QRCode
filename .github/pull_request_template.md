## Summary

<!-- 1-3 madde: ne değişti, neden? -->

## Type

- [ ] Feature (yeni özellik)
- [ ] Fix (bug düzeltmesi)
- [ ] Refactor (davranış değişmiyor)
- [ ] Docs (sadece dökümantasyon)
- [ ] CI / build / config

## Test plan

<!-- Reviewer'ın sırayla doğrulayacağı checkbox'lar -->

- [ ] `npx tsc --noEmit -p tsconfig.json` zero error
- [ ] `npx prisma validate` başarılı
- [ ] Lokal manuel test: <!-- adımları yaz -->
- [ ] Mobile (375px) + desktop (1440px) viewport kontrolü (UI değişikliği varsa)
- [ ] Mail değişikliği varsa: `/admin/dev/mail-preview` üzerinden 9 template + iPhone Mail/Gmail Web smoke test (CLAUDE.md §21.15)

## Backend etkisi

<!-- DB schema değişti mi? Cron eklendi mi? Yeni env? -->

- Schema: <!-- yok / yeni kolon / yeni tablo -->
- Cron: <!-- yok / yeni path + schedule -->
- Env: <!-- yok / yeni env (.env.example güncellendi mi?) -->
- Public sender / API imzası: <!-- korundu / değişti (breaking) -->

## Risks & mitigations

<!-- Hata durumunda blast radius, fallback davranışı -->

## Open questions

<!-- Cevap bekleyen kararlar -->

## Merge stratejisi

<!-- Stacked PR pattern (CLAUDE.md §21.22) — eğer base main değilse belirt -->

- [ ] Base = `main` (standalone)
- [ ] Base = başka feature branch'i (stacked) — branch adı: `<branch>`
  <!-- Kullanıcı bu PR'ı main'e merge ettiğinde tüm zincir gelir -->

