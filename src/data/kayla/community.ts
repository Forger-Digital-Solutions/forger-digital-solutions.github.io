import type { KaylaCommunity } from './types';
import { siteConfig } from '../../config/site';

export const community: KaylaCommunity = {
  donations: {
    cashApp: siteConfig.cashAppHandle,
    kofi: siteConfig.kofiUrl
  },
  hardwareDonations: {
    email: siteConfig.supportEmail,
    examples: siteConfig.hardwareExamples
  },
  affordableCommunities: 'Exploring ways technology and transparent systems could support more affordable, sustainable communities — from shared-resource planning to open tools that help people understand and manage shared infrastructure.',
  gardens: 'Community growing spaces, local food access, and shared infrastructure are on the long-term concept list. Ideas like sensor-driven growing data and open planning tools may connect FDS work with local food resilience.',
  status: 'Exploring'
};
