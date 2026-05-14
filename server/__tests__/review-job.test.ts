import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Insight } from "../../shared/models.js";

// Mock repositories before importing review-job
vi.mock("../storage/repositories.js", () => ({
  appendInsight: vi.fn((input: Omit<Insight, "id">) => ({
    id: "insight-generated-uuid",
    ...input
  }))
}));

import { buildReviewInsight } from "../jobs/review-job";
import { appendInsight } from "../storage/repositories.js";

describe("server/jobs/review-job", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("buildReviewInsight", () => {
    it("calls appendInsight with the provided sessionId", () => {
      buildReviewInsight("session-abc", "Good work today");
      expect(appendInsight).toHaveBeenCalledOnce();
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.sessionId).toBe("session-abc");
    });

    it("calls appendInsight with the provided content", () => {
      buildReviewInsight("session-123", "Focused on deep work");
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.content).toBe("Focused on deep work");
    });

    it("always uses kind 'summary'", () => {
      buildReviewInsight("session-1", "Any content");
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.kind).toBe("summary");
    });

    it("always sets sourceEventIds to an empty array", () => {
      buildReviewInsight("session-1", "Some insight");
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.sourceEventIds).toEqual([]);
    });

    it("sets createdAt to a valid ISO date string", () => {
      const before = new Date().toISOString();
      buildReviewInsight("session-1", "Test insight");
      const after = new Date().toISOString();
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.createdAt).toBeTypeOf("string");
      expect(new Date(call.createdAt).getTime()).not.toBeNaN();
      expect(call.createdAt >= before).toBe(true);
      expect(call.createdAt <= after).toBe(true);
    });

    it("returns the result from appendInsight", () => {
      const mockInsight: Insight = {
        id: "insight-123",
        sessionId: "session-1",
        createdAt: "2024-01-01T10:00:00Z",
        kind: "summary",
        content: "Review complete",
        sourceEventIds: []
      };
      vi.mocked(appendInsight).mockReturnValueOnce(mockInsight);
      const result = buildReviewInsight("session-1", "Review complete");
      expect(result).toEqual(mockInsight);
    });

    it("handles empty content string", () => {
      buildReviewInsight("session-1", "");
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.content).toBe("");
    });

    it("handles content with special characters", () => {
      const content = 'Session included "async/await" patterns & <script>tags</script>';
      buildReviewInsight("session-1", content);
      const call = vi.mocked(appendInsight).mock.calls[0][0];
      expect(call.content).toBe(content);
    });

    it("handles multiple calls independently", () => {
      buildReviewInsight("session-A", "First insight");
      buildReviewInsight("session-B", "Second insight");
      expect(appendInsight).toHaveBeenCalledTimes(2);
      expect(vi.mocked(appendInsight).mock.calls[0][0].sessionId).toBe("session-A");
      expect(vi.mocked(appendInsight).mock.calls[1][0].sessionId).toBe("session-B");
    });
  });
});