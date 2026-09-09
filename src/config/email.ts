/**
 * Centralized Email Configuration for Forger Digital Solutions
 *
 * POLICY:
 * - Active proven operational mailbox is forgerdigisolsupport@gmail.com.
 * - Branded domain addresses (support@, billing@, security@, contact@) on
 *   forgerdigitalsolutions.com are marked as 'pending_domain_verification'.
 * - No fake SPF/DKIM/DMARC records are fabricated.
 * - All operational routing falls back safely to activeFallbackEmail.
 */

export type EmailRole = 'support' | 'billing' | 'security' | 'contact';

export interface EmailRoutingEntry {
  role: EmailRole;
  targetAddress: string;
  activeAddress: string;
  status: 'active' | 'pending_domain_verification' | 'planned';
  description: string;
}

export interface FdsEmailConfig {
  primaryDomain: string;
  activeFallbackEmail: string;
  routes: Record<EmailRole, EmailRoutingEntry>;
}

export const emailConfig: FdsEmailConfig = {
  primaryDomain: 'forgerdigitalsolutions.com',
  activeFallbackEmail: 'forgerdigisolsupport@gmail.com',
  routes: {
    support: {
      role: 'support',
      targetAddress: 'support@forgerdigitalsolutions.com',
      activeAddress: 'forgerdigisolsupport@gmail.com',
      status: 'pending_domain_verification',
      description: 'Customer inquiries, bug reports, and technical assistance',
    },
    billing: {
      role: 'billing',
      targetAddress: 'billing@forgerdigitalsolutions.com',
      activeAddress: 'forgerdigisolsupport@gmail.com',
      status: 'pending_domain_verification',
      description: 'Commercial licensing, payments, and tier entitlement verifications',
    },
    security: {
      role: 'security',
      targetAddress: 'security@forgerdigitalsolutions.com',
      activeAddress: 'forgerdigisolsupport@gmail.com',
      status: 'pending_domain_verification',
      description: 'Vulnerability disclosure and security notices',
    },
    contact: {
      role: 'contact',
      targetAddress: 'contact@forgerdigitalsolutions.com',
      activeAddress: 'forgerdigisolsupport@gmail.com',
      status: 'pending_domain_verification',
      description: 'General studio inquiries, partnerships, and press',
    },
  },
};

/**
 * Returns the active operational email address for a given role.
 * Falls back to activeFallbackEmail unless domain verification is active.
 */
export function getActiveEmail(role: EmailRole = 'support'): string {
  const route = emailConfig.routes[role];
  if (route && route.status === 'active') {
    return route.activeAddress;
  }
  return emailConfig.activeFallbackEmail;
}
