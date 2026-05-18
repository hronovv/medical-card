import type { ReactNode } from 'react'

export type PartnerVariant = 'synapse' | 'quanta' | 'pulsar' | 'effon' | 'orion'

type PartnerLogoProps = {
  variant: PartnerVariant
}

const icons: Record<PartnerVariant, ReactNode> = {
  synapse: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
        d="M15 14c5 6 5 14 0 20M33 14c-5 6-5 14 0 20"
      />
      <circle cx="15" cy="14" r="2.5" fill="currentColor" />
      <circle cx="33" cy="14" r="2.5" fill="currentColor" />
      <circle cx="15" cy="34" r="2.5" fill="currentColor" />
      <circle cx="33" cy="34" r="2.5" fill="currentColor" />
    </svg>
  ),
  quanta: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="5" fill="currentColor" />
      <ellipse
        cx="24"
        cy="24"
        rx="16"
        ry="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
      />
      <ellipse
        cx="24"
        cy="24"
        rx="16"
        ry="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        transform="rotate(60 24 24)"
      />
      <ellipse
        cx="24"
        cy="24"
        rx="16"
        ry="7"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        transform="rotate(120 24 24)"
      />
    </svg>
  ),
  pulsar: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <circle cx="24" cy="24" r="4" fill="currentColor" />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        d="M24 8v6M24 34v6M8 24h6M34 24h6"
      />
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        opacity="0.55"
        d="M13 13l4 4M31 31l4 4M35 13l-4 4M17 31l-4 4"
      />
    </svg>
  ),
  effon: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 12h8l2 6-6 22-6-22 2-6z"
      />
      <path fill="currentColor" d="M22 20h4v3h-4z" opacity="0.45" />
      <circle cx="24" cy="32" r="2" fill="currentColor" opacity="0.7" />
    </svg>
  ),
  orion: (
    <svg viewBox="0 0 48 48" aria-hidden>
      <path fill="currentColor" d="M12 20h24v16H12V20zm8-8h8v8h-8V12zm4 10v6h4v-6h-4z" />
      <rect x="18" y="14" width="12" height="4" rx="1" fill="currentColor" opacity="0.35" />
    </svg>
  ),
}

export function PartnerLogo({ variant }: PartnerLogoProps) {
  return (
    <div className={`mc-partner-logo-wrap mc-partner-logo-wrap--${variant}`}>
      <div className={`mc-partner-logo mc-partner-logo--${variant}`}>{icons[variant]}</div>
    </div>
  )
}
