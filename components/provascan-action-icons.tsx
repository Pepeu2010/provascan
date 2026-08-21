import type { SVGProps } from "react";

type ActionIconProps = SVGProps<SVGSVGElement>;

export function ScanCaptureIcon({ className, ...props }: ActionIconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" className={className} aria-hidden="true" {...props}>
      <path d="M11 5H8a3 3 0 0 0-3 3v3M21 5h3a3 3 0 0 1 3 3v3M27 21v3a3 3 0 0 1-3 3h-3M11 27H8a3 3 0 0 1-3-3v-3" />
      <path d="M10 12.5h3l1.25-2h3.5l1.25 2h3a2 2 0 0 1 2 2V20a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2v-5.5a2 2 0 0 1 2-2Z" />
      <circle cx="16" cy="17.25" r="3.15" />
    </svg>
  );
}

export function ExamSheetIcon({ className, ...props }: ActionIconProps) {
  return (
    <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.8" className={className} aria-hidden="true" {...props}>
      <path d="M10 4.5h8.3l5.2 5.2v15.8A2.5 2.5 0 0 1 21 28H10a2.5 2.5 0 0 1-2.5-2.5V7A2.5 2.5 0 0 1 10 4.5Z" />
      <path d="M18 4.8V10h5.2" />
      <path d="m11.5 15 1.7 1.7 3.2-3.4M18.5 15.5h2.5M11.5 21 13.2 22.7l3.2-3.4M18.5 21.5h2.5" />
    </svg>
  );
}
