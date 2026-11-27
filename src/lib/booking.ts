import { siteConfig } from '../config/site';

export type PilotBookingVariant = 'pilot' | 'founding';

export interface PilotBookingDestination {
  href: string;
  external: boolean;
  isLiveCalendar: boolean;
  labelHint: string;
}

/**
 * Returns true only when the owner has configured a verified external
 * Cal.com or Calendly URL in src/config/site.ts.
 */
export function hasVerifiedBookingUrl(): boolean {
  const url = (siteConfig.pilotBookingUrl || '').trim();
  return /^https:\/\/(?:[a-z0-9-]+\.)?(?:cal\.com|calendly\.com)\/[^\s"'<>]+$/i.test(url);
}

/**
 * Resolves the primary CTA destination for booking a Studio Intelligence Hub
 * pilot call. Uses the owner's verified Cal.com/Calendly booking URL when
 * configured, and routes cleanly to the dedicated Pilot Request composer on
 * /contact/ (with direct email fallback) while awaiting calendar activation.
 */
export function getPilotBookingDestination(
  variant: PilotBookingVariant = 'pilot'
): PilotBookingDestination {
  if (hasVerifiedBookingUrl()) {
    return {
      href: siteConfig.pilotBookingUrl.trim(),
      external: true,
      isLiveCalendar: true,
      labelHint: 'Opens FDS pilot scheduling calendar',
    };
  }

  return {
    href:
      variant === 'founding'
        ? '/contact/?track=founding-studio'
        : '/contact/?track=studio-intelligence-hub',
    external: false,
    isLiveCalendar: false,
    labelHint: 'Opens direct pilot call request & email scheduling',
  };
}

/**
 * Builds a pre-filled direct mailto fallback link to FDS's verified operational
 * email address so a studio owner can request a pilot discussion in one click.
 */
export function getPilotMailtoHref(variant: PilotBookingVariant = 'pilot'): string {
  const subject =
    variant === 'founding'
      ? 'FDS Studio Intelligence Hub — Founding Studio Pilot Application'
      : siteConfig.pilotEmailSubject;
  const body = siteConfig.pilotEmailBody;
  return `mailto:${siteConfig.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
