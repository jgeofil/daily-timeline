import { describe, it, expect } from "vitest";

type ISODateString = string;

interface DiaryEntry {
  id: string;
  sessionId: string;
  createdAt: ISODateString;
  text: string;
  tags: string[];
  mood?: string;
  [key: string]: unknown;
}

interface TranscriptSegment {
  id: string;
  sessionId: string;
  text: string;
  startAt: number;
  endAt: number;
  speaker?: string;
  [key: string]: unknown;
}

interface ScreenshotEvent {
  id: string;
  sessionId: string;
  timestamp: ISODateString;
  imagePath: string;
  [key: string]: unknown;
}

interface Insight {
  id: string;
  sessionId: string;
  createdAt: ISODateString;
  text: string;
  [key: string]: unknown;
}

interface ProjectContext {
  id: string;
  name: string;
  description?: string;
  [key: string]: unknown;
}

interface TimestampedEvent {
  id: string;
  timestamp: ISODateString;
  type: string;
  [key: string]: unknown;
}

interface DailySession {
  id: string;
  date: ISODateString;
  events: TimestampedEvent[];
  [key: string]: unknown;
}

interface UserCorrection {
  id: string;
  sessionId: string;
  createdAt: ISODateString;
  originalText: string;
  correctedText: string;
  [key: string]: unknown;
}
describe("shared/models types", () => {
  describe("DiaryEntry", () => {
    it("accepts a valid DiaryEntry shape", () => {
      const entry: DiaryEntry = {
        id: "uuid-1",
        sessionId: "session-1",
        createdAt: "2024-01-01T10:00:00Z",
        text: "Today was productive",
        tags: ["work", "focus"]
      };
      expect(entry.id).toBe("uuid-1");
      expect(entry.tags).toHaveLength(2);
    });

    it("allows optional mood field", () => {
      const withMood: DiaryEntry = {
        id: "uuid-2",
        sessionId: "session-1",
        createdAt: "2024-01-01T10:00:00Z",
        text: "Feeling great",
        mood: "happy",
        tags: []
      };
      const withoutMood: DiaryEntry = {
        id: "uuid-3",
        sessionId: "session-1",
        createdAt: "2024-01-01T10:00:00Z",
        text: "Neutral day",
        tags: []
      };
      expect(withMood.mood).toBe("happy");
      expect(withoutMood.mood).toBeUndefined();
    });

    it("supports empty tags array", () => {
      const entry: DiaryEntry = {
        id: "uuid-4",
        sessionId: "session-1",
        createdAt: "2024-01-01T10:00:00Z",
        text: "No tags",
        tags: []
      };
      expect(entry.tags).toEqual([]);
    });
  });

  describe("TranscriptSegment", () => {
    it("accepts 'user' speaker", () => {
      const segment: TranscriptSegment = {
        id: "seg-1",
        sessionId: "session-1",
        startedAt: "2024-01-01T10:00:00Z",
        endedAt: "2024-01-01T10:00:05Z",
        speaker: "user",
        text: "Hello there"
      };
      expect(segment.speaker).toBe("user");
    });

    it("accepts 'assistant' speaker", () => {
      const segment: TranscriptSegment = {
        id: "seg-2",
        sessionId: "session-1",
        startedAt: "2024-01-01T10:00:05Z",
        endedAt: "2024-01-01T10:00:10Z",
        speaker: "assistant",
        text: "How can I help?"
      };
      expect(segment.speaker).toBe("assistant");
    });

    it("allows optional confidence score", () => {
      const withConfidence: TranscriptSegment = {
        id: "seg-3",
        sessionId: "session-1",
        startedAt: "2024-01-01T10:00:00Z",
        endedAt: "2024-01-01T10:00:05Z",
        speaker: "user",
        text: "Test",
        confidence: 0.97
      };
      const withoutConfidence: TranscriptSegment = {
        id: "seg-4",
        sessionId: "session-1",
        startedAt: "2024-01-01T10:00:00Z",
        endedAt: "2024-01-01T10:00:05Z",
        speaker: "user",
        text: "Test"
      };
      expect(withConfidence.confidence).toBe(0.97);
      expect(withoutConfidence.confidence).toBeUndefined();
    });
  });

  describe("ScreenshotEvent", () => {
    it("accepts required fields only", () => {
      const event: ScreenshotEvent = {
        id: "shot-1",
        sessionId: "session-1",
        capturedAt: "2024-01-01T10:00:00Z",
        imagePath: "/tmp/screenshot.png"
      };
      expect(event.imagePath).toBe("/tmp/screenshot.png");
      expect(event.appName).toBeUndefined();
      expect(event.windowTitle).toBeUndefined();
      expect(event.ocrText).toBeUndefined();
    });

    it("accepts all optional fields", () => {
      const event: ScreenshotEvent = {
        id: "shot-2",
        sessionId: "session-1",
        capturedAt: "2024-01-01T10:00:00Z",
        imagePath: "/tmp/screenshot2.png",
        appName: "VSCode",
        windowTitle: "main.ts",
        ocrText: "function foo() {}"
      };
      expect(event.appName).toBe("VSCode");
      expect(event.windowTitle).toBe("main.ts");
      expect(event.ocrText).toBe("function foo() {}");
    });
  });

  describe("Insight", () => {
    it("accepts all valid kind values", () => {
      const kinds: Array<Insight["kind"]> = ["summary", "pattern", "task", "risk"];
      kinds.forEach((kind) => {
        const insight: Insight = {
          id: `ins-${kind}`,
          sessionId: "session-1",
          createdAt: "2024-01-01T10:00:00Z",
          kind,
          content: `${kind} content`,
          sourceEventIds: []
        };
        expect(insight.kind).toBe(kind);
      });
    });

    it("allows optional score", () => {
      const withScore: Insight = {
        id: "ins-1",
        sessionId: "session-1",
        createdAt: "2024-01-01T10:00:00Z",
        kind: "summary",
        content: "Good session",
        score: 0.85,
        sourceEventIds: ["evt-1", "evt-2"]
      };
      expect(withScore.score).toBe(0.85);
      expect(withScore.sourceEventIds).toHaveLength(2);
    });

    it("allows empty sourceEventIds", () => {
      const insight: Insight = {
        id: "ins-2",
        sessionId: "session-1",
        createdAt: "2024-01-01T10:00:00Z",
        kind: "task",
        content: "Fix bug",
        sourceEventIds: []
      };
      expect(insight.sourceEventIds).toEqual([]);
    });
  });

  describe("DailySession", () => {
    it("accepts all valid status values", () => {
      const statuses: Array<DailySession["status"]> = ["active", "review", "closed"];
      statuses.forEach((status) => {
        const session: DailySession = {
          id: `sess-${status}`,
          date: "2024-01-01",
          startedAt: "2024-01-01T08:00:00Z",
          timezone: "UTC",
          status
        };
        expect(session.status).toBe(status);
      });
    });

    it("allows optional endedAt and projectContextId", () => {
      const active: DailySession = {
        id: "sess-1",
        date: "2024-01-01",
        startedAt: "2024-01-01T08:00:00Z",
        timezone: "UTC",
        status: "active"
      };
      const closed: DailySession = {
        id: "sess-2",
        date: "2024-01-01",
        startedAt: "2024-01-01T08:00:00Z",
        endedAt: "2024-01-01T17:00:00Z",
        timezone: "America/New_York",
        projectContextId: "proj-1",
        status: "closed"
      };
      expect(active.endedAt).toBeUndefined();
      expect(active.projectContextId).toBeUndefined();
      expect(closed.endedAt).toBe("2024-01-01T17:00:00Z");
      expect(closed.projectContextId).toBe("proj-1");
    });
  });

  describe("TimestampedEvent", () => {
    it("accepts all valid eventType values", () => {
      const types: Array<TimestampedEvent["eventType"]> = ["activity", "voice", "note", "system"];
      types.forEach((eventType) => {
        const event: TimestampedEvent = {
          id: `evt-${eventType}`,
          sessionId: "session-1",
          eventType,
          occurredAt: "2024-01-01T10:00:00Z",
          payload: { source: "test" }
        };
        expect(event.eventType).toBe(eventType);
      });
    });

    it("accepts arbitrary payload shape", () => {
      const event: TimestampedEvent = {
        id: "evt-1",
        sessionId: "session-1",
        eventType: "activity",
        occurredAt: "2024-01-01T10:00:00Z",
        payload: { app: "browser", url: "https://example.com", duration: 120 }
      };
      expect(event.payload["app"]).toBe("browser");
      expect(event.payload["duration"]).toBe(120);
    });

    it("accepts empty payload", () => {
      const event: TimestampedEvent = {
        id: "evt-2",
        sessionId: "session-1",
        eventType: "system",
        occurredAt: "2024-01-01T10:00:00Z",
        payload: {}
      };
      expect(event.payload).toEqual({});
    });
  });

  describe("ProjectContext", () => {
    it("accepts required fields", () => {
      const ctx: ProjectContext = {
        id: "proj-1",
        projectName: "My Project",
        goals: ["Ship v1", "Get feedback"],
        constraints: ["Budget: $10k"],
        updatedAt: "2024-01-01T10:00:00Z"
      };
      expect(ctx.projectName).toBe("My Project");
      expect(ctx.goals).toHaveLength(2);
    });

    it("allows optional preferredTone", () => {
      const withTone: ProjectContext = {
        id: "proj-2",
        projectName: "Formal Project",
        goals: [],
        constraints: [],
        preferredTone: "professional",
        updatedAt: "2024-01-01T10:00:00Z"
      };
      expect(withTone.preferredTone).toBe("professional");
    });
  });

  describe("UserCorrection", () => {
    it("accepts all valid targetType values", () => {
      const targetTypes: Array<UserCorrection["targetType"]> = ["transcript", "insight", "ocr"];
      targetTypes.forEach((targetType) => {
        const correction: UserCorrection = {
          id: `corr-${targetType}`,
          sessionId: "session-1",
          targetType,
          targetId: "target-1",
          createdAt: "2024-01-01T10:00:00Z",
          correctedValue: "corrected text"
        };
        expect(correction.targetType).toBe(targetType);
      });
    });

    it("allows optional reason", () => {
      const withReason: UserCorrection = {
        id: "corr-1",
        sessionId: "session-1",
        targetType: "transcript",
        targetId: "seg-1",
        createdAt: "2024-01-01T10:00:00Z",
        correctedValue: "I said hello",
        reason: "Misheard word"
      };
      const withoutReason: UserCorrection = {
        id: "corr-2",
        sessionId: "session-1",
        targetType: "ocr",
        targetId: "shot-1",
        createdAt: "2024-01-01T10:00:00Z",
        correctedValue: "function foo()"
      };
      expect(withReason.reason).toBe("Misheard word");
      expect(withoutReason.reason).toBeUndefined();
    });
  });

  describe("ISODateString", () => {
    it("is compatible with regular strings", () => {
      const date: ISODateString = "2024-01-01T10:00:00Z";
      expect(typeof date).toBe("string");
    });
  });
});