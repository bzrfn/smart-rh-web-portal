import type { SVGProps } from 'react';

export type SmartRhIconName =
  | 'attendance'
  | 'bell'
  | 'calendar'
  | 'chart'
  | 'check'
  | 'chevronDown'
  | 'close'
  | 'contracts'
  | 'data'
  | 'documents'
  | 'eye'
  | 'eyeOff'
  | 'health'
  | 'home'
  | 'logout'
  | 'menu'
  | 'moon'
  | 'payroll'
  | 'plus'
  | 'send'
  | 'spark'
  | 'sun'
  | 'support'
  | 'user'
  | 'users'
  | 'vacation';

type Props = SVGProps<SVGSVGElement> & {
  name: SmartRhIconName;
};

const PATHS: Record<SmartRhIconName, string[]> = {
  attendance: ['M8 7h8', 'M8 12h8', 'M8 17h5', 'M5 4h14v16H5z'],
  bell: ['M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9', 'M10 21h4'],
  calendar: ['M7 3v4', 'M17 3v4', 'M4 8h16', 'M5 5h14v16H5z'],
  chart: ['M5 19V5', 'M5 19h14', 'M9 16v-5', 'M13 16V8', 'M17 16v-8'],
  check: ['M5 13l4 4L19 7'],
  chevronDown: ['M7 10l5 5 5-5'],
  close: ['M6 6l12 12', 'M18 6L6 18'],
  contracts: ['M7 3h8l4 4v14H7z', 'M15 3v5h5', 'M10 12h7', 'M10 16h5'],
  data: ['M5 6c0-2 14-2 14 0s-14 2-14 0', 'M5 6v6c0 2 14 2 14 0V6', 'M5 12v6c0 2 14 2 14 0v-6'],
  documents: ['M8 3h7l4 4v14H8z', 'M15 3v5h5', 'M5 7v14h11'],
  eye: ['M2.5 12s3.5-6 9.5-6 9.5 6 9.5 6-3.5 6-9.5 6-9.5-6-9.5-6', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
  eyeOff: ['M3 3l18 18', 'M10.7 5.2A10.6 10.6 0 0 1 12 5c6 0 9.5 7 9.5 7a15.5 15.5 0 0 1-3.4 4.2', 'M6.2 6.4C3.8 8.1 2.5 12 2.5 12s3.5 7 9.5 7c1.6 0 3-.4 4.2-1', 'M9.9 9.9a3 3 0 0 0 4.2 4.2'],
  health: ['M12 21s-8-4.9-8-11a4.5 4.5 0 0 1 8-2.7A4.5 4.5 0 0 1 20 10c0 6.1-8 11-8 11z'],
  home: ['M3 11l9-8 9 8', 'M5 10v10h14V10', 'M9 20v-6h6v6'],
  logout: ['M10 17l5-5-5-5', 'M15 12H3', 'M13 5h6v14h-6'],
  menu: ['M4 7h16', 'M4 12h16', 'M4 17h16'],
  moon: ['M20 15.5A8.5 8.5 0 0 1 8.5 4a7 7 0 1 0 11.5 11.5z'],
  payroll: ['M4 7h16v10H4z', 'M8 11h.01', 'M16 13h.01', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6'],
  plus: ['M12 5v14', 'M5 12h14'],
  send: ['M4 12h14', 'M13 6l6 6-6 6'],
  spark: ['M12 2l1.7 6.3L20 10l-6.3 1.7L12 18l-1.7-6.3L4 10l6.3-1.7z'],
  sun: ['M12 4V2', 'M12 22v-2', 'M4.9 4.9 3.5 3.5', 'M20.5 20.5l-1.4-1.4', 'M4 12H2', 'M22 12h-2', 'M4.9 19.1l-1.4 1.4', 'M20.5 3.5l-1.4 1.4', 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8'],
  support: ['M12 18h.01', 'M9.2 9a3 3 0 1 1 5.4 1.8c-.9.7-1.6 1.2-1.9 2.7', 'M4 12a8 8 0 1 0 16 0 8 8 0 0 0-16 0'],
  user: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8', 'M4 21a8 8 0 0 1 16 0'],
  users: ['M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6', 'M2 20a7 7 0 0 1 14 0', 'M17 11a3 3 0 0 0 0-6', 'M16 14a6 6 0 0 1 6 6'],
  vacation: ['M6 20c2.5-4.5 5-8 12-10', 'M8 13c.8-4.8 4-7.8 9-9', 'M15 4c2 2.5 2.3 5.6 1 8', 'M4 20h16'],
};

export default function SmartRhIcon({ name, ...props }: Props) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...props}
    >
      {PATHS[name].map((path) => (
        <path key={path} d={path} />
      ))}
    </svg>
  );
}
