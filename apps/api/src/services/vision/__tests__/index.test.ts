import { describe, expect, it } from 'vitest';
import { analyzeScreenshot, extractOcrText } from '../index';

describe('extractOcrText', () => {
  it('returns trimmed hintedText when provided', () => {
    const result = extractOcrText({
      imageUrl: 'https://example.com/img.png',
      windowTitle: null,
      hintedText: '  some hint text  ',
    });
    expect(result).toBe('some hint text');
  });

  it('falls through to URL-based extraction when hintedText is null', () => {
    const result = extractOcrText({
      imageUrl: 'https://storage.example.com/my-long-screenshot-file.png',
      windowTitle: null,
      hintedText: null,
    });
    // URL segment "my-long-screenshot-file" → replace dashes → "my long screenshot file" = 23 chars
    expect(result).not.toBeNull();
    expect(result).toContain('screenshot');
  });

  it('falls through to URL-based extraction when hintedText is undefined', () => {
    const result = extractOcrText({
      imageUrl: 'https://storage.example.com/deploy-error-dashboard.png',
      windowTitle: null,
    });
    expect(result).not.toBeNull();
    expect(result).toContain('deploy');
  });

  it('returns null when hintedText is whitespace-only', () => {
    // whitespace-only hintedText: trim().length === 0 → falls through to URL
    // URL segment too short (< 12 chars): returns null
    const result = extractOcrText({
      imageUrl: 'https://example.com/img.png',
      windowTitle: null,
      hintedText: '   ',
    });
    // "img" only 3 chars, no 12-char run in URL path
    expect(result).toBeNull();
  });

  it('returns null when URL has no segment long enough (< 12 chars)', () => {
    const result = extractOcrText({
      imageUrl: 'https://cdn.io/x.png',
      windowTitle: null,
      hintedText: null,
    });
    expect(result).toBeNull();
  });

  it('decodes percent-encoded URL before extraction', () => {
    const result = extractOcrText({
      imageUrl: 'https://storage.example.com/deploy%20error%20screenshot.png',
      windowTitle: null,
      hintedText: null,
    });
    // Decoded: "deploy error screenshot" → length > 12
    expect(result).not.toBeNull();
    expect(result).toContain('deploy');
  });

  it('handles an undecodable URL gracefully and falls back to raw URL', () => {
    // malformed percent-encoding should make decodeURIComponent throw
    const result = extractOcrText({
      imageUrl: 'https://example.com/%E0%A4%A/this-long-enough-fallback.png',
      windowTitle: null,
      hintedText: null,
    });
    // fallback should still extract from raw URL path
    expect(result).not.toBeNull();
    expect(result).toContain('fallback');
  });

  it('returns hintedText even when a URL would also yield text', () => {
    const result = extractOcrText({
      imageUrl: 'https://storage.example.com/deploy-error-dashboard.png',
      windowTitle: 'VSCode',
      hintedText: 'important manual hint',
    });
    expect(result).toBe('important manual hint');
  });
});

describe('analyzeScreenshot', () => {
  it('detects all TASK_CLUE_TERMS present in hintedText', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: null,
      hintedText: 'fixme deadline review ticket pr deploy incident todo',
    });
    expect(result.taskClues).toContain('todo');
    expect(result.taskClues).toContain('fixme');
    expect(result.taskClues).toContain('deploy');
    expect(result.taskClues).toContain('review');
    expect(result.taskClues).toContain('incident');
    expect(result.taskClues).toContain('deadline');
    expect(result.taskClues).toContain('ticket');
    expect(result.taskClues).toContain('pr');
  });

  it('detects all ANOMALY_TERMS present in hintedText', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: null,
      hintedText: 'error failed warning panic denied timeout',
    });
    expect(result.anomalies).toContain('error');
    expect(result.anomalies).toContain('failed');
    expect(result.anomalies).toContain('warning');
    expect(result.anomalies).toContain('panic');
    expect(result.anomalies).toContain('denied');
    expect(result.anomalies).toContain('timeout');
  });

  it('sets inferredTask to null when there are no clues and no entities', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/x.png',
      windowTitle: null,
      hintedText: null,
    });
    expect(result.inferredTask).toBeNull();
  });

  it('infers task from first taskClue when clues are present', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: null,
      hintedText: 'TODO fix the bug',
    });
    expect(result.inferredTask).toMatch(/Working on todo workflow/i);
  });

  it('infers task from first entity when no task clues but entities are present', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'Kubernetes Dashboard overview',
      hintedText: null,
    });
    // "Kubernetes" and "Dashboard" match ENTITY_PATTERN (start with capital letter, len >= 3)
    expect(result.inferredTask).toMatch(/Investigating/i);
  });

  it('extracts entities matching capital-letter pattern', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'VSCode Terminal',
      hintedText: null,
    });
    expect(result.entities).toContain('VSCode');
    expect(result.entities).toContain('Terminal');
  });

  it('returns at most 8 unique entities', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'Alpha Beta Gamma Delta Epsilon Zeta Eta Theta Iota',
      hintedText: null,
    });
    expect(result.entities.length).toBeLessThanOrEqual(8);
  });

  it('deduplicates repeated entities', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'VSCode VSCode VSCode',
      hintedText: null,
    });
    const vscodeCount = result.entities.filter((e) => e === 'VSCode').length;
    expect(vscodeCount).toBe(1);
  });

  it('returns empty taskClues and anomalies when context has no matching terms', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'Music Player',
      hintedText: 'listening to jazz',
    });
    expect(result.taskClues).toHaveLength(0);
    expect(result.anomalies).toHaveLength(0);
  });

  it('returns ocrText from hintedText in the analysis result', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: null,
      hintedText: 'review pull request changes',
    });
    expect(result.ocrText).toBe('review pull request changes');
  });

  it('is case-insensitive for task clue and anomaly detection', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'ERROR FAILED WARNING',
      hintedText: null,
    });
    expect(result.anomalies).toContain('error');
    expect(result.anomalies).toContain('failed');
    expect(result.anomalies).toContain('warning');
  });

  it('URL underscores are replaced with spaces during extraction', () => {
    const result = extractOcrText({
      imageUrl: 'https://example.com/deploy_error_screenshot_view.png',
      windowTitle: null,
      hintedText: null,
    });
    // underscores replaced to spaces, resulting string > 12 chars
    expect(result).not.toBeNull();
    expect(result).toContain('deploy');
  });

  it('windowTitle and ocrText both contribute to contextText for clue detection', () => {
    // windowTitle has "error" (anomaly), hintedText has "todo" (task clue)
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'Error Log Viewer',
      hintedText: 'TODO fix this',
    });
    expect(result.anomalies).toContain('error');
    expect(result.taskClues).toContain('todo');
  });

  it('task clue priority follows TASK_CLUE_TERMS order (first term wins inferredTask)', () => {
    // TASK_CLUE_TERMS = ['todo', 'fixme', 'deploy', ...]; 'fixme' comes before 'deploy'
    // but 'todo' is first in the list — if text has both 'todo' and 'deploy', inferredTask uses 'todo'
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: null,
      hintedText: 'todo deploy review',
    });
    expect(result.inferredTask).toBe('Working on todo workflow');
  });

  it('entities from windowTitle and ocrText are combined and deduplicated', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://example.com/img.png',
      windowTitle: 'VSCode Editor',
      hintedText: 'VSCode opened new Terminal tab',
    });
    // VSCode appears in both windowTitle and hintedText; should only appear once
    const vscodeCount = result.entities.filter((e) => e === 'VSCode').length;
    expect(vscodeCount).toBe(1);
    expect(result.entities).toContain('Terminal');
  });

  it('returns ocrText as null when URL path has no 12-char alphanumeric run and hintedText is null', () => {
    const result = analyzeScreenshot({
      imageUrl: 'https://x.io/a/b.png',
      windowTitle: null,
      hintedText: null,
    });
    expect(result.ocrText).toBeNull();
  });
});
