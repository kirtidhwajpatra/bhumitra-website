// Bhumitra icon set: 24px grid, 1.8px rounded stroke, drawn to match the app's SF Symbols.
import type { SVGProps } from "react";

const PATHS = {
  search: <><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>,
  locate: <path d="M20.5 3.5 3.8 10.1a.6.6 0 0 0 .05 1.13l6.9 2.03 2.03 6.9a.6.6 0 0 0 1.13.05L20.5 3.5Z" fill="currentColor" stroke="none" />,
  layers: <><path d="m12 3 9 5-9 5-9-5 9-5Z" /><path d="m3 13 9 5 9-5" /></>,
  eye: <><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="2.8" /></>,
  sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4" /></>,
  moon: <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />,
  panelClose: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9 4.5v15M15.5 10l-2 2 2 2" /></>,
  panelOpen: <><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><path d="M9 4.5v15M13.5 10l2 2-2 2" /></>,
  eyeOff: <><path d="M3 3l18 18" /><path d="M10.6 5.6A9.9 9.9 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-2.8 3.6M6.3 6.8C3.9 8.4 2.5 12 2.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1" /></>,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 11v5.5M12 7.6v.1" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  minus: <path d="M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  back: <path d="M15 5l-7 7 7 7" />,
  chevron: <path d="m9 5 7 7-7 7" />,
  bookmark: <path d="M6.5 3.5h11v17L12 16.5l-5.5 4v-17Z" />,
  bookmarkFill: <path d="M6.5 3.5h11v17L12 16.5l-5.5 4v-17Z" fill="currentColor" />,
  share: <><path d="M12 15V3.5M7.5 8 12 3.5 16.5 8" /><path d="M5 12.5v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6" /></>,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.4" /></>,
  plot: <><path d="M4 7.5 10 4l10 3.5-1.5 11L9 20.5 3.5 17 4 7.5Z" /><path d="M10 4l-1 16.5M4 7.5l14.5 4" /></>,
  khata: <><path d="M6 3.5h9l3.5 3.5v13.5H6v-17Z" /><path d="M14.5 3.5V7h4M9 12h6M9 15.5h6M9 8.5h3" /></>,
  owner: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" /></>,
  kisam: <><path d="M12 20.5V10" /><path d="M12 13c-3.8 0-6-2.4-6-6.5 3.8 0 6 2.4 6 6.5ZM12 15c3.8 0 6-2.4 6-6.5-3.8 0-6 2.4-6 6.5Z" /></>,
  area: <><rect x="4" y="4" width="16" height="16" rx="2" /><path d="M4 9h3M4 14h3M9 4v3M14 4v3" /></>,
  lock: <><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5" /></>,
  shield: <><path d="M12 21s7.5-3.5 7.5-9.5V5.8L12 3 4.5 5.8v5.7C4.5 17.5 12 21 12 21Z" /><path d="m9 12 2.2 2.2L15.5 10" /></>,
  apple: <path fill="currentColor" stroke="none" d="M16.37 1.43c0 1.14-.5 2.27-1.18 3.08-.74.9-1.99 1.57-2.99 1.57-.12 0-.23-.02-.3-.03-.01-.06-.04-.22-.04-.39 0-1.15.57-2.27 1.2-2.98.81-.94 2.15-1.64 3.25-1.68.03.13.06.28.06.43zm4.56 15.71c-.03.07-.46 1.58-1.52 3.12-.94 1.34-1.94 2.71-3.43 2.71-1.52 0-1.9-.88-3.63-.88-1.7 0-2.3.91-3.67.91-1.38 0-2.33-1.26-3.43-2.8C3.96 18.38 2.93 15.57 2.93 12.92c0-4.28 2.8-6.55 5.55-6.55 1.45 0 2.67.95 3.6.95.86 0 2.22-1.01 3.9-1.01.61 0 2.88.06 4.37 2.19-.13.09-2.38 1.37-2.38 4.19 0 3.26 2.85 4.42 2.95 4.45z" />,
  play: <path fill="currentColor" stroke="none" d="M4.2 2.7c-.5-.28-1.2.08-1.2.65v17.3c0 .57.7.93 1.2.65l16-8.65c.53-.28.53-1.03 0-1.32l-16-8.65z" />,
  list: <path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" />,
  history: <><path d="M3.5 12a8.5 8.5 0 1 0 2.5-6" /><path d="M3.5 4.5V9H8M12 8v4.5l3 2" /></>,
  // Record section glyphs, matching the SF Symbols the iOS land report uses.
  /** mappin.and.ellipse */
  pinEllipse: <><path d="M12 15.5s-4.8-4.2-4.8-8.1a4.8 4.8 0 0 1 9.6 0c0 3.9-4.8 8.1-4.8 8.1Z" fill="currentColor" /><circle cx="12" cy="7.4" r="1.7" fill="var(--icon-cut, #fff)" stroke="none" /><path d="M8 17.6c-2.4.4-4 1.1-4 1.9 0 1.2 3.6 2 8 2s8-.8 8-2c0-.8-1.6-1.5-4-1.9" /></>,
  /** person.2.fill */
  people: <><circle cx="9" cy="8" r="3.4" fill="currentColor" /><path d="M2.8 19.5c.5-3.7 3-5.8 6.2-5.8s5.7 2.1 6.2 5.8Z" fill="currentColor" /><circle cx="16.6" cy="8.6" r="2.7" fill="currentColor" stroke="none" /><path d="M16.4 13.8c2.6.1 4.4 2 4.8 5.2h-4.1" fill="currentColor" stroke="none" /></>,
  /** square.on.square.dashed */
  squaresDashed: <><path d="M8 16H5.5a2 2 0 0 1-2-2V5.5a2 2 0 0 1 2-2H14a2 2 0 0 1 2 2V8" strokeDasharray="2.6 2.4" /><rect x="8" y="8" width="12.5" height="12.5" rx="2.2" /></>,
  /** indianrupeesign.circle.fill */
  rupee: <><circle cx="12" cy="12" r="9.5" fill="currentColor" /><path d="M8.6 7.6h6.8M8.6 10.6h6.8M10.6 7.6c3.4 0 3.4 6-1.4 6l4.6 3.8" stroke="var(--icon-cut, #fff)" strokeWidth={1.7} /></>,
  /** text.quote */
  quote: <><path d="M4 5.5v13" strokeWidth={2.4} /><path d="M8.5 7h11.5M8.5 12h11.5M8.5 17h7" /></>,
  /** checkmark.seal.fill */
  seal: <><path d="M12 2 14.12 4.08 17 3.34 17.8 6.2 20.66 7 19.92 9.88 22 12 19.92 14.12 20.66 17 17.8 17.8 17 20.66 14.12 19.92 12 22 9.88 19.92 7 20.66 6.2 17.8 3.34 17 4.08 14.12 2 12 4.08 9.88 3.34 7 6.2 6.2 7 3.34 9.88 4.08Z" fill="currentColor" stroke="none" /><path d="m8.4 12.2 2.4 2.4 4.8-5" stroke="var(--icon-cut, #fff)" strokeWidth={2} /></>,
  /** building.columns */
  building: <><path d="M3.5 9 12 4l8.5 5H3.5ZM4 20h16M5.5 17.5h13M6.5 10v7.5M10 10v7.5M14 10v7.5M17.5 10v7.5" /></>,
  chevronDown: <path d="m6.5 9.5 5.5 5.5 5.5-5.5" />,
  arrowUpRight: <path d="M7.5 16.5 16.5 7.5M9 7.5h7.5V15" />,
  doc: <><path d="M6 3.5h8.5l3.5 3.5v13.5H6v-17Z" /><path d="M14 3.5V7h4M9 11.5h6M9 15h6" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}
