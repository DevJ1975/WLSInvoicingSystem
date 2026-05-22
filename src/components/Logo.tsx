interface LogoProps {
  className?: string;
  showWordmark?: boolean;
}

export function Logo({ className = 'h-9', showWordmark = true }: LogoProps) {
  // The packaged logo already includes the wordmark; showWordmark trims to the mark when false.
  return (
    <img
      src="/wls-logo.png"
      alt="Workplace Learning System"
      className={className}
      style={showWordmark ? undefined : { objectFit: 'none', objectPosition: 'left', width: 56 }}
    />
  );
}
