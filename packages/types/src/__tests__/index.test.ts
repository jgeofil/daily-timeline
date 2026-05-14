import { describe, it, expect } from 'vitest';
import type {
  TimelineEntry,
  TimelineEntrySource,
  VoiceCaptureSession,
  ScreenshotEvent,
  Insight,
  DailyReviewSession,
} from '../index';

// ---------------------------------------------------------------------------
// Helper: runtime assertion that an object satisfies an interface.
// Since TypeScript types are erased at runtime, we verify field presence and
// value constraints through ordinary runtime checks.
// ---------------------------------------------------------------------------

describe('TimelineEntry', () => {
  it('accepts a fully populated TimelineEntry object', () => {
    const entry: TimelineEntry = {
      id: 'entry-1',
      userId: 'user-1',
      source: 'voice',
      text: 'Some captured note.',
      tags: ['work', 'meeting'],
      createdAt: '2024-01-15T09:00:00.000Z',
      occurredAt: '2024-01-15T08:55:00.000Z',
    };

    expect(entry.id).toBe('entry-1');
    expect(entry.userId).toBe('user-1');
    expect(entry.source).toBe('voice');
    expect(entry.text).toBe('Some captured note.');
    expect(entry.tags).toEqual(['work', 'meeting']);
    expect(entry.createdAt).toBe('2024-01-15T09:00:00.000Z');
    expect(entry.occurredAt).toBe('2024-01-15T08:55:00.000Z');
  });

  it('accepts all valid TimelineEntrySource values', () => {
    const sources: TimelineEntrySource[] = ['manual', 'voice', 'screenshot', 'system'];
    for (const source of sources) {
      const entry: TimelineEntry = {
        id: 'id',
        userId: 'u1',
        source,
        text: 'text',
        tags: [],
        createdAt: new Date().toISOString(),
        occurredAt: new Date().toISOString(),
      };
      expect(entry.source).toBe(source);
    }
  });

  it('accepts an empty tags array', () => {
    const entry: TimelineEntry = {
      id: 'x',
      userId: 'u',
      source: 'manual',
      text: 'note',
      tags: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      occurredAt: '2024-01-01T00:00:00.000Z',
    };
    expect(entry.tags).toHaveLength(0);
  });

  it('tags array can hold multiple strings', () => {
    const entry: TimelineEntry = {
      id: 'x',
      userId: 'u',
      source: 'screenshot',
      text: 'coded',
      tags: ['typescript', 'react', 'testing'],
      createdAt: '2024-01-01T00:00:00.000Z',
      occurredAt: '2024-01-01T00:00:00.000Z',
    };
    expect(entry.tags).toHaveLength(3);
    expect(entry.tags).toContain('typescript');
  });
});

describe('VoiceCaptureSession', () => {
  it('accepts a capturing session with null endedAt', () => {
    const session: VoiceCaptureSession = {
      id: 'session-1',
      entryIds: ['entry-1', 'entry-2'],
      startedAt: '2024-01-15T09:00:00.000Z',
      endedAt: null,
      language: 'en-US',
      state: 'capturing',
    };

    expect(session.id).toBe('session-1');
    expect(session.entryIds).toEqual(['entry-1', 'entry-2']);
    expect(session.endedAt).toBeNull();
    expect(session.state).toBe('capturing');
    expect(session.language).toBe('en-US');
  });

  it('accepts a completed session with a non-null endedAt', () => {
    const session: VoiceCaptureSession = {
      id: 'session-2',
      entryIds: [],
      startedAt: '2024-01-15T09:00:00.000Z',
      endedAt: '2024-01-15T09:30:00.000Z',
      language: 'fr-FR',
      state: 'completed',
    };

    expect(session.endedAt).toBe('2024-01-15T09:30:00.000Z');
    expect(session.state).toBe('completed');
  });

  it('accepts all valid state values', () => {
    const states: VoiceCaptureSession['state'][] = ['capturing', 'processing', 'completed', 'failed'];
    for (const state of states) {
      const session: VoiceCaptureSession = {
        id: 's',
        entryIds: [],
        startedAt: '2024-01-01T00:00:00.000Z',
        endedAt: null,
        language: 'en-US',
        state,
      };
      expect(session.state).toBe(state);
    }
  });

  it('accepts an empty entryIds array', () => {
    const session: VoiceCaptureSession = {
      id: 's',
      entryIds: [],
      startedAt: '2024-01-01T00:00:00.000Z',
      endedAt: null,
      language: 'en-US',
      state: 'capturing',
    };
    expect(session.entryIds).toHaveLength(0);
  });
});

describe('ScreenshotEvent', () => {
  it('accepts a fully populated ScreenshotEvent', () => {
    const event: ScreenshotEvent = {
      id: 'screenshot-1',
      imageUrl: 'https://storage.example.com/screenshots/1.png',
      capturedAt: '2024-01-15T09:00:00.000Z',
      createdAt: '2024-01-15T09:00:05.000Z',
      windowTitle: 'VSCode - timeline project',
      inferredTask: 'Implement screenshot ingestion flow',
      ocrText: 'function hello() {}',
      entities: ['VSCode', 'timeline'],
      taskClues: ['TODO', 'timeline'],
      anomalies: ['Unexpected error modal'],
      linkedTimelineEntryIds: ['entry-1'],
    };

    expect(event.id).toBe('screenshot-1');
    expect(event.windowTitle).toContain('VSCode');
    expect(event.inferredTask).toContain('screenshot ingestion');
    expect(event.ocrText).toBe('function hello() {}');
    expect(event.entities).toEqual(['VSCode', 'timeline']);
    expect(event.linkedTimelineEntryIds).toEqual(['entry-1']);
  });

  it('accepts null for optional windowTitle, inferredTask and ocrText', () => {
    const event: ScreenshotEvent = {
      id: 'screenshot-2',
      imageUrl: 'https://storage.example.com/screenshots/2.png',
      capturedAt: '2024-01-15T09:00:00.000Z',
      createdAt: '2024-01-15T09:00:05.000Z',
      windowTitle: null,
      inferredTask: null,
      ocrText: null,
      entities: [],
      taskClues: [],
      anomalies: [],
      linkedTimelineEntryIds: [],
    };

    expect(event.windowTitle).toBeNull();
    expect(event.inferredTask).toBeNull();
    expect(event.ocrText).toBeNull();
  });

  it('linkedTimelineEntryIds is an array of entry IDs', () => {
    const event: ScreenshotEvent = {
      id: 'x',
      imageUrl: 'https://example.com/img.png',
      capturedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:01.000Z',
      windowTitle: null,
      inferredTask: null,
      ocrText: null,
      entities: ['Terminal'],
      taskClues: ['build'],
      anomalies: [],
      linkedTimelineEntryIds: ['entry-1', 'entry-2'],
    };
    expect(Array.isArray(event.linkedTimelineEntryIds)).toBe(true);
    expect(event.linkedTimelineEntryIds).toHaveLength(2);
  });

  it('entities, taskClues and anomalies are all arrays', () => {
    const event: ScreenshotEvent = {
      id: 'arrays-check',
      imageUrl: 'https://example.com/img.png',
      capturedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:01.000Z',
      windowTitle: 'Editor',
      inferredTask: 'Working on deploy workflow',
      ocrText: 'some text',
      entities: ['VSCode', 'Terminal'],
      taskClues: ['deploy', 'review'],
      anomalies: ['error', 'warning'],
      linkedTimelineEntryIds: [],
    };
    expect(Array.isArray(event.entities)).toBe(true);
    expect(Array.isArray(event.taskClues)).toBe(true);
    expect(Array.isArray(event.anomalies)).toBe(true);
    expect(event.entities).toHaveLength(2);
    expect(event.taskClues).toHaveLength(2);
    expect(event.anomalies).toHaveLength(2);
  });

  it('imageUrl is stored as a string field on the event', () => {
    const event: ScreenshotEvent = {
      id: 'url-check',
      imageUrl: 'https://storage.example.com/screenshots/abc123.png',
      capturedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:01.000Z',
      windowTitle: null,
      inferredTask: null,
      ocrText: null,
      entities: [],
      taskClues: [],
      anomalies: [],
      linkedTimelineEntryIds: [],
    };
    expect(typeof event.imageUrl).toBe('string');
    expect(event.imageUrl).toBe('https://storage.example.com/screenshots/abc123.png');
  });

  it('createdAt and capturedAt are separate timestamp fields', () => {
    const event: ScreenshotEvent = {
      id: 'timestamps',
      imageUrl: 'https://example.com/img.png',
      capturedAt: '2024-01-15T09:00:00.000Z',
      createdAt: '2024-01-15T09:00:05.000Z',
      windowTitle: null,
      inferredTask: null,
      ocrText: null,
      entities: [],
      taskClues: [],
      anomalies: [],
      linkedTimelineEntryIds: [],
    };
    expect(event.capturedAt).toBe('2024-01-15T09:00:00.000Z');
    expect(event.createdAt).toBe('2024-01-15T09:00:05.000Z');
    expect(event.capturedAt).not.toBe(event.createdAt);
  });
});

describe('Insight', () => {
  it('accepts a fully populated Insight', () => {
    const insight: Insight = {
      id: 'insight-1',
      entryIds: ['entry-1', 'entry-2'],
      createdAt: '2024-01-15T12:00:00.000Z',
      type: 'pattern',
      summary: 'Work is concentrated in the morning.',
      confidence: 0.92,
    };

    expect(insight.id).toBe('insight-1');
    expect(insight.type).toBe('pattern');
    expect(insight.confidence).toBe(0.92);
    expect(insight.summary).toBe('Work is concentrated in the morning.');
  });

  it('accepts all valid type values', () => {
    const types: Insight['type'][] = ['pattern', 'anomaly', 'recommendation', 'summary'];
    for (const type of types) {
      const insight: Insight = {
        id: 'i',
        entryIds: [],
        createdAt: '2024-01-01T00:00:00.000Z',
        type,
        summary: 'test',
        confidence: 0.5,
      };
      expect(insight.type).toBe(type);
    }
  });

  it('accepts confidence at boundary values 0 and 1', () => {
    const withZero: Insight = {
      id: 'a',
      entryIds: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      type: 'anomaly',
      summary: 'low confidence',
      confidence: 0,
    };
    const withOne: Insight = {
      id: 'b',
      entryIds: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      type: 'recommendation',
      summary: 'high confidence',
      confidence: 1,
    };
    expect(withZero.confidence).toBe(0);
    expect(withOne.confidence).toBe(1);
  });

  it('entryIds can hold multiple entries', () => {
    const insight: Insight = {
      id: 'i',
      entryIds: ['e1', 'e2', 'e3'],
      createdAt: '2024-01-01T00:00:00.000Z',
      type: 'summary',
      summary: 'daily summary',
      confidence: 0.8,
    };
    expect(insight.entryIds).toHaveLength(3);
  });
});

describe('DailyReviewSession', () => {
  it('accepts an in-progress session with null completedAt', () => {
    const review: DailyReviewSession = {
      id: 'review-1',
      date: '2024-01-15',
      startedAt: '2024-01-15T18:00:00.000Z',
      completedAt: null,
      insightIds: ['insight-1'],
      status: 'in_progress',
    };

    expect(review.id).toBe('review-1');
    expect(review.date).toBe('2024-01-15');
    expect(review.completedAt).toBeNull();
    expect(review.status).toBe('in_progress');
    expect(review.insightIds).toEqual(['insight-1']);
  });

  it('accepts a completed session with non-null completedAt', () => {
    const review: DailyReviewSession = {
      id: 'review-2',
      date: '2024-01-15',
      startedAt: '2024-01-15T18:00:00.000Z',
      completedAt: '2024-01-15T18:45:00.000Z',
      insightIds: [],
      status: 'completed',
    };

    expect(review.completedAt).toBe('2024-01-15T18:45:00.000Z');
    expect(review.status).toBe('completed');
  });

  it('accepts all valid status values', () => {
    const statuses: DailyReviewSession['status'][] = ['pending', 'in_progress', 'completed'];
    for (const status of statuses) {
      const review: DailyReviewSession = {
        id: 'r',
        date: '2024-01-01',
        startedAt: '2024-01-01T00:00:00.000Z',
        completedAt: null,
        insightIds: [],
        status,
      };
      expect(review.status).toBe(status);
    }
  });

  it('date field stores ISO date string (YYYY-MM-DD format)', () => {
    const review: DailyReviewSession = {
      id: 'r',
      date: '2024-12-31',
      startedAt: '2024-12-31T10:00:00.000Z',
      completedAt: null,
      insightIds: [],
      status: 'pending',
    };
    expect(review.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('insightIds can reference multiple insights', () => {
    const review: DailyReviewSession = {
      id: 'r',
      date: '2024-01-01',
      startedAt: '2024-01-01T00:00:00.000Z',
      completedAt: null,
      insightIds: ['i1', 'i2', 'i3'],
      status: 'in_progress',
    };
    expect(review.insightIds).toHaveLength(3);
    expect(review.insightIds).toContain('i2');
  });
});