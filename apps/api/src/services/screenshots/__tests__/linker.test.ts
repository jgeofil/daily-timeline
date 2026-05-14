import { describe, expect, it } from 'vitest';
import type { TimelineEntry } from '@daily-timeline/types';
import { linkScreenshotToTimeline } from '../linker';

function makeEntry(id: string, text: string, tags: string[] = []): TimelineEntry {
  return {
    id,
    userId: 'user-1',
    source: 'voice',
    text,
    tags,
    createdAt: '2024-01-01T00:00:00.000Z',
    occurredAt: '2024-01-01T00:00:00.000Z',
  };
}

describe('linkScreenshotToTimeline', () => {
  it('returns empty array when there are no timeline entries', () => {
    const ids = linkScreenshotToTimeline([], {
      ocrText: 'deploy error timeout',
      windowTitle: 'Terminal',
      inferredTask: null,
    });
    expect(ids).toEqual([]);
  });

  it('returns empty array when all signals are null (corpus is empty)', () => {
    const entries = [makeEntry('e1', 'deploy failed in production')];
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: null,
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids).toEqual([]);
  });

  it('returns empty array when no entry has overlapping tokens', () => {
    const entries = [makeEntry('e1', 'music playlist jazz')];
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: 'deploy error',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids).toEqual([]);
  });

  it('links entry when ocrText shares tokens with entry text', () => {
    const entries = [makeEntry('e1', 'deploy checklist review')];
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: 'TODO deploy failed',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids).toContain('e1');
  });

  it('links entry when windowTitle shares tokens with entry tags', () => {
    const entries = [makeEntry('e1', 'nothing relevant', ['kubernetes', 'deploy'])];
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: null,
      windowTitle: 'Kubernetes deploy dashboard',
      inferredTask: null,
    });
    expect(ids).toContain('e1');
  });

  it('links entry when inferredTask shares tokens with entry text', () => {
    const entries = [makeEntry('e1', 'working on review workflow for deployment')];
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: null,
      windowTitle: null,
      inferredTask: 'Working on review workflow',
    });
    expect(ids).toContain('e1');
  });

  it('sorts by overlap count – best match appears first', () => {
    const lowMatch = makeEntry('low', 'deploy the app');
    const highMatch = makeEntry('high', 'deploy error review failed timeout incident');
    const ids = linkScreenshotToTimeline([lowMatch, highMatch], {
      ocrText: 'deploy error review failed timeout incident',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids[0]).toBe('high');
    expect(ids).toContain('low');
  });

  it('returns at most 5 entry IDs even when more entries match', () => {
    const entries = Array.from({ length: 10 }, (_, i) =>
      makeEntry(`e${i}`, `deploy review error timeout failed incident ${i}`)
    );
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: 'deploy review error timeout failed incident',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids.length).toBeLessThanOrEqual(5);
  });

  it('filters out tokens of length 2 or less (tokenizer short-token filter)', () => {
    // "is", "to", "a" are len <= 2 and should NOT link entries
    const entries = [makeEntry('e1', 'is to a go')]; // all tokens length <= 2 or exactly 2
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: 'is to a go',
      windowTitle: null,
      inferredTask: null,
    });
    // "go" is length 2, filtered out; "is", "to", "a" are too short → no overlap
    expect(ids).toEqual([]);
  });

  it('combines all non-null signals into the corpus', () => {
    const entry = makeEntry('e1', 'review', ['deploy']);
    const ids = linkScreenshotToTimeline([entry], {
      ocrText: 'some text',
      windowTitle: 'deploy panel',
      inferredTask: 'Working on review workflow',
    });
    // "deploy" from windowTitle links to tag, "review" from inferredTask links to text
    expect(ids).toContain('e1');
  });

  it('handles entries whose text+tags have no tokens of length > 2', () => {
    const entry = makeEntry('e1', 'is a to', ['on', 'by']);
    const ids = linkScreenshotToTimeline([entry], {
      ocrText: 'deploy error review',
      windowTitle: null,
      inferredTask: null,
    });
    // The entry has no tokens > 2 chars, so no overlap
    expect(ids).toEqual([]);
  });

  it('is case-insensitive – uppercase entry text matches lowercase corpus tokens', () => {
    const entry = makeEntry('e1', 'DEPLOY ERROR REVIEW');
    const ids = linkScreenshotToTimeline([entry], {
      ocrText: 'deploy error review',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids).toContain('e1');
  });

  it('returns exactly 5 IDs when exactly 5 entries match', () => {
    const entries = Array.from({ length: 5 }, (_, i) =>
      makeEntry(`e${i}`, `deploy review error timeout failed`)
    );
    const ids = linkScreenshotToTimeline(entries, {
      ocrText: 'deploy review error timeout failed',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids).toHaveLength(5);
  });

  it('does not link entry when entry text is empty string', () => {
    const entry = makeEntry('e1', '');
    const ids = linkScreenshotToTimeline([entry], {
      ocrText: 'deploy review error',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids).toEqual([]);
  });

  it('returns IDs preserving the original entry id string value', () => {
    const entry = makeEntry('entry-abc-123', 'deploy failed review');
    const ids = linkScreenshotToTimeline([entry], {
      ocrText: 'deploy failed review',
      windowTitle: null,
      inferredTask: null,
    });
    expect(ids).toHaveLength(1);
    expect(ids[0]).toBe('entry-abc-123');
  });
});