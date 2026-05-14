import { useEffect, useMemo, useState } from 'react';
import type { DailyReviewSession, Insight, ScreenshotEvent, TimelineEntry, VoiceCaptureSession } from '@daily-timeline/types';
import { listenForScreenshotEvents } from './lib/screenshotBridge';

const seedTimelineEntries: TimelineEntry[] = [
  {
    id: 'entry-1',
    userId: 'user-1',
    source: 'voice',
    createdAt: new Date().toISOString(),
    occurredAt: new Date().toISOString(),
    text: 'Drafted product architecture and wrote implementation notes.',
    tags: ['architecture', 'planning']
  }
];

const voiceSession: VoiceCaptureSession = {
  id: 'voice-session-1',
  entryIds: seedTimelineEntries.map((entry) => entry.id),
  startedAt: new Date().toISOString(),
  endedAt: null,
  language: 'en-US',
  state: 'capturing'
};

const seedInsight: Insight = {
  id: 'insight-1',
  entryIds: seedTimelineEntries.map((entry) => entry.id),
  confidence: 0.91,
  createdAt: new Date().toISOString(),
  summary: 'Planning work is concentrated in the first half of the day.',
  type: 'pattern'
};

const review: DailyReviewSession = {
  id: 'review-1',
  date: new Date().toISOString().slice(0, 10),
  startedAt: new Date().toISOString(),
  completedAt: null,
  insightIds: [seedInsight.id],
  status: 'in_progress'
};

export function App() {
  const [timelineEntries, setTimelineEntries] = useState<TimelineEntry[]>(seedTimelineEntries);
  const [screenshotEvents, setScreenshotEvents] = useState<ScreenshotEvent[]>([]);

  useEffect(() => {
    const stopListening = listenForScreenshotEvents((event) => {
      setScreenshotEvents((prev) => [event, ...prev]);
    });

    const poll = async (): Promise<void> => {
      try {
        const response = await fetch('/screenshots/events');
        if (!response.ok) return;
        const body = (await response.json()) as { data: ScreenshotEvent[] };
        setScreenshotEvents((prev) => {
          // Server data is authoritative for ordering, but preserve locally-received
          return [...body.data, ...prev.filter((e) => !body.data.some((s) => s.id === e.id))];
        });
      } catch {
        // no-op in local demo mode
      }
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, 3000);

    return () => {
      stopListening();
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    const screenshotDerived = screenshotEvents.map<TimelineEntry>((event) => ({
      id: `screenshot-${event.id}`,
      userId: 'user-1',
      source: 'screenshot',
      createdAt: event.createdAt,
      occurredAt: event.capturedAt,
      text: event.ocrText ?? event.windowTitle ?? 'Screenshot captured',
      tags: ['screenshot', ...event.taskClues.slice(0, 2)]
    }));

    setTimelineEntries([...screenshotDerived, ...seedTimelineEntries]);
  }, [screenshotEvents]);

  const missedDetailCards = useMemo(
    () =>
      screenshotEvents
        .filter((event) => event.anomalies.length > 0 || event.linkedTimelineEntryIds.length > 0)
        .map((event) => ({
          id: event.id,
          title: event.windowTitle ?? 'Screenshot context',
          detail:
            event.anomalies.length > 0
              ? `Contradiction signal: ${event.anomalies.join(', ')}`
              : `Expanded context linked to entries: ${event.linkedTimelineEntryIds.join(', ')}`
        })),
    [screenshotEvents]
  );

  return (
    <main className="app-shell">
      <header>
        <h1>Daily Timeline</h1>
        <p>Rolling canvas UI starter for timeline capture and review.</p>
      </header>

      <section>
        <h2>TimelineEntry</h2>
        <pre>{JSON.stringify(timelineEntries[0], null, 2)}</pre>
      </section>

      <section>
        <h2>VoiceCaptureSession</h2>
        <pre>{JSON.stringify(voiceSession, null, 2)}</pre>
      </section>

      <section>
        <h2>ScreenshotEvent stream</h2>
        <pre>{JSON.stringify(screenshotEvents[0] ?? null, null, 2)}</pre>
      </section>

      <section>
        <h2>Possible missed detail cards</h2>
        {missedDetailCards.length === 0 ? (
          <p>No contradictions found yet.</p>
        ) : (
          <ul>
            {missedDetailCards.map((card) => (
              <li key={card.id}>
                <strong>{card.title}</strong>
                <p>{card.detail}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2>Insight + DailyReviewSession</h2>
        <pre>{JSON.stringify({ insight: seedInsight, review }, null, 2)}</pre>
      </section>
    </main>
  );
}
