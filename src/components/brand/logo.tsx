import { cn } from '@/lib/utils';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
  className?: string;
}

const sizes = {
  sm: { icon: 24, text: 'text-base' },
  md: { icon: 32, text: 'text-xl' },
  lg: { icon: 40, text: 'text-2xl' },
};

export function Logo({ size = 'md', showText = true, className }: LogoProps) {
  const { icon, text } = sizes[size];

  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <svg
        width={icon}
        height={icon}
        viewBox="0 0 40 40"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* Bottom layer */}
        <rect
          x="6"
          y="22"
          width="28"
          height="4"
          rx="1"
          fill="#d4d4d4"
        />
        {/* Middle layer */}
        <rect
          x="4"
          y="15"
          width="32"
          height="5"
          rx="1.5"
          fill="#a3a3a3"
        />
        {/* Top layer - accent */}
        <rect
          x="2"
          y="7"
          width="36"
          height="6"
          rx="2"
          fill="#171717"
        />
        {/* Connection dots */}
        <circle cx="12" cy="30" r="2" fill="#171717" />
        <circle cx="20" cy="32" r="2" fill="#171717" />
        <circle cx="28" cy="30" r="2" fill="#171717" />
        {/* Connection lines */}
        <line x1="12" y1="28" x2="20" y2="26" stroke="#171717" strokeWidth="1" strokeLinecap="round" />
        <line x1="28" y1="28" x2="20" y2="26" stroke="#171717" strokeWidth="1" strokeLinecap="round" />
      </svg>
      {showText && (
        <span className={cn('font-semibold tracking-tight text-neutral-900', text)}>
          RealityLayer
        </span>
      )}
    </div>
  );
}
