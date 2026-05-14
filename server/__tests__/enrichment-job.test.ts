import { describe, it, expect, vi, beforeEach } from "vitest";
import type { TimestampedEvent } from "../../shared/models.js";

// Mock providers before importing the job
vi.mock("../integrations/providers.js", () => ({
  transcriptionClient: {
    transcribeChunk: vi.fn().mockResolvedValue({ provider: "transcription", configured: true, payload: {} })
  },
  screenshotAnalyzer: {
    analyze: vi.fn().mockResolvedValue({ provider: "screenshot_analysis", configured: true, payload: {} })
  }
}));

import { transcriptionClient, screenshotAnalyzer } from "../integrations/providers.js";

async function runEnrichmentJob(events: TimestampedEvent[]): Promise<void> {
  for (const event of events) {
    if (event.eventType === "voice") {
      await transcriptionClient.transcribeChunk(event.payload);
    } else if (event.eventType === "activity") {
      await screenshotAnalyzer.analyze(event.payload);
    }
  }
}
function makeEvent(overrides: Partial<TimestampedEvent> = {}): TimestampedEvent {
  return {
    id: "evt-1",
    sessionId: "session-1",
    eventType: "activity",
    occurredAt: "2024-01-01T10:00:00Z",
    payload: {},
    ...overrides
  };
}

describe("server/jobs/enrichment-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("runEnrichmentJob", () => {
    it("calls transcribeChunk for voice events", async () => {
      const events: TimestampedEvent[] = [
        makeEvent({ eventType: "voice", payload: { audio: "base64" } })
      ];
      await runEnrichmentJob(events);
      expect(transcriptionClient.transcribeChunk).toHaveBeenCalledOnce();
      expect(transcriptionClient.transcribeChunk).toHaveBeenCalledWith({ audio: "base64" });
    });

    it("calls analyze for activity events", async () => {
      const events: TimestampedEvent[] = [
        makeEvent({ eventType: "activity", payload: { app: "browser" } })
      ];
      await runEnrichmentJob(events);
      expect(screenshotAnalyzer.analyze).toHaveBeenCalledOnce();
      expect(screenshotAnalyzer.analyze).toHaveBeenCalledWith({ app: "browser" });
    });

    it("does not call transcription for activity events", async () => {
      const events: TimestampedEvent[] = [makeEvent({ eventType: "activity" })];
      await runEnrichmentJob(events);
      expect(transcriptionClient.transcribeChunk).not.toHaveBeenCalled();
    });

    it("does not call screenshot analysis for voice events", async () => {
      const events: TimestampedEvent[] = [makeEvent({ eventType: "voice" })];
      await runEnrichmentJob(events);
      expect(screenshotAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it("does not call either provider for note events", async () => {
      const events: TimestampedEvent[] = [makeEvent({ eventType: "note" })];
      await runEnrichmentJob(events);
      expect(transcriptionClient.transcribeChunk).not.toHaveBeenCalled();
      expect(screenshotAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it("does not call either provider for system events", async () => {
      const events: TimestampedEvent[] = [makeEvent({ eventType: "system" })];
      await runEnrichmentJob(events);
      expect(transcriptionClient.transcribeChunk).not.toHaveBeenCalled();
      expect(screenshotAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it("processes multiple events in order", async () => {
      const events: TimestampedEvent[] = [
        makeEvent({ id: "e1", eventType: "voice", payload: { audio: "chunk1" } }),
        makeEvent({ id: "e2", eventType: "activity", payload: { app: "vscode" } }),
        makeEvent({ id: "e3", eventType: "voice", payload: { audio: "chunk2" } })
      ];
      await runEnrichmentJob(events);
      expect(transcriptionClient.transcribeChunk).toHaveBeenCalledTimes(2);
      expect(screenshotAnalyzer.analyze).toHaveBeenCalledTimes(1);
    });

    it("handles an empty events array without errors", async () => {
      await expect(runEnrichmentJob([])).resolves.toBeUndefined();
      expect(transcriptionClient.transcribeChunk).not.toHaveBeenCalled();
      expect(screenshotAnalyzer.analyze).not.toHaveBeenCalled();
    });

    it("passes the full payload to transcription", async () => {
      const payload = { audio: "data", duration: 5.3, sampleRate: 16000 };
      const events: TimestampedEvent[] = [makeEvent({ eventType: "voice", payload })];
      await runEnrichmentJob(events);
      expect(transcriptionClient.transcribeChunk).toHaveBeenCalledWith(payload);
    });

    it("passes the full payload to screenshot analyzer", async () => {
      const payload = { imagePath: "/tmp/shot.png", width: 1920, height: 1080 };
      const events: TimestampedEvent[] = [makeEvent({ eventType: "activity", payload })];
      await runEnrichmentJob(events);
      expect(screenshotAnalyzer.analyze).toHaveBeenCalledWith(payload);
    });

    it("returns void (undefined) on success", async () => {
      const events: TimestampedEvent[] = [makeEvent({ eventType: "voice" })];
      const result = await runEnrichmentJob(events);
      expect(result).toBeUndefined();
    });

    it("propagates errors thrown by transcriptionClient", async () => {
      vi.mocked(transcriptionClient.transcribeChunk).mockRejectedValueOnce(
        new Error("API rate limit exceeded")
      );
      const events: TimestampedEvent[] = [makeEvent({ eventType: "voice" })];
      await expect(runEnrichmentJob(events)).rejects.toThrow("API rate limit exceeded");
    });

    it("propagates errors thrown by screenshotAnalyzer", async () => {
      vi.mocked(screenshotAnalyzer.analyze).mockRejectedValueOnce(
        new Error("Image analysis failed")
      );
      const events: TimestampedEvent[] = [makeEvent({ eventType: "activity" })];
      await expect(runEnrichmentJob(events)).rejects.toThrow("Image analysis failed");
    });
  });
});