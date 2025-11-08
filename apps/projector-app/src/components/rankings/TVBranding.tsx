import { useState } from 'react';
import type { GamePeriod } from '@allstars/types';

interface TVBrandingProps {
  logoUrl: string;
  showLiveBadge: boolean;
  period: GamePeriod | undefined;
}

/**
 * Fallback SVG logo displayed when main logo fails to load
 */
function FallbackLogo() {
  return (
    <svg
      className="show-logo show-logo-fallback"
      width="200"
      height="100"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="fallbackGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: '#0ea5e9', stopOpacity: 1 }} />
          <stop offset="100%" style={{ stopColor: '#8b5cf6', stopOpacity: 1 }} />
        </linearGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#fallbackGradient)" rx="10" />
      <text
        x="50%"
        y="50%"
        fontSize="24"
        fontWeight="bold"
        fill="#ffffff"
        textAnchor="middle"
        dominantBaseline="middle"
      >
        AllStars
      </text>
    </svg>
  );
}

/**
 * Get period label text based on GamePeriod
 */
function getPeriodLabel(period: GamePeriod | undefined): string | null {
  if (!period) return null;

  switch (period) {
    case 'first-half':
      return '前半';
    case 'second-half':
      return '後半';
    case 'overtime':
      return '延長';
    default:
      return null;
  }
}

export function TVBranding({ logoUrl, showLiveBadge, period }: TVBrandingProps) {
  const [logoError, setLogoError] = useState(false);
  const periodLabel = getPeriodLabel(period);

  const handleLogoError = () => {
    setLogoError(true);
  };

  return (
    <div className="tv-branding">
      <div className="branding-left">
        {logoError ? (
          <FallbackLogo />
        ) : (
          <img
            src={logoUrl}
            alt="Show Logo"
            className="show-logo"
            onError={handleLogoError}
          />
        )}
      </div>

      <div className="branding-center">
        {periodLabel && <div className="period-label">{periodLabel}</div>}
      </div>

      <div className="branding-right">
        {showLiveBadge && <div className="live-badge">生放送</div>}
      </div>
    </div>
  );
}
