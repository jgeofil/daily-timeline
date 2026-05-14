export interface ScreenshotAnalysisInput {
  imageUrl: string;
  windowTitle: string | null;
  hintedText?: string | null;
}

export interface ScreenshotAnalysis {
  ocrText: string | null;
  entities: string[];
  taskClues: string[];
  anomalies: string[];
  inferredTask: string | null;
}

const ENTITY_PATTERN = /\b([A-Z][a-zA-Z0-9_-]{2,})\b/g;
const TASK_CLUE_TERMS = ['todo', 'fixme', 'deploy', 'incident', 'deadline', 'review', 'ticket', 'pr'];
const ANOMALY_TERMS = ['error', 'failed', 'warning', 'panic', 'denied', 'timeout'];

function hasWholeTerm(text: string, term: string): boolean {
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`\\b${escaped}\\b`, 'i').test(text);
}

export function extractOcrText(input: ScreenshotAnalysisInput): string | null {
  if (input.hintedText && input.hintedText.trim().length > 0) {
    return input.hintedText.trim();
  }

  let decodedImageUrl: string;
  try {
    decodedImageUrl = decodeURIComponent(input.imageUrl);
  } catch {
    decodedImageUrl = input.imageUrl;
  }

  const fromUrl = decodedImageUrl.replace(/[-_]/g, ' ');
  const match = fromUrl.match(/[a-zA-Z0-9\s]{12,}/);
  return match ? match[0].trim() : null;
}

export function analyzeScreenshot(input: ScreenshotAnalysisInput): ScreenshotAnalysis {
  const ocrText = extractOcrText(input);
  const contextText = [input.windowTitle, ocrText].filter(Boolean).join(' ');

  const entities = Array.from(new Set(contextText.match(ENTITY_PATTERN) ?? [])).slice(0, 8);

  const taskClues = TASK_CLUE_TERMS.filter((term) => hasWholeTerm(contextText, term));
  const anomalies = ANOMALY_TERMS.filter((term) => hasWholeTerm(contextText, term));

  const inferredTask =
    taskClues.length > 0
      ? `Working on ${taskClues[0]} workflow`
      : entities.length > 0
        ? `Investigating ${entities[0]}`
        : null;

  return { ocrText, entities, taskClues, anomalies, inferredTask };
}
