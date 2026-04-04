import { describe, it, expect } from "vitest";
import {
  FIXED_DT,
  MAX_ACCUMULATED_SEC,
  MAX_STEPS_PER_FRAME,
  boundedSimDeltaSeconds,
} from "./fixedTimestep";

describe("boundedSimDeltaSeconds", () => {
  it("scales by game speed and clamps huge deltas", () => {
    expect(boundedSimDeltaSeconds(100, 1)).toBeCloseTo(0.1, 5);
    expect(boundedSimDeltaSeconds(1000, 1)).toBe(MAX_ACCUMULATED_SEC);
    expect(boundedSimDeltaSeconds(500, 2)).toBe(MAX_ACCUMULATED_SEC);
    expect(boundedSimDeltaSeconds(60_000, 1)).toBe(MAX_ACCUMULATED_SEC);
  });

  it("returns 0 for non-positive input", () => {
    expect(boundedSimDeltaSeconds(0, 1)).toBe(0);
    expect(boundedSimDeltaSeconds(-100, 1)).toBe(0);
    expect(boundedSimDeltaSeconds(100, 0)).toBe(0);
  });
});

describe("fixed-step guard rails", () => {
  it("never runs more than MAX_STEPS_PER_FRAME per consumed batch", () => {
    let accumulator = FIXED_DT * 20;
    let steps = 0;
    while (accumulator >= FIXED_DT && steps < MAX_STEPS_PER_FRAME) {
      accumulator -= FIXED_DT;
      steps += 1;
    }
    expect(steps).toBe(MAX_STEPS_PER_FRAME);
    expect(accumulator).toBeCloseTo(FIXED_DT * 15, 5);
  });
});
