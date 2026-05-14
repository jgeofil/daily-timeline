import type { TimelineEntry } from '@daily-timeline/types';

function tokenize(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((token) => token.length > 1)
  );
}

export function linkScreenshotToTimeline(
  timelineEntries: TimelineEntry[],
  signals: { ocrText: string | null; windowTitle: string | null; inferredTask: string | null }
): string[] {
  const corpus = [signals.ocrText, signals.windowTitle, signals.inferredTask].filter(Boolean).join(' ');
  if (!corpus) {
    return [];
  }

  const screenshotTokens = tokenize(corpus);

  return timelineEntries
    .map((entry) => ({
      id: entry.id,
      overlap: Array.from(tokenize(`${entry.text} ${entry.tags.join(' ')}`)).filter((token) => screenshotTokens.has(token))
        .length,
    }))
    .filter((match) => match.overlap > 0)
    .sort((a, b) => b.overlap - a.overlap)
    .slice(0, 5)
    .map((match) => match.id);
}
