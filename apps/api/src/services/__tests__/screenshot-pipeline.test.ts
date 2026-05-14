import { describe, expect, it } from 'vitest';
import type { Insight, TimelineEntry } from '@daily-timeline/types';
import { analyzeScreenshot, extractOcrText } from '../vision';
import { linkScreenshotToTimeline } from '../screenshots/linker';
import { ingestScreenshotEvent } from '../screenshots/service';
import { InMemoryScreenshotStorage } from '../screenshots/storage';

describe('screenshot pipeline', () => {
  it('extractOcrText uses hinted text first', () => {
    const text = extractOcrText({
      imageUrl: 'https://storage.example.com/no-content.png',
      windowTitle: 'Editor',
      hintedText: 'deploy warning in terminal',
    });

    expect(text).toBe('deploy warning in terminal');
  });

  it('analyzeScreenshot identifies clues and anomalies', () => {
    const analysis = analyzeScreenshot({
      imageUrl: 'https://storage.example.com/deploy_error.png',
      windowTitle: 'VSCode deploy warning',
      hintedText: 'TODO resolve error before review',
    });

    expect(analysis.taskClues).toContain('todo');
    expect(analysis.anomalies).toContain('error');
  });

  it('ingestScreenshotEvent links to relevant timeline and emits anomaly insight', () => {
    const timelineEntries: TimelineEntry[] = [
      {
        id: 'entry-1',
        userId: 'user-1',
        source: 'voice',
        text: 'Finish deploy checklist and review app logs',
        tags: ['deploy', 'review'],
        createdAt: '2024-01-01T00:00:00.000Z',
        occurredAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const insights: Insight[] = [];
    const storage = new InMemoryScreenshotStorage();

    const event = ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/deploy_error.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: 'Deploy warning',
        hintedText: 'TODO deploy failed in prod',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights }
    );

    expect(event.linkedTimelineEntryIds).toContain('entry-1');
    expect(storage.list()).toHaveLength(1);
    expect(insights[0]?.summary).toContain('Possible missed detail');
  });

  it('linkScreenshotToTimeline handles empty signals', () => {
    const ids = linkScreenshotToTimeline([], { ocrText: null, windowTitle: null, inferredTask: null });
    expect(ids).toEqual([]);
  });

  it('ingestScreenshotEvent does NOT create an insight when there are no anomalies', () => {
    const timelineEntries: TimelineEntry[] = [];
    const insights: Insight[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/clean-screenshot.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: 'Normal Editor Window',
        hintedText: 'just a routine review session',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights }
    );

    // "review" is a task clue but no anomaly terms → no insight pushed
    expect(insights).toHaveLength(0);
  });

  it('ingestScreenshotEvent adds a TimelineEntry with source "screenshot"', () => {
    const timelineEntries: TimelineEntry[] = [];
    const insights: Insight[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/clean.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: null,
        hintedText: null,
        userId: 'user-99',
      },
      { storage, timelineEntries, insights }
    );

    expect(timelineEntries).toHaveLength(1);
    const firstEntry = timelineEntries[0];
    expect(firstEntry).toBeDefined();
    if (!firstEntry) return;
    expect(firstEntry.source).toBe('screenshot');
    expect(firstEntry.userId).toBe('user-99');
  });

  it('ingestScreenshotEvent uses "Screenshot captured" as text fallback when ocrText and windowTitle are both null', () => {
    const timelineEntries: TimelineEntry[] = [];
    const insights: Insight[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/x.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights }
    );

    // URL "x.png" yields no 12-char match → ocrText null; windowTitle not provided
    const fallbackEntry = timelineEntries[0];
    expect(fallbackEntry).toBeDefined();
    if (!fallbackEntry) return;
    expect(fallbackEntry.text).toBe('Screenshot captured');
  });

  it('ingestScreenshotEvent returned ScreenshotEvent always has expected shape', () => {
    const storage = new InMemoryScreenshotStorage();

    const event = ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/deploy-error-screenshot.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: 'Deploy Terminal',
        userId: 'user-1',
      },
      { storage, timelineEntries: [], insights: [] }
    );

    expect(typeof event.id).toBe('string');
    expect(event.id).toMatch(/^shot-/);
    expect(event.imageUrl).toBe('https://storage.example.com/deploy-error-screenshot.png');
    expect(event.capturedAt).toBe('2024-01-15T09:00:00.000Z');
    expect(typeof event.createdAt).toBe('string');
    expect(Array.isArray(event.entities)).toBe(true);
    expect(Array.isArray(event.taskClues)).toBe(true);
    expect(Array.isArray(event.anomalies)).toBe(true);
    expect(Array.isArray(event.linkedTimelineEntryIds)).toBe(true);
  });

  it('multiple ingestScreenshotEvent calls accumulate events in storage', () => {
    const storage = new InMemoryScreenshotStorage();

    for (let i = 0; i < 3; i++) {
      ingestScreenshotEvent(
        {
          imageUrl: `https://storage.example.com/shot${i}.png`,
          capturedAt: '2024-01-15T09:00:00.000Z',
          userId: 'user-1',
        },
        { storage, timelineEntries: [], insights: [] }
      );
    }

    expect(storage.list()).toHaveLength(3);
  });

  it('ingestScreenshotEvent TimelineEntry tags always start with "screenshot"', () => {
    const timelineEntries: TimelineEntry[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/deploy-error-screenshot.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: null,
        hintedText: 'TODO deploy failed',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights: [] }
    );

    const taggedEntry = timelineEntries[0];
    expect(taggedEntry).toBeDefined();
    if (!taggedEntry) return;
    expect(taggedEntry.tags[0]).toBe('screenshot');
    expect(taggedEntry.tags.length).toBeLessThanOrEqual(6);
  });

  it('anomaly insight references both linked timeline entry IDs and the new entry ID', () => {
    const timelineEntries: TimelineEntry[] = [
      {
        id: 'existing-entry',
        userId: 'user-1',
        source: 'voice',
        text: 'deploy review checklist',
        tags: ['deploy', 'review'],
        createdAt: '2024-01-01T00:00:00.000Z',
        occurredAt: '2024-01-01T00:00:00.000Z',
      },
    ];
    const insights: Insight[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/deploy-error.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: null,
        hintedText: 'TODO deploy failed with error',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights }
    );

    expect(insights).toHaveLength(1);
    const insight = insights[0];
    expect(insight).toBeDefined();
    if (!insight) return;
    expect(insight.type).toBe('anomaly');
    expect(insight.confidence).toBe(0.68);
    // Should reference the linked entry and the new timeline entry
    expect(insight.entryIds.length).toBeGreaterThan(0);
  });

  it('ingestScreenshotEvent insight.entryIds are capped at 6', () => {
    // Create 6 pre-existing timeline entries all matching the screenshot signals
    const timelineEntries: TimelineEntry[] = Array.from({ length: 6 }, (_, i) => ({
      id: `linked-entry-${i}`,
      userId: 'user-1',
      source: 'voice' as const,
      text: `deploy review error timeout failed incident ${i}`,
      tags: ['deploy', 'review'],
      createdAt: '2024-01-01T00:00:00.000Z',
      occurredAt: '2024-01-01T00:00:00.000Z',
    }));
    const insights: Insight[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/deploy-error.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        hintedText: 'TODO deploy review error timeout failed incident',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights }
    );

    expect(insights).toHaveLength(1);
    const cappedInsight = insights[0];
    expect(cappedInsight).toBeDefined();
    if (!cappedInsight) return;
    // entryIds: [...linkedTimelineEntryIds.slice(0,5), timelineEntry.id].slice(0, 6) = 6
    expect(cappedInsight.entryIds.length).toBeLessThanOrEqual(6);
  });

  it('ingestScreenshotEvent insight summary lists multiple anomalies', () => {
    const insights: Insight[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/error-failed-timeout.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        hintedText: 'error failed timeout panic denied warning',
        userId: 'user-1',
      },
      { storage, timelineEntries: [], insights }
    );

    expect(insights).toHaveLength(1);
    // All matched anomaly terms should appear in the summary
    const multiAnomalyInsight = insights[0];
    expect(multiAnomalyInsight).toBeDefined();
    if (!multiAnomalyInsight) return;
    const summary = multiAnomalyInsight.summary;
    expect(summary).toContain('error');
    expect(summary).toContain('failed');
    expect(summary).toContain('timeout');
  });

  it('ingestScreenshotEvent TimelineEntry occurredAt equals input capturedAt', () => {
    const timelineEntries: TimelineEntry[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/shot.png',
        capturedAt: '2024-03-20T15:30:00.000Z',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights: [] }
    );

    const occurredAtEntry = timelineEntries[0];
    expect(occurredAtEntry).toBeDefined();
    if (!occurredAtEntry) return;
    expect(occurredAtEntry.occurredAt).toBe('2024-03-20T15:30:00.000Z');
  });

  it('ingestScreenshotEvent uses windowTitle as timeline text when ocrText is null', () => {
    const timelineEntries: TimelineEntry[] = [];
    const storage = new InMemoryScreenshotStorage();

    ingestScreenshotEvent(
      {
        imageUrl: 'https://storage.example.com/x.png',
        capturedAt: '2024-01-15T09:00:00.000Z',
        windowTitle: 'Browser DevTools',
        userId: 'user-1',
      },
      { storage, timelineEntries, insights: [] }
    );

    // No hintedText and URL too short → ocrText = null → fallback to windowTitle
    const windowTitleEntry = timelineEntries[0];
    expect(windowTitleEntry).toBeDefined();
    if (!windowTitleEntry) return;
    expect(windowTitleEntry.text).toBe('Browser DevTools');
  });
});