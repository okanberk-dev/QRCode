import type { ReactElement, ReactNode } from 'react';

/**
 * Hukuki metin gövdesini React element ağacına çevirir. Tam markdown
 * değil — sadece şu primitive'leri tanır:
 *
 *   ## H2 başlığı           → <h2 id="slug">  (hover anchor link)
 *   ### H3 başlığı          → <h3 id="slug">  (hover anchor link)
 *   "- " bullet liste       → <ul><li>
 *   "1. " numbered liste    → <ol><li>
 *   `**bold**` inline       → <strong>
 *   `'inline-term'`         → <code>          (tek-tırnak içine alınmış teknik terim)
 *   Boş satır               → yeni paragraf
 *
 * XSS açısından güvenli: kullanıcı içeriği değil, admin yazar; React default
 * escape eder. Inline regex'ler eşleşmeyen kalıbı düz metin olarak bırakır.
 *
 * Anchor slug'ları stable: sadece içerik değişirse değişir. Aynı başlığın
 * sayfada birden fazla geçmesi olasılığı düşük; çakışma olursa "-2" suffix
 * eklenir. ID değeri client-side scroll target ve copy-link icon için.
 */

// Tek tırnak çevreli teknik terim ('user_token', 'admin_token' gibi).
// Boş tırnak ('') ve apostrof'u (don't, it's) yutmamak için içerik
// en az 1 karakter, sadece [\w-]+ kabul edilir; tipik teknik terimler.
const INLINE_PATTERN = /(\*\*[^*\n]+?\*\*|'[\w-]+')/g;

function renderInline(text: string, baseKey: string): ReactNode[] {
  const out: ReactNode[] = [];
  let lastIdx = 0;
  let m: RegExpExecArray | null;
  let i = 0;
  // reset lastIndex for stateful global regex
  INLINE_PATTERN.lastIndex = 0;
  while ((m = INLINE_PATTERN.exec(text)) !== null) {
    if (m.index > lastIdx) {
      out.push(text.slice(lastIdx, m.index));
    }
    const token = m[0];
    if (token.startsWith('**') && token.endsWith('**')) {
      out.push(
        <strong key={`${baseKey}-strong-${i++}`}>{token.slice(2, -2)}</strong>,
      );
    } else if (token.startsWith("'") && token.endsWith("'")) {
      out.push(<code key={`${baseKey}-code-${i++}`}>{token.slice(1, -1)}</code>);
    } else {
      out.push(token);
    }
    lastIdx = m.index + token.length;
  }
  if (lastIdx < text.length) {
    out.push(text.slice(lastIdx));
  }
  return out;
}

function slugify(input: string): string {
  return input
    .toLocaleLowerCase('tr-TR')
    .replace(/ş/g, 's')
    .replace(/ı/g, 'i')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

interface HeadingMeta {
  level: 2 | 3;
  text: string;
  id: string;
}

export interface RenderLegalResult {
  blocks: ReactElement[];
  headings: HeadingMeta[];
}

export function renderLegalContent(content: string): ReactElement[] {
  return renderLegalContentWithToc(content).blocks;
}

export function renderLegalContentWithToc(content: string): RenderLegalResult {
  const blocks: ReactElement[] = [];
  const headings: HeadingMeta[] = [];
  const usedIds = new Map<string, number>();
  const lines = content.split('\n');

  const ensureUniqueId = (raw: string): string => {
    const base = slugify(raw) || 'section';
    const count = usedIds.get(base) ?? 0;
    usedIds.set(base, count + 1);
    return count === 0 ? base : `${base}-${count + 1}`;
  };

  let i = 0;
  let key = 0;
  while (i < lines.length) {
    const line = lines[i];

    if (line.trim() === '') {
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      const text = line.slice(3).trim();
      const id = ensureUniqueId(text);
      headings.push({ level: 2, text, id });
      blocks.push(
        <h2
          key={`h2-${key++}`}
          id={id}
          className="bz-h-tight mt-10 mb-3 text-[20px] sm:text-[24px] tracking-[-0.02em] text-[#0A0A0A]"
        >
          {renderInline(text, `h2-${id}`)}
          <a
            href={`#${id}`}
            aria-label={`${text} bölümüne bağlantı`}
            className="legal-anchor"
          >
            #
          </a>
        </h2>,
      );
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      const text = line.slice(4).trim();
      const id = ensureUniqueId(text);
      headings.push({ level: 3, text, id });
      blocks.push(
        <h3
          key={`h3-${key++}`}
          id={id}
          className="bz-h-tight mt-7 mb-2 text-[16px] sm:text-[18px] tracking-[-0.02em] text-[#0A0A0A]"
        >
          {renderInline(text, `h3-${id}`)}
          <a
            href={`#${id}`}
            aria-label={`${text} alt-bölümüne bağlantı`}
            className="legal-anchor"
          >
            #
          </a>
        </h3>,
      );
      i++;
      continue;
    }

    // Bullet list (- ...)
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
            <li key={idx}>{renderInline(item, `ul-${key}-${idx}`)}</li>
          ))}
        </ul>,
      );
      continue;
    }

    // Numbered list (1. ... / 2. ...) — ardışık ve `\d+\. ` ile başlayan satırlar.
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, '').trim());
        i++;
      }
      blocks.push(
        <ol key={`ol-${key++}`}>
          {items.map((item, idx) => (
            <li key={idx}>{renderInline(item, `ol-${key}-${idx}`)}</li>
          ))}
        </ol>,
      );
      continue;
    }

    // Paragraph — boş olmayan ardışık satırları birleştir
    const paraLines: string[] = [line];
    i++;
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].startsWith('## ') &&
      !lines[i].startsWith('### ') &&
      !lines[i].startsWith('- ') &&
      !/^\d+\.\s+/.test(lines[i])
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    const para = paraLines.join(' ');
    blocks.push(
      <p
        key={`p-${key++}`}
        className="my-3 text-[14px] sm:text-[15px] leading-[1.7] text-[#525252]"
      >
        {renderInline(para, `p-${key}`)}
      </p>,
    );
  }

  return { blocks, headings };
}
