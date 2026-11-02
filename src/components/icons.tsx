import type { SVGProps } from "react";

/** Small line icons (24×24, currentColor). */
const base = (props: SVGProps<SVGSVGElement>) => ({
  width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8,
  strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true, ...props,
});

export const IconHome = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 10.5 12 3l9 7.5" /><path d="M5 9.5V21h14V9.5" /></svg>;
export const IconSearch = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>;
export const IconBell = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15z" /><path d="M10 20.5a2 2 0 0 0 4 0" /></svg>;
export const IconUser = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>;
export const IconSettings = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z" /></svg>;
export const IconBriefcase = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" /></svg>;
export const IconUsers = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="9" cy="8" r="3.5" /><path d="M2.5 20a6.5 6.5 0 0 1 13 0" /><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6.5 6.5 0 0 1 3.5 6" /></svg>;
export const IconInbox = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M4 13h4l1.5 3h5L16 13h4" /><path d="M5.5 5h13L21 13v6H3v-6z" /></svg>;
export const IconPhone = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="7" y="2.5" width="10" height="19" rx="2" /><path d="M11 18.5h2" /></svg>;
export const IconShieldCheck = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 2.5 19.5 6v5.5c0 4.6-3.2 8.3-7.5 10-4.3-1.7-7.5-5.4-7.5-10V6z" /><path d="m8.5 12 2.5 2.5 4.5-5" /></svg>;
export const IconIdCard = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="2.5" y="5" width="19" height="14" rx="2" /><circle cx="8.5" cy="11" r="2.2" /><path d="M5.5 16a3 3 0 0 1 6 0M14 10h4.5M14 13.5h3" /></svg>;
export const IconSend = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M21 3 10 14" /><path d="m21 3-7 18-4-7-7-4z" /></svg>;
export const IconLink = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M10 14a4 4 0 0 0 5.7 0l3-3a4 4 0 0 0-5.7-5.7l-1 1" /><path d="M14 10a4 4 0 0 0-5.7 0l-3 3a4 4 0 0 0 5.7 5.7l1-1" /></svg>;
export const IconDocHeart = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M14 2.5H6a1.5 1.5 0 0 0-1.5 1.5v16A1.5 1.5 0 0 0 6 21.5h12a1.5 1.5 0 0 0 1.5-1.5V8z" /><path d="M14 2.5V8h5.5" /><path d="M12 17.5s-3-1.8-3-3.8a1.6 1.6 0 0 1 3-.8 1.6 1.6 0 0 1 3 .8c0 2-3 3.8-3 3.8z" /></svg>;
export const IconSparkle = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18" /></svg>;
export const IconMegaphone = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M3 10.5v3a1 1 0 0 0 1 1h2.5L13 19V5L6.5 9.5H4a1 1 0 0 0-1 1z" /><path d="M16.5 9a3.5 3.5 0 0 1 0 6M19.5 6.5a7 7 0 0 1 0 11" /></svg>;
export const IconCheckList = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m3.5 7 2 2 3.5-4M3.5 15.5l2 2 3.5-4" /><path d="M12.5 7.5h8M12.5 16h8" /></svg>;
export const IconStar = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>;
export const IconPen = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m12 19 7-7 3 3-7 7z" /><path d="m18 13-1.5-7.5L2 2l3.5 14.5L13 18z" /><path d="m2 2 7.6 7.6" /><circle cx="11" cy="11" r="2" /></svg>;
export const IconCode = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m16 18 6-6-6-6M8 6l-6 6 6 6" /></svg>;
export const IconMusic = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></svg>;
export const IconCalculator = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18.5h8" /></svg>;
export const IconScale = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M12 3v18M7 21h10M4 7h16" /><path d="m7 7-3 7a3 3 0 0 0 6 0zM17 7l-3 7a3 3 0 0 0 6 0z" /></svg>;
export const IconGrid = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></svg>;
export const IconChat = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="M21 12.5a8.5 8.5 0 0 1-12.6 7.4L3 21l1.2-5A8.5 8.5 0 1 1 21 12.5z" /></svg>;
export const IconInfo = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
export const IconCheckCircle = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="m8 12 3 3 5-6" /></svg>;
export const IconXCircle = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><circle cx="12" cy="12" r="10" /><path d="m9 9 6 6M15 9l-6 6" /></svg>;
export const IconChevronDown = (p: SVGProps<SVGSVGElement>) => <svg {...base(p)}><path d="m6 9 6 6 6-6" /></svg>;
