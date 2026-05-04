// Minimal stroke icons — single source so swapping color is uniform
const IconBase = ({ size = 16, children, fill = false, stroke = 'currentColor', strokeWidth = 1.6 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'}
    stroke={stroke} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink: 0 }}>
    {children}
  </svg>
);

const IBarChart = (p) => <IconBase {...p}><path d="M3 20h18M7 16V10M12 16V6M17 16v-4"/></IconBase>;
const IInbox = (p) => <IconBase {...p}><path d="M22 12h-6l-2 3h-4l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11Z"/></IconBase>;
const IGoogle = (p) => <IconBase {...p}><path d="M21 12.3c0-.7-.07-1.4-.18-2H12v3.8h5.04a4.3 4.3 0 0 1-1.87 2.84v2.36h3.03A9.16 9.16 0 0 0 21 12.3Z"/><path d="M12 21c2.52 0 4.63-.83 6.2-2.27l-3.03-2.36c-.84.56-1.92.9-3.17.9a5.5 5.5 0 0 1-5.16-3.8H3.7v2.4A9.18 9.18 0 0 0 12 21Z"/><path d="M6.84 13.47A5.5 5.5 0 0 1 6.84 10.53V8.13H3.7a9.16 9.16 0 0 0 0 7.74l3.14-2.4Z"/><path d="M12 6.66c1.37 0 2.6.47 3.57 1.4l2.68-2.68A9.13 9.13 0 0 0 12 3a9.18 9.18 0 0 0-8.3 5.13L6.84 10.53A5.5 5.5 0 0 1 12 6.66Z"/></IconBase>;
const ILink = (p) => <IconBase {...p}><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></IconBase>;
const ITrendUp = (p) => <IconBase {...p}><path d="m23 6-9.5 9.5-5-5L1 18"/><path d="M17 6h6v6"/></IconBase>;
const IUsers = (p) => <IconBase {...p}><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></IconBase>;
const IUser = (p) => <IconBase {...p}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></IconBase>;
const ISettings = (p) => <IconBase {...p}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z"/></IconBase>;
const IChevronDown = (p) => <IconBase {...p}><path d="m6 9 6 6 6-6"/></IconBase>;
const IChevronRight = (p) => <IconBase {...p}><path d="m9 18 6-6-6-6"/></IconBase>;
const IPlus = (p) => <IconBase {...p}><path d="M12 5v14M5 12h14"/></IconBase>;
const ISearch = (p) => <IconBase {...p}><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></IconBase>;
const IFilter = (p) => <IconBase {...p}><path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/></IconBase>;
const IDownload = (p) => <IconBase {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/></IconBase>;
const IStar = ({ size = 12, filled = false }) => (
  <svg width={size} height={size} viewBox="0 0 24 24"
    fill={filled ? 'currentColor' : 'none'}
    stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round">
    <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
  </svg>
);
const IReply = (p) => <IconBase {...p}><path d="M9 17l-5-5 5-5M4 12h11a5 5 0 0 1 5 5v3"/></IconBase>;
const IMoreH = (p) => <IconBase {...p}><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/></IconBase>;
const ICheck = (p) => <IconBase {...p}><path d="M20 6 9 17l-5-5"/></IconBase>;
const IX = (p) => <IconBase {...p}><path d="M18 6 6 18M6 6l12 12"/></IconBase>;
const IExternal = (p) => <IconBase {...p}><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3"/></IconBase>;
const IMail = (p) => <IconBase {...p}><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></IconBase>;
const IPhone = (p) => <IconBase {...p}><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></IconBase>;
const IMapPin = (p) => <IconBase {...p}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></IconBase>;
const ICalendar = (p) => <IconBase {...p}><rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/></IconBase>;
const ICreditCard = (p) => <IconBase {...p}><rect x="2" y="5" width="20" height="14" rx="2"/><path d="M2 10h20"/></IconBase>;
const ITrash = (p) => <IconBase {...p}><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></IconBase>;
const IBell = (p) => <IconBase {...p}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0"/></IconBase>;
const IShield = (p) => <IconBase {...p}><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></IconBase>;
const IKey = (p) => <IconBase {...p}><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/></IconBase>;
const IBuilding = (p) => <IconBase {...p}><rect x="4" y="2" width="16" height="20" rx="2"/><path d="M9 22v-4h6v4M8 6h.01M16 6h.01M12 6h.01M12 10h.01M12 14h.01M16 10h.01M16 14h.01M8 10h.01M8 14h.01"/></IconBase>;
const IRefresh = (p) => <IconBase {...p}><path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5"/></IconBase>;
const IZap = (p) => <IconBase {...p}><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></IconBase>;
const IQrCode = (p) => <IconBase {...p}><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><path d="M14 14h3v3h-3zM20 14v7M14 20h3M20 17h-1"/></IconBase>;
const ITrendDown = (p) => <IconBase {...p}><path d="m23 18-9.5-9.5-5 5L1 6"/><path d="M17 18h6v-6"/></IconBase>;
const ICircle = (p) => <IconBase {...p}><circle cx="12" cy="12" r="10"/></IconBase>;
const IUpload = (p) => <IconBase {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></IconBase>;

Object.assign(window, {
  IBarChart, IInbox, IGoogle, ILink, ITrendUp, IUsers, IUser, ISettings,
  IChevronDown, IChevronRight, IPlus, ISearch, IFilter, IDownload, IStar,
  IReply, IMoreH, ICheck, IX, IExternal, IMail, IPhone, IMapPin, ICalendar,
  ICreditCard, ITrash, IBell, IShield, IKey, IBuilding, IRefresh, IZap,
  IQrCode, ITrendDown, ICircle, IUpload
});
