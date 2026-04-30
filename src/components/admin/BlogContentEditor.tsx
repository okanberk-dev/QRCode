'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditor, EditorContent, Node, mergeAttributes } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import {
  Bold,
  Code,
  FileImage,
  Heading2,
  Heading3,
  Image as ImageIcon,
  Info,
  Italic,
  Link2,
  List,
  ListOrdered,
  Lightbulb,
  Loader2,
  Minus,
  Pilcrow,
  Quote,
  Redo2,
  Strikethrough,
  Terminal,
  AlertTriangle,
  Undo2,
  X,
} from 'lucide-react';

/**
 * Custom Callout node — renders <aside data-variant="info|warn|tip">.
 * The sanitizer accepts only this exact tag/attribute pair, so the editor
 * output round-trips through `sanitizeBlogContent` without surprises.
 */
const Callout = Node.create({
  name: 'callout',
  group: 'block',
  content: 'block+',
  defining: true,

  addAttributes() {
    return {
      variant: {
        default: 'info',
        parseHTML: (el) => (el as HTMLElement).getAttribute('data-variant') || 'info',
        renderHTML: (attrs) => ({ 'data-variant': attrs.variant }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'aside[data-variant]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['aside', mergeAttributes(HTMLAttributes), 0];
  },
});

interface Props {
  value: string;
  onChange: (html: string) => void;
}

export default function BlogContentEditor({ value, onChange }: Props) {
  const [imageDialog, setImageDialog] = useState(false);
  const [linkDialog, setLinkDialog] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [imageCaption, setImageCaption] = useState('');
  const [linkUrl, setLinkUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        // Disable codeBlock from starter kit so we control it explicitly.
        codeBlock: { HTMLAttributes: { class: 'pulse-codeblock' } },
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        HTMLAttributes: {
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
      Image.configure({
        inline: false,
        allowBase64: true,
      }),
      Callout,
    ],
    content: value || '<p></p>',
    editorProps: {
      attributes: {
        class: [
          'min-h-[620px] bg-white px-5 py-6 text-[17px] leading-8 text-[#0A0A0A] outline-none sm:px-8',
          '[&_h2]:mt-9 [&_h2]:mb-3 [&_h2]:text-[28px] [&_h2]:font-medium [&_h2]:tracking-[-0.02em]',
          '[&_h3]:mt-7 [&_h3]:mb-2 [&_h3]:text-[22px] [&_h3]:font-medium [&_h3]:tracking-[-0.01em]',
          '[&_p]:mb-5 [&_p]:text-[#525252]',
          '[&_a]:font-medium [&_a]:text-[#0A0A0A] [&_a]:underline [&_a]:decoration-[#C6F24E] [&_a]:decoration-2 [&_a]:underline-offset-4',
          '[&_ul]:mb-5 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-5 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_li]:text-[#525252]',
          '[&_blockquote]:my-7 [&_blockquote]:rounded-[18px] [&_blockquote]:border-l-4 [&_blockquote]:border-[#C6F24E] [&_blockquote]:bg-[#EAF9B8]/70 [&_blockquote]:px-5 [&_blockquote]:py-4 [&_blockquote]:font-medium [&_blockquote]:text-[#0A0A0A]',
          '[&_code]:rounded [&_code]:bg-[#F5F5F5] [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[14px] [&_code]:font-mono [&_code]:text-[#0A0A0A]',
          '[&_pre]:my-7 [&_pre]:rounded-2xl [&_pre]:bg-[#0A0A0A] [&_pre]:px-5 [&_pre]:py-4 [&_pre]:overflow-x-auto',
          '[&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_pre_code]:text-[14px] [&_pre_code]:text-[#EDEDED]',
          '[&_figure]:my-8 [&_figure]:flex [&_figure]:flex-col [&_figure]:gap-2',
          '[&_figure_img]:m-0 [&_figure_img]:w-full [&_figure_img]:rounded-2xl',
          '[&_figcaption]:text-[13px] [&_figcaption]:text-[#737373] [&_figcaption]:text-center',
          '[&_img]:rounded-2xl [&_img]:my-5',
          '[&_aside]:my-6 [&_aside]:rounded-2xl [&_aside]:border [&_aside]:px-5 [&_aside]:py-4 [&_aside]:text-[15px]',
          '[&_aside_p]:m-0 [&_aside_p]:text-[#0A0A0A]',
          '[&_aside[data-variant=info]]:bg-[#F0F9FF] [&_aside[data-variant=info]]:border-[#BFDBFE]',
          '[&_aside[data-variant=warn]]:bg-[#FFFBEB] [&_aside[data-variant=warn]]:border-[#FDE68A]',
          '[&_aside[data-variant=tip]]:bg-[#EAF9B8] [&_aside[data-variant=tip]]:border-[#C6F24E]',
        ].join(' '),
        'aria-label': 'Blog içeriği',
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
    },
    immediatelyRender: false,
  });

  // Sync external content updates (e.g. starter template insertion from parent).
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value && value !== current) {
      editor.commands.setContent(value, { emitUpdate: false });
    }
  }, [value, editor]);

  const insertImage = useCallback(
    (url: string, caption: string) => {
      if (!editor || !url) return;
      const trimmed = caption.trim();
      if (trimmed) {
        const safeCaption = trimmed
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        editor
          .chain()
          .focus()
          .insertContent(
            `<figure><img src="${url}" alt="${safeCaption}" /><figcaption>${safeCaption}</figcaption></figure>`,
          )
          .run();
      } else {
        editor.chain().focus().setImage({ src: url, alt: '' }).run();
      }
      setImageUrl('');
      setImageCaption('');
      setImageDialog(false);
      setUploadError(null);
    },
    [editor],
  );

  const handleFileUpload = async (file: File) => {
    setUploadError(null);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/admin/blog/upload-image', {
        method: 'POST',
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Görsel yüklenemedi');
      }
      const { url } = (await res.json()) as { url: string };
      insertImage(url, imageCaption);
    } catch (err) {
      setUploadError((err as Error).message);
    } finally {
      setUploading(false);
    }
  };

  const onPickFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    handleFileUpload(file);
    e.target.value = '';
  };

  const insertCallout = (variant: 'info' | 'warn' | 'tip') => {
    if (!editor) return;
    editor
      .chain()
      .focus()
      .insertContent({
        type: 'callout',
        attrs: { variant },
        content: [{ type: 'paragraph', content: [{ type: 'text', text: '' }] }],
      })
      .run();
  };

  const setLink = () => {
    if (!editor) return;
    const trimmed = linkUrl.trim();
    if (!trimmed) {
      editor.chain().focus().unsetLink().run();
    } else {
      editor.chain().focus().extendMarkRange('link').setLink({ href: trimmed }).run();
    }
    setLinkUrl('');
    setLinkDialog(false);
  };

  if (!editor) {
    return (
      <div className="min-h-[620px] bg-white px-5 py-6 text-[14px] text-[#737373]">
        Editör yükleniyor…
      </div>
    );
  }

  const ToolbarButton = ({
    onClick,
    active,
    label,
    icon: Icon,
  }: {
    onClick: () => void;
    active?: boolean;
    label: string;
    icon: typeof Bold;
  }) => (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-pressed={active}
      className={`inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition-colors ${
        active
          ? 'bg-[#0A0A0A] text-white'
          : 'text-[#525252] hover:bg-[#EAF9B8] hover:text-[#0A0A0A]'
      }`}
    >
      <Icon size={15} />
      <span className="hidden sm:inline">{label}</span>
    </button>
  );

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-[#EDEDED] bg-white p-2">
        <ToolbarButton
          icon={Pilcrow}
          label="Paragraf"
          active={editor.isActive('paragraph')}
          onClick={() => editor.chain().focus().setParagraph().run()}
        />
        <ToolbarButton
          icon={Heading2}
          label="H2"
          active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        />
        <ToolbarButton
          icon={Heading3}
          label="H3"
          active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        />
        <span className="mx-1 h-6 w-px bg-[#EDEDED]" aria-hidden />
        <ToolbarButton
          icon={Bold}
          label="Kalın"
          active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
        />
        <ToolbarButton
          icon={Italic}
          label="İtalik"
          active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        />
        <ToolbarButton
          icon={Strikethrough}
          label="Üstü çizili"
          active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
        />
        <ToolbarButton
          icon={Code}
          label="Inline kod"
          active={editor.isActive('code')}
          onClick={() => editor.chain().focus().toggleCode().run()}
        />
        <span className="mx-1 h-6 w-px bg-[#EDEDED]" aria-hidden />
        <ToolbarButton
          icon={List}
          label="Liste"
          active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        />
        <ToolbarButton
          icon={ListOrdered}
          label="Numara"
          active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        />
        <ToolbarButton
          icon={Quote}
          label="Alıntı"
          active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
        />
        <ToolbarButton
          icon={Terminal}
          label="Kod bloğu"
          active={editor.isActive('codeBlock')}
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        />
        <span className="mx-1 h-6 w-px bg-[#EDEDED]" aria-hidden />
        <ToolbarButton
          icon={Link2}
          label="Bağlantı"
          active={editor.isActive('link')}
          onClick={() => {
            setLinkUrl((editor.getAttributes('link').href as string) || '');
            setLinkDialog(true);
          }}
        />
        <ToolbarButton
          icon={ImageIcon}
          label="Görsel"
          onClick={() => setImageDialog(true)}
        />
        <ToolbarButton icon={Minus} label="Ayraç" onClick={() => editor.chain().focus().setHorizontalRule().run()} />
        <span className="mx-1 h-6 w-px bg-[#EDEDED]" aria-hidden />
        <ToolbarButton icon={Info} label="Bilgi kutusu" onClick={() => insertCallout('info')} />
        <ToolbarButton icon={AlertTriangle} label="Uyarı kutusu" onClick={() => insertCallout('warn')} />
        <ToolbarButton icon={Lightbulb} label="İpucu kutusu" onClick={() => insertCallout('tip')} />
        <span className="mx-1 h-6 w-px bg-[#EDEDED]" aria-hidden />
        <ToolbarButton
          icon={Undo2}
          label="Geri al"
          onClick={() => editor.chain().focus().undo().run()}
        />
        <ToolbarButton
          icon={Redo2}
          label="İleri al"
          onClick={() => editor.chain().focus().redo().run()}
        />
      </div>

      <EditorContent
        editor={editor}
        className="pulse-blog-editor mt-3 rounded-2xl border border-[#EDEDED] bg-white"
      />

      {linkDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[440px] rounded-[20px] border border-[#EDEDED] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Bağlantı ekle</h3>
              <button
                type="button"
                onClick={() => {
                  setLinkDialog(false);
                  setLinkUrl('');
                }}
                className="rounded-full p-1 text-[#737373] hover:bg-[#EDEDED]"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </div>
            <p className="mt-1 text-[12px] text-[#737373]">
              https:// , mailto: veya / ile başlayan adresler kabul edilir.
            </p>
            <input
              type="url"
              value={linkUrl}
              onChange={(e) => setLinkUrl(e.target.value)}
              placeholder="https://buaze.com/help"
              className="mt-4 w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#0A0A0A]"
              autoFocus
            />
            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setLinkUrl('');
                  setLinkDialog(false);
                  editor.chain().focus().unsetLink().run();
                }}
                className="rounded-xl border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-semibold text-[#525252] hover:bg-[#FAFAFA]"
              >
                Kaldır
              </button>
              <button
                type="button"
                onClick={setLink}
                className="rounded-xl bg-[#0A0A0A] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1A1A1A]"
              >
                Ekle
              </button>
            </div>
          </div>
        </div>
      )}

      {imageDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="w-full max-w-[480px] rounded-[20px] border border-[#EDEDED] bg-white p-6 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-[16px] font-semibold text-[#0A0A0A]">Görsel ekle</h3>
              <button
                type="button"
                onClick={() => {
                  setImageDialog(false);
                  setImageUrl('');
                  setImageCaption('');
                  setUploadError(null);
                }}
                className="rounded-full p-1 text-[#737373] hover:bg-[#EDEDED]"
                aria-label="Kapat"
              >
                <X size={16} />
              </button>
            </div>

            <label className="mt-4 block text-[12px] font-semibold text-[#525252]">
              Açıklama (opsiyonel — görseli betimler, alt text + caption olur)
            </label>
            <input
              type="text"
              value={imageCaption}
              onChange={(e) => setImageCaption(e.target.value)}
              placeholder="Buaze panel ekranı"
              maxLength={140}
              className="mt-1.5 w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#0A0A0A]"
            />

            <div className="mt-5">
              <label className="block text-[12px] font-semibold text-[#525252]">
                Dosyadan yükle
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={onPickFile}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="mt-1.5 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-[#0A0A0A] bg-white px-4 py-3 text-[13px] font-semibold text-[#0A0A0A] transition-colors hover:bg-[#EAF9B8] disabled:opacity-60"
              >
                {uploading ? (
                  <>
                    <Loader2 size={15} className="animate-spin" />
                    Yükleniyor…
                  </>
                ) : (
                  <>
                    <FileImage size={15} />
                    Dosya seç (max 5 MB, otomatik WebP)
                  </>
                )}
              </button>
            </div>

            <div className="mt-5">
              <label className="block text-[12px] font-semibold text-[#525252]">
                veya URL ile ekle
              </label>
              <input
                type="url"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                placeholder="https://example.com/img.jpg"
                className="mt-1.5 w-full rounded-xl border border-[#EDEDED] bg-white px-4 py-2.5 text-[14px] outline-none focus:border-[#0A0A0A]"
              />
            </div>

            {uploadError && (
              <p className="mt-3 rounded-xl bg-[#FEF2F2] px-3 py-2 text-[12px] text-[#991B1B]">
                {uploadError}
              </p>
            )}

            <div className="mt-5 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => {
                  setImageDialog(false);
                  setImageUrl('');
                  setImageCaption('');
                  setUploadError(null);
                }}
                className="rounded-xl border border-[#EDEDED] bg-white px-4 py-2 text-[13px] font-semibold text-[#525252] hover:bg-[#FAFAFA]"
              >
                İptal
              </button>
              <button
                type="button"
                onClick={() => insertImage(imageUrl, imageCaption)}
                disabled={!imageUrl || uploading}
                className="rounded-xl bg-[#0A0A0A] px-4 py-2 text-[13px] font-semibold text-white hover:bg-[#1A1A1A] disabled:opacity-50"
              >
                URL ekle
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
