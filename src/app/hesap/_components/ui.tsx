// Shared look of the Buaze customer account pages (/hesap, CLAUDE.md §61):
// purple + white. Phones: white canvas, grey cards, white fields and buttons.
// From 640 px: grey canvas, white cards, grey fields and buttons. Borderless
// 24 px cards, pill buttons and fields, no shadows. Class strings only: these
// pages do not use the global bz-* classes, so their look does not move when
// the panel theme changes.
import { ChevronDown } from 'lucide-react';

export const INK = 'text-[#111110]';
/** Secondary text. #737373 drops under 4.5:1 on #F6F6F6, so a shade darker. */
export const MUTED = 'text-[#6B6B6B]';
/** Positive text: #23863A darkened a touch so small text keeps 4.5:1 on tints. */
export const SUCCESS_TEXT = 'text-[#1E7A35]';

export const CANVAS = 'bg-white sm:bg-[#F6F6F6]';
export const CARD = 'rounded-[24px] bg-[#F6F6F6] p-5 sm:bg-white sm:p-7';

const FOCUS =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#111110] focus-visible:ring-offset-2';

export const INPUT =
  'h-12 rounded-full border border-transparent bg-white px-4 text-[16px] text-[#111110] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#9A9A9A] focus:border-[#111110] focus:bg-white focus:shadow-[0_0_0_4px_rgba(17,17,16,0.14)] disabled:opacity-60 motion-reduce:transition-none sm:bg-[#F6F6F6] sm:focus:bg-white';

const BTN = `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-[background-color,transform,opacity] duration-200 active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 motion-reduce:transition-none motion-reduce:active:scale-100 ${FOCUS}`;

export const BTN_PRIMARY = `${BTN} h-12 px-6 text-[15px] bg-[#111110] text-white hover:bg-[#2B2B2A]`;
export const BTN_SECONDARY = `${BTN} h-12 px-5 text-[15px] bg-white text-[#111110] hover:bg-[#F1FDF3] sm:bg-[#F6F6F6] sm:hover:bg-[#F1FDF3]`;
/** Lavender pill: reads on both the white phone canvas and the grey desktop canvas. */
export const BTN_SOFT = `${BTN} h-11 px-5 text-[14px] bg-[#F1FDF3] text-[#111110] hover:bg-[#CDEFD6]`;
export const BTN_SMALL_PRIMARY = `${BTN} h-11 px-4 text-[13.5px] bg-[#111110] text-white hover:bg-[#2B2B2A]`;
export const BTN_SMALL_SECONDARY = `${BTN} h-11 px-4 text-[13.5px] bg-white text-[#111110] hover:bg-[#F1FDF3] sm:bg-[#F6F6F6] sm:hover:bg-[#F1FDF3]`;
export const BTN_DANGER = `${BTN} h-12 px-5 text-[15px] bg-[#D92D20] text-white hover:bg-[#B42318]`;
export const BTN_DANGER_SOFT = `${BTN} h-11 px-5 text-[14px] bg-[#FEF3F2] text-[#B42318] hover:bg-[#FEE4E2]`;

export const CHECKBOX = 'mt-0.5 h-5 w-5 shrink-0 cursor-pointer accent-[#111110]';
export const LINK = `rounded-sm font-semibold text-[#111110] underline decoration-[#CDEFD6] decoration-2 underline-offset-4 transition-colors hover:decoration-[#111110] ${FOCUS}`;

export const NOTICE_OK = `rounded-[20px] bg-[#EEF8F0] px-4 py-3 text-[14px] font-medium ${SUCCESS_TEXT}`;
export const NOTICE_WARN = 'rounded-[20px] bg-[#FFFAEB] px-4 py-3 text-[14px] text-[#92400E]';
export const NOTICE_ERROR = 'rounded-[16px] bg-[#FEF3F2] px-4 py-3 text-[14px] text-[#B42318]';

/** Native select in the pill field look, with its own chevron (iOS draws none once `appearance` is off). */
export function SelectBox({
  className = '',
  children,
  ...rest
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className={`relative block ${className}`}>
      <select {...rest} className={`${INPUT} w-full cursor-pointer appearance-none pr-10`}>
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden="true"
        className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-[#6B6B6B]"
      />
    </span>
  );
}
