export type TimelineEntrySource = 'manual' | 'voice' | 'screenshot' | 'system';

export interface TimelineEntry {
  id: string;
  userId: string;
  source: TimelineEntrySource;
  text: string;
  tags: string[];
  createdAt: string;
  occurredAt: string;
}

export interface VoiceCaptureSession {
  id: string;
  entryIds: string[];
  startedAt: string;
  endedAt: string | null;
  language: string;
  state: 'capturing' | 'processing' | 'completed' | 'failed';
}

export interface ScreenshotEvent {
  id: string;
  imageUrl: string;
  capturedAt: string;
  createdAt: string;
  windowTitle: string | null;
  inferredTask: string | null;
  ocrText: string | null;
  entities: string[];
  taskClues: string[];
  anomalies: string[];
  linkedTimelineEntryIds: string[];
}

export interface Insight {
  id: string;
  entryIds: string[];
  createdAt: string;
  type: 'pattern' | 'anomaly' | 'recommendation' | 'summary';
  summary: string;
  confidence: number;
}

export interface DailyReviewSession {
  id: string;
  date: string;
  startedAt: string;
  completedAt: string | null;
  insightIds: string[];
  status: 'pending' | 'in_progress' | 'completed';
}
