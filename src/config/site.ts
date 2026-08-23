export const siteConfig = {
  name: "Forger Digital Solutions",
  shortName: "FDS",
  description: "Independent software research and development focused on intelligent systems, developer infrastructure, creative technology, and experimental computing.",
  siteUrl: "https://forger-digital-solutions.github.io",

  // --- Social profiles ---
  githubUrl: "https://github.com/forger-digital-solutions",
  youtubeUrl: "https://www.youtube.com/@Forger_Digital_Solutions",
  discordUrl: "https://discord.gg/E34XavFDpJ",
  linkedinUrl: "https://www.linkedin.com/in/edward-schmidt-5ba274425",
  // FDS TikTok profile URL. Intentionally empty until the founder confirms the
  // real handle — social components hide TikTok automatically while empty.
  // Never invent a username here.
  tiktokUrl: "",

  // --- FDS Development & Hardware Support ---
  // Direct support for FDS development, operations, and development hardware.
  // This is NOT charitable giving; see the disclosure on /support.
  supportUrl: "https://ko-fi.com/forgerdigitalsolutions", // legacy alias used by existing components
  kofiUrl: "https://ko-fi.com/forgerdigitalsolutions",
  cashAppHandle: "$ForgerDigital",
  cashAppUrl: "https://cash.app/$ForgerDigital",
  supportEmail: "forgerdigisolsupport@gmail.com",

  // --- Hardware donations ("Give Your Old Tech a Second Life") ---
  // Routed through the public support email. No physical address is ever
  // published; logistics are coordinated privately after initial contact.
  hardwareDonationSubject: "FDS Hardware Donation",
  hardwareDonationBody: `Hi FDS,

I'd like to donate some technology. Details:

Device(s) / model(s):
Basic specifications:
Working condition:
Approximate location (city/region):
Shipping possible: Yes / No

Anything else we should know:`,
  // Examples shown on /support/hardware. Keep in sync with page copy.
  hardwareExamples: [
    "Laptops",
    "Mobile workstations",
    "Desktop workstations",
    "GPUs",
    "Servers",
    "SSDs / NVMe drives",
    "RAM",
    "Networking hardware",
    "Monitors",
    "Development boards",
    "Other usable computing equipment"
  ],

  author: "Edward Schmidt",
  location: "New Jersey, United States",
  // Path to the founder photo in /public (e.g. "/images/brand/edward-schmidt.png").
  // Leave empty to show a monogram avatar on the About page instead.
  authorImage: "/images/brand/edward-schmidt.png",
  ogImage: "/images/og/fds-default.jpg",

  // --- Community Impact initiatives (future concepts, not active programs) ---
  communityImpactStatus: "Exploring",

  // --- Community Projects Fund ---
  // Community-project funding is intentionally DISABLED. It must stay separate
  // from ordinary FDS development/hardware support until a real, approved
  // mechanism exists (dedicated account, fiscal sponsorship, transparent
  // ledger, etc.). Do not set communityFundingActive to true without both a
  // real mechanism AND communityFundingUrl populated.
  communityFundingActive: false,
  communityFundingStatus: "Funding Structure in Development",
  // Future fields — leave empty until real values exist:
  communityFundingUrl: "",
  communityLedgerUrl: "",
  communityWalletAddress: "",
  communityWalletNetwork: "",
  communityWalletType: "",
  communityWalletThreshold: "" // e.g. future "2-of-3" or "3-of-5" — not selected yet
};
