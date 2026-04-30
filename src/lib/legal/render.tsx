import type { ReactElement } from 'react';

/**
 * Hukuki metin gövdesini React element ağacına çevirir. Tam markdown
 * değil — sadece şu primitive'leri tanır:
 *
 *   ## H2 başlığı
 *   ### H3 başlığı
 *   "- " başlayan satırlar → <ul><li>
 *   Boş satır = yeni paragraf
 *   `**bold**` ve `*italic*` desteklenmez (admin metni temiz tutsun)
 *
 * XSS açısından güvenli: kullanıcı içeriği değil, admin yazar; React
 * default escape eder. <a> / <img> kabul etmiyoruz — admin URL eklemek
 * isterse düz metin olarak yazıyor (CLAUDE.md §32).
 */
export function renderLegalContent(content: string): ReactElement[] {
  const blocks: ReactElement[] = [];
  const lines = content.split('\n');

  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];

    // boş satır — atla
    if (line.trim() === '') {
      i++;
      continue;
    }

    // h2
    if (line.startsWith('## ')) {
      blocks.push(
        <h2
          key={`h2-${key++}`}
          className="bz-h-tight mt-10 mb-3 text-[18px] sm:text-[22px] tracking-[-0.02em] text-[#0A0A0A]"
        >
          {line.slice(3).trim()}
        </h2>,
      );
      i++;
      continue;
    }

    // h3
    if (line.startsWith('### ')) {
      blocks.push(
        <h3
          key={`h3-${key++}`}
          className="bz-h-tight mt-6 mb-2 text-[15px] sm:text-[17px] tracking-[-0.02em] text-[#0A0A0A]"
        >
          {line.slice(4).trim()}
        </h3>,
      );
      i++;
      continue;
    }

    // bullet list — start of list
    if (line.startsWith('- ')) {
      const items: string[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push(lines[i].slice(2).trim());
        i++;
      }
      blocks.push(
        <ul
          key={`ul-${key++}`}
          className="my-3 list-disc space-y-1.5 pl-6 text-[14px] sm:text-[15px] leading-[1.7] text-[#525252]"
        >
          {items.map((item, idx) => (
            <li key={idx}>{item}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // paragraph — accumulate consecutive non-empty, non-prefixed lines
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('## ') &&
      !lines[i].startsWith('### ') &&
      !lines[i].startsWith('- ')
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    blocks.push(
      <p
        key={`p-${key++}`}
        className="my-3 text-[14px] sm:text-[15px] leading-[1.7] text-[#525252]"
      >
        {paraLines.join(' ')}
      </p>,
    );
  }

  return blocks;
}
