export interface KaylaApp {
  id: string;
  name: string;
  aliases: string[];
  tagline: string;
  category: string;
  status: string;
  summary: string;
  description: string;
  purpose: string;
  targetUsers?: string[];
  features?: string[];
  platforms?: string[];
  requirements?: string;
  release?: string;
  downloads?: string[];
  docs?: string;
  repository?: string;
  website?: string;
  relatedProducts?: string[];
  roadmap?: string;
  limitations?: string[];
  faq?: { q: string; a: string }[];
  lastUpdated?: string;
  url?: string;
  accentColor?: string;
  download?: string;
  documentation?: string;
}

export interface KaylaFounder {
  name: string;
  role: string;
  publicBio: string;
  foundingStory: string;
  motivation: string;
  technicalInterests: string[];
  fdsVision: string;
  developmentPhilosophy: string;
  publicProjects: string[];
  publicLinks: { label: string; href: string }[];
}

export interface KaylaCompany {
  name: string;
  shortName: string;
  description: string;
  mission: string;
  vision: {
    current: string;
    activeDevelopment: string;
    research: string;
    planned: string;
    aspirational: string;
    longTerm: string;
  };
  philosophy: string[];
  productEcosystem: string[];
  currentProjects: string[];
  futurePlans: string[];
  publicResearchGoals: string[];
  communityGoals: string[];
  technologyReuse: string;
  hardwareDonations: string;
  affordableTechnology: string;
  affordableCommunityConcepts: string;
  communityGardens: string;
  forged: string;
  downloads: string;
  supportContact: string;
  githubUrl: string;
  youtubeUrl: string;
  discordUrl: string;
  linkedinUrl: string;
  tiktokUrl?: string;
  supportUrl: string;
  kofiUrl: string;
  cashAppHandle: string;
  cashAppUrl: string;
  supportEmail: string;
}

export interface KaylaRoadmapItem {
  id: string;
  name: string;
  status: 'released' | 'active' | 'experimental' | 'planned' | 'research' | 'aspirational';
  summary: string;
  category?: string;
}

export interface KaylaCommunity {
  donations: { cashApp: string; kofi: string };
  hardwareDonations: { email: string; examples: string[] };
  affordableCommunities: string;
  gardens: string;
  status: string;
}

export interface KaylaDownload {
  id: string;
  appId: string;
  name: string;
  version?: string;
  platform?: string;
  href: string;
  kind: 'installer' | 'portable' | 'archive' | 'source';
  size?: string;
  checksum?: string;
}

export interface KaylaRelease {
  appId: string;
  version: string;
  status: 'stable' | 'preview' | 'beta' | 'experimental';
  date?: string;
  notes?: string;
  downloads?: string[];
  changelog?: string;
}

export interface KaylaGitHubRepo {
  project: string;
  repositoryName: string;
  url: string;
  description: string;
  public: boolean;
  docs?: string;
  lastUpdated?: string;
}

export interface KaylaFdsSite {
  id: string;
  name: string;
  origin: string;
  authority: number;
  enabled: boolean;
}

export interface KaylaProductRelationship {
  from: string;
  to: string;
  relation: 'relatedTo' | 'companionTo' | 'publishedThrough' | 'partOf' | 'supports';
  description?: string;
}

export interface KaylaVisionTier {
  tier: 'current' | 'active' | 'research' | 'planned' | 'aspirational' | 'longTerm';
  label: string;
  items: string[];
}

export type KaylaSafeActionType =
  | 'OPEN_PAGE'
  | 'OPEN_APP'
  | 'OPEN_DOWNLOAD'
  | 'OPEN_GITHUB'
  | 'OPEN_FORGED'
  | 'OPEN_CONTACT'
  | 'OPEN_DONATE'
  | 'SHOW_APPS'
  | 'SHOW_ROADMAP';

export interface KaylaSafeAction {
  type: KaylaSafeActionType;
  label: string;
  href?: string;
  payload?: Record<string, unknown>;
}

export interface KaylaPageContext {
  route: string;
  pageType: 'home' | 'project' | 'product' | 'projects' | 'forged' | 'lab' | 'notes' | 'about' | 'support' | 'hardware' | 'community' | 'faq' | 'technology' | 'privacy' | 'terms' | '404';
  entity?: string;
}

export interface KaylaKnowledgeResult {
  type: 'app' | 'company' | 'founder' | 'roadmap' | 'community' | 'download' | 'faq' | 'release' | 'github' | 'vision' | 'general';
  title: string;
  snippet: string;
  action?: KaylaSafeAction;
  data?: unknown;
  score?: number;
  id?: string;
  route?: string;
  sourceType?: string;
  lastUpdated?: string;
}

export interface KaylaKnowledgeProvider {
  search(query: string, context?: KaylaPageContext): Promise<KaylaKnowledgeResult[]>;
}

export interface KaylaConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface KaylaSourceReference {
  id: string;
  title: string;
  type: string;
  route?: string;
}

export type KaylaChatMode = 'ai' | 'local' | 'unavailable';

export type KaylaErrorType =
  | 'NO_PROVIDER'
  | 'INVALID_CONFIGURATION'
  | 'AUTH_FAILURE'
  | 'RATE_LIMITED'
  | 'QUOTA_EXHAUSTED'
  | 'TIMEOUT'
  | 'NETWORK_FAILURE'
  | 'PROVIDER_FAILURE'
  | 'MALFORMED_RESPONSE'
  | 'RETRIEVAL_FAILURE'
  | 'VALIDATION_ERROR';

export interface KaylaAIRequest {
  message: string;
  history: KaylaConversationMessage[];
  context?: KaylaPageContext;
  sources: KaylaKnowledgeResult[];
}

export interface KaylaAIResponse {
  content: string;
  actions?: KaylaSafeAction[];
}

export interface KaylaAIChunk {
  type: 'content' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface KaylaAIProvider {
  id: string;
  name: string;
  isAvailable(): Promise<boolean>;
  chat(request: KaylaAIRequest): Promise<KaylaAIResponse>;
  stream?(request: KaylaAIRequest): AsyncIterable<KaylaAIChunk>;
}

export interface KaylaChatRequest {
  message: string;
  history?: KaylaConversationMessage[];
  context?: KaylaPageContext;
}

export interface KaylaChatResponse {
  answer: string;
  actions?: KaylaSafeAction[];
  sources?: KaylaSourceReference[];
  mode: KaylaChatMode;
}

export interface KaylaConfig {
  enabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
  endpoint: string;
  maxMessageLength: number;
  maxHistoryMessages: number;
  rateLimitPerMinute: number;
  rateLimitPerHour: number;
  aiDailyRequestLimit: number;
  maxPayloadBytes: number;
  maxObjectDepth: number;
  requestTimeoutMs: number;
  maxRetries: number;
}

export interface KaylaEnv {
  KAYLA_ENABLED?: string;
  KAYLA_PROVIDER?: string;
  KAYLA_MODEL?: string;
  KAYLA_API_KEY?: string;
  KAYLA_ENDPOINT?: string;
  KAYLA_MAX_MESSAGE_LENGTH?: string;
  KAYLA_MAX_HISTORY_MESSAGES?: string;
  KAYLA_RATE_LIMIT_PER_MINUTE?: string;
  KAYLA_RATE_LIMIT_PER_HOUR?: string;
  KAYLA_AI_DAILY_REQUEST_LIMIT?: string;
  KAYLA_MAX_PAYLOAD_BYTES?: string;
  KAYLA_MAX_OBJECT_DEPTH?: string;
  KAYLA_PROVIDER_TIMEOUT_MS?: string;
  KAYLA_RATE_LIMIT_SALT?: string;
  KAYLA_REQUEST_TIMEOUT_MS?: string;
  KAYLA_MAX_RETRIES?: string;
  KAYLA_ALLOWED_ORIGINS?: string;
}
