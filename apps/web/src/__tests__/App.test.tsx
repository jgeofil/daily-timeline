import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { App } from '../App';
import { emitScreenshotEvent } from '../lib/screenshotBridge';
import type { ScreenshotEvent } from '@daily-timeline/types';

// Stub fetch globally so the polling effect doesn't throw in jsdom
beforeEach(() => {
  vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('no network in tests')));
});

describe('App component', () => {
  it('renders core headings', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 1, name: /daily timeline/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'TimelineEntry' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'VoiceCaptureSession' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'ScreenshotEvent stream' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 2, name: 'Possible missed detail cards' })).toBeInTheDocument();
  });

  it('shows empty missed-detail placeholder by default', () => {
    render(<App />);
    expect(screen.getByText('No contradictions found yet.')).toBeInTheDocument();
  });

  it('renders starter voice timeline content in JSON preview', () => {
    const { container } = render(<App />);
    const preContents = Array.from(container.querySelectorAll('pre')).map((pre) => pre.textContent ?? '');
    expect(preContents.some((text) => text.includes('"source": "voice"'))).toBe(true);
    expect(preContents.some((text) => text.includes('"id": "voice-session-1"'))).toBe(true);
  });

  it('renders the Insight + DailyReviewSession section heading', () => {
    render(<App />);
    expect(screen.getByRole('heading', { level: 2, name: 'Insight + DailyReviewSession' })).toBeInTheDocument();
  });

  it('displays seedInsight confidence in the JSON preview', () => {
    const { container } = render(<App />);
    const preContents = Array.from(container.querySelectorAll('pre')).map((pre) => pre.textContent ?? '');
    expect(preContents.some((text) => text.includes('"confidence": 0.91'))).toBe(true);
  });

  it('ScreenshotEvent stream pre renders "null" JSON when no events received', () => {
    const { container } = render(<App />);
    // The pre for screenshotEvents[0] ?? null should contain "null"
    const preContents = Array.from(container.querySelectorAll('pre')).map((pre) => pre.textContent ?? '');
    expect(preContents.some((text) => text.trim() === 'null')).toBe(true);
  });

  it('renders exactly 5 sections', () => {
    const { container } = render(<App />);
    const sections = container.querySelectorAll('section');
    expect(sections).toHaveLength(5);
  });

  it('renders a main element with class "app-shell"', () => {
    const { container } = render(<App />);
    expect(container.querySelector('main.app-shell')).toBeInTheDocument();
  });

  it('shows missed-detail card when a screenshot event with anomaly is emitted via bridge', async () => {
    const anomalyEvent: ScreenshotEvent = {
      id: 'bridge-test-shot',
      imageUrl: 'https://example.com/bridge.png',
      capturedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:01.000Z',
      windowTitle: 'Deploy Terminal',
      inferredTask: null,
      ocrText: null,
      entities: [],
      taskClues: [],
      anomalies: ['error'],
      linkedTimelineEntryIds: [],
    };

    render(<App />);

    // Emit via the bridge and flush React effects
    await act(async () => {
      emitScreenshotEvent(anomalyEvent);
    });

    // The missed-detail card should now appear
    expect(screen.queryByText('No contradictions found yet.')).not.toBeInTheDocument();
    expect(screen.getByText('Deploy Terminal')).toBeInTheDocument();
    expect(screen.getByText('Contradiction signal: error')).toBeInTheDocument();
  });

  it('shows missed-detail card when a screenshot event with linkedTimelineEntryIds is emitted', async () => {
    const linkedEvent: ScreenshotEvent = {
      id: 'linked-shot',
      imageUrl: 'https://example.com/linked.png',
      capturedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:01.000Z',
      windowTitle: null,
      inferredTask: null,
      ocrText: null,
      entities: [],
      taskClues: [],
      anomalies: [],
      linkedTimelineEntryIds: ['entry-1'],
    };

    render(<App />);

    await act(async () => {
      emitScreenshotEvent(linkedEvent);
    });

    expect(screen.queryByText('No contradictions found yet.')).not.toBeInTheDocument();
    expect(screen.getByText('Expanded context linked to entries: entry-1')).toBeInTheDocument();
  });

  it('uses "Screenshot context" as card title when windowTitle is null', async () => {
    const noTitleEvent: ScreenshotEvent = {
      id: 'no-title-shot',
      imageUrl: 'https://example.com/notitle.png',
      capturedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:01.000Z',
      windowTitle: null,
      inferredTask: null,
      ocrText: null,
      entities: [],
      taskClues: [],
      anomalies: ['warning'],
      linkedTimelineEntryIds: [],
    };

    render(<App />);

    await act(async () => {
      emitScreenshotEvent(noTitleEvent);
    });

    expect(screen.getByText('Screenshot context')).toBeInTheDocument();
  });

  it('ScreenshotEvent stream pre updates to show the emitted event JSON', async () => {
    const event: ScreenshotEvent = {
      id: 'stream-test',
      imageUrl: 'https://example.com/stream.png',
      capturedAt: '2024-01-01T00:00:00.000Z',
      createdAt: '2024-01-01T00:00:01.000Z',
      windowTitle: 'Stream Test Window',
      inferredTask: null,
      ocrText: 'stream test content',
      entities: [],
      taskClues: [],
      anomalies: [],
      linkedTimelineEntryIds: [],
    };

    const { container } = render(<App />);

    await act(async () => {
      emitScreenshotEvent(event);
    });

    const preContents = Array.from(container.querySelectorAll('pre')).map((pre) => pre.textContent ?? '');
    expect(preContents.some((text) => text.includes('"id": "stream-test"'))).toBe(true);
  });
});