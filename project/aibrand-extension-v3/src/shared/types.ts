/**
 * AiBrand Extension v3 — Shared Types
 *
 * All message protocol types, platform configs, and domain models.
 * Single source of truth for the extension ↔ backend contract.
 */

// ─── WebSocket Message Protocol ───────────────────────────────────────────

/** Every WebSocket message follows this envelope */
export interface WsMessage<T = unknown> {
  type: WsMessageType;
  payload: T;
  /** Client-generated unique ID for request/response correlation */
  traceId?: string;
  /** ISO-8601 timestamp */
  ts: string;
}

export type WsMessageType =
  // Client → Server
  | 'REGISTER'
  | 'PING'
  | 'TASK_PROGRESS'
  | 'TASK_COMPLETE'
  | 'QUALITY_CHECK_REQUEST'     // Extension → Backend: request quality review
  // Server → Client
  | 'REGISTERED'
  | 'PONG'
  | 'NEW_TASK'
  | 'CONFIG_UPDATE'
  | 'COMMAND'
  | 'QUALITY_CHECK_STARTED'     // Backend → Extension: review began
  | 'QUALITY_DIM_RESULT'        // Backend → Extension: one dimension done (streaming)
  | 'QUALITY_VERDICT'           // Backend → Extension: final verdict
  // Bidirectional
  | 'ERROR';

// ─── Payload Types ────────────────────────────────────────────────────────

export interface RegisterPayload {
  extensionVersion: string;
  clientId: string;
  platformCapabilities: string[];
}

export interface RegisteredPayload {
  clientId: string;
  serverTime: string;
}

export interface PingPayload {
  ts: number;
}

export interface PongPayload {
  ts: number;
  serverTime: string;
}

export interface NewTaskPayload {
  taskId: string;
  priority: 'low' | 'normal' | 'high';
  platforms: string[];
  content: PublishContent;
  config: TaskConfig;
}

export interface TaskProgressPayload {
  taskId: string;
  platform: string;
  status: TaskStepStatus;
  progress: number; // 0-100
  message?: string;
  resultUrl?: string;
}

export interface TaskCompletePayload {
  taskId: string;
  results: PlatformResult[];
}

export interface ConfigUpdatePayload {
  platforms: Record<string, PlatformConfig>;
  featureFlags?: Record<string, boolean>;
}

export interface CommandPayload {
  command: CommandType;
  data?: unknown;
}

export type CommandType =
  | 'SYNC_ACCOUNTS'
  | 'REFRESH_PLATFORMS'
  | 'CANCEL_TASK'
  | 'CLEAR_AUTH'
  | 'RESTART';

export interface ErrorPayload {
  code: string;
  message: string;
  traceId?: string;
}

// ─── Quality Check Types ──────────────────────────────────────────────────

export interface QualityCheckRequestPayload {
  taskId: string;
  content: PublishContent;
  platforms: string[];
  /** Whether this is a re-check due to user edits */
  recheck?: boolean;
}

export interface QualityCheckStartedPayload {
  taskId: string;
  dimensions: QualityDimension[];
  totalSteps: number;
}

export interface QualityDimResultPayload {
  taskId: string;
  dimension: QualityDimension;
  label: string;
  score: number;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  details?: string[];
}

export interface QualityVerdictPayload {
  taskId: string;
  passed: boolean;
  overallScore: number;
  threshold: number;
  dimensions: QualityDimResultPayload[];
  suggestions: string[];
  reviewedByAgent: boolean;
}

export type QualityDimension = 'content' | 'geo' | 'compliance' | 'originality';

// ─── Content Types ────────────────────────────────────────────────────────

export type ContentType = 'article' | 'dynamic' | 'video' | 'podcast';

export interface PublishContent {
  type: ContentType;
  title: string;
  content: string;
  /** Dynamic/Article text content */
  digest?: string;
  /** Article HTML */
  htmlContent?: string;
  /** Article markdown */
  markdownContent?: string;
  /** Media files */
  media?: MediaFile[];
  /** Cover image */
  cover?: MediaFile;
  /** Tags / hashtags */
  tags?: string[];
  /** Platform-specific category */
  category?: string | number;
  /** Is original content? */
  original?: boolean;
  /** Allow comments? */
  allowComment?: boolean;
}

export interface MediaFile {
  name: string;
  url: string;
  type: 'image' | 'video' | 'audio';
  size?: number;
  width?: number;
  height?: number;
  duration?: number;
}

// ─── Task Types ───────────────────────────────────────────────────────────

export type TaskStepStatus =
  | 'pending'
  | 'uploading'
  | 'publishing'
  | 'completed'
  | 'error';

export type TaskStatus = 'queued' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface TaskConfig {
  /** Scheduled publish time (unix ms) */
  scheduledTime?: number;
  /** Auto-publish without user confirmation */
  autoPublish: boolean;
  /** Require human confirmation before submitting */
  requireConfirmation: boolean;
  /** Max retry count per platform */
  maxRetries?: number;
  /** Timeout per platform (ms) */
  timeoutMs?: number;
}

export interface PlatformResult {
  platform: string;
  success: boolean;
  url?: string;
  error?: string;
}

export interface PublishTask {
  taskId: string;
  priority: 'low' | 'normal' | 'high';
  status: TaskStatus;
  platforms: string[];
  content: PublishContent;
  config: TaskConfig;
  createdAt: number;
  updatedAt: number;
  results: PlatformResult[];
}

// ─── Platform Config Types ────────────────────────────────────────────────

export interface PlatformConfig {
  id: string;
  name: string;
  type: ContentType;
  icon: string;

  /** The publish page URL template */
  publishUrl: string;
  /** Login page URL */
  loginUrl: string;

  /** Content injection pipeline steps */
  pipeline: PipelineStep[];

  /** AI-assisted injection configuration */
  aiInjection: AiInjectionConfig;

  /** Platform media constraints */
  mediaConstraints: MediaConstraints;

  /** Platform content constraints */
  contentConstraints: ContentConstraints;

  /** Login detection method */
  loginDetection: LoginDetection;
}

export interface PipelineStep {
  id: string;
  type: 'input' | 'upload' | 'click' | 'wait' | 'select' | 'custom';
  target: {
    /** Precise CSS selector (may be empty if using aiHint) */
    selector?: string;
    /** Natural language hint for AI-assisted targeting */
    aiHint?: string;
    /** XPath fallback */
    xpath?: string;
  };
  /** Static value or template variable (e.g. "{{title}}") */
  value?: string | { template: string };
  /** Wait after executing this step (ms) */
  waitAfter?: number;
  /** Non-blocking — failure does not stop the pipeline */
  optional?: boolean;
}

export interface AiInjectionConfig {
  enabled: boolean;
  /** System prompt for the AI selector model */
  prompt: string;
  /** Fallback CSS selectors when AI is unavailable */
  fallbackSelectors: Record<string, string[]>;
}

export interface MediaConstraints {
  images: { max: number; formats: string[]; maxSize: number };
  videos: { max: number; formats: string[]; maxDuration: number };
}

export interface ContentConstraints {
  titleMaxLength: number;
  contentMaxLength: number;
  hashtagMaxCount: number;
  supportedFeatures: string[];
}

export interface LoginDetection {
  cookieName?: string;
  apiCheck?: string;
  domIndicator?: { selector: string; text: string };
}

// ─── Auth Types ───────────────────────────────────────────────────────────

export interface AuthState {
  token: string | null;
  user: AiBrandUser | null;
  isAuthenticated: boolean;
  expiresAt: number | null;
}

export interface AiBrandUser {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

// ─── Extension State (Zustand) ────────────────────────────────────────────

export interface ExtensionState {
  /** WebSocket connection state */
  wsConnected: boolean;
  /** Active tasks */
  tasks: PublishTask[];
  /** Platform configs (from backend) */
  platformConfigs: Record<string, PlatformConfig>;
  /** Auth state */
  auth: AuthState;
  /** Feature flags */
  featureFlags: Record<string, boolean>;
}
