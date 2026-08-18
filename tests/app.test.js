// Mock browser globals for Node.js test environment
global.window = {
  toggleMuteState: jest.fn(),
  exportSessionLog: jest.fn(),
  addEventListener: jest.fn()
};
global.document = {
  getElementById: jest.fn().mockReturnValue({
    addEventListener: jest.fn(),
    appendChild: jest.fn(),
    querySelector: jest.fn().mockReturnValue({ textContent: "" }),
    querySelectorAll: jest.fn().mockReturnValue([])
  }),
  querySelectorAll: jest.fn().mockReturnValue([]),
  createElement: jest.fn().mockReturnValue({
    classList: { add: jest.fn(), remove: jest.fn() },
    style: {}
  })
};
global.localStorage = {
  getItem: jest.fn().mockReturnValue(null),
  setItem: jest.fn()
};
global.YT = { Player: jest.fn() };

const { INPUT_REELS, RECOMMENDED_LIBRARY } = require("../data.js");
const app = require("../app.js");

describe("ReelFocus AI Dataset Tests", () => {
  test("INPUT_REELS should contain exactly 8 seed reels", () => {
    expect(INPUT_REELS).toBeDefined();
    expect(INPUT_REELS.length).toBe(8);
  });

  test("RECOMMENDED_LIBRARY should contain exactly 16 candidate recommendations", () => {
    expect(RECOMMENDED_LIBRARY).toBeDefined();
    expect(RECOMMENDED_LIBRARY.length).toBe(16);
  });

  test("All reels should have valid properties", () => {
    INPUT_REELS.forEach(reel => {
      expect(reel.id).toBeDefined();
      expect(reel.title).toBeDefined();
      expect(reel.youtube_id).toBeDefined();
      expect(reel.category_weights).toBeDefined();
    });
  });
});

describe("ReelFocus AI Engagement Formula Tests", () => {
  test("Should apply early skip penalty of -0.4 when watch ratio is under 15%", () => {
    const state = { watch_time: 2, loops: 1, comments: [] };
    const reel = { duration: 20 }; // ratio = 0.10 (< 0.15)
    const weight = app.calculateEngagementWeight(state, reel);
    expect(weight).toBe(-0.4);
  });

  test("Should calculate standard engagement weight correctly without extra signals", () => {
    const state = { watch_time: 10, loops: 1, comments: [] };
    const reel = { duration: 20 }; // ratio = 0.50, coef = 1.0, loopMultiplier = 1.0
    const weight = app.calculateEngagementWeight(state, reel);
    expect(weight).toBe(0.5);
  });

  test("Should boost engagement weight for active likes, saves, and shares", () => {
    const state = { watch_time: 10, liked: true, saved: true, shared: true, loops: 1, comments: [] };
    const reel = { duration: 20 }; // ratio = 0.50
    // coefficient = 1.0 + 0.2 (like) + 0.4 (save) + 0.5 (share) = 2.1
    const weight = app.calculateEngagementWeight(state, reel);
    expect(weight).toBeCloseTo(1.05); // 0.5 * 2.1 * 1.0 = 1.05
  });

  test("Should multiply weight for rewatch loops", () => {
    const state = { watch_time: 20, loops: 3, comments: [] };
    const reel = { duration: 20 }; // ratio = 1.0
    // loopMultiplier = 1.0 + 0.5 * (3 - 1) = 2.0
    const weight = app.calculateEngagementWeight(state, reel);
    expect(weight).toBe(2.0); // 1.0 * 1.0 * 2.0 = 2.0
  });

  test("Should boost weight with educational comment keyword multiplier", () => {
    const state = { 
      watch_time: 10, 
      loops: 1, 
      comments: ["I want to learn how this works and find a study tutorial!"] 
    };
    const reel = { duration: 20 }; // ratio = 0.50
    // coefficient = 1.0 + 0.3 (has comments) + 0.2 (learn/tutorial match) = 1.5
    const weight = app.calculateEngagementWeight(state, reel);
    expect(weight).toBeCloseTo(0.75); // 0.5 * 1.5 * 1.0 = 0.75
  });
});

describe("ReelFocus AI Security HTML Escaping Tests", () => {
  test("Should escape special characters to prevent Cross-Site Scripting (XSS)", () => {
    const rawInput = "<script>alert('xss & vulnerability')</script>";
    const escaped = app.escapeHTML(rawInput);
    expect(escaped).toBe("&lt;script&gt;alert(&#039;xss &amp; vulnerability&#039;)&lt;/script&gt;");
  });

  test("Should handle null or empty values gracefully", () => {
    expect(app.escapeHTML(null)).toBe("");
    expect(app.escapeHTML(undefined)).toBe("");
    expect(app.escapeHTML("")).toBe("");
  });
});
