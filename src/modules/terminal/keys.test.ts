import { describe, expect, it } from "vitest";
import { isShiftEnter } from "./keys";

function keyEvent(overrides: Partial<{
  key: string;
  shiftKey: boolean;
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
}> = {}) {
  return {
    key: "Enter",
    shiftKey: false,
    altKey: false,
    ctrlKey: false,
    metaKey: false,
    ...overrides,
  };
}

describe("isShiftEnter", () => {
  it("matches shift+enter with no other modifiers", () => {
    expect(isShiftEnter(keyEvent({ shiftKey: true }))).toBe(true);
  });

  it("rejects plain enter", () => {
    expect(isShiftEnter(keyEvent())).toBe(false);
  });

  it("rejects enter with any other modifier", () => {
    expect(isShiftEnter(keyEvent({ shiftKey: true, altKey: true }))).toBe(false);
    expect(isShiftEnter(keyEvent({ shiftKey: true, ctrlKey: true }))).toBe(false);
    expect(isShiftEnter(keyEvent({ shiftKey: true, metaKey: true }))).toBe(false);
  });

  it("rejects non-enter keys even with shift", () => {
    expect(isShiftEnter(keyEvent({ key: "Tab", shiftKey: true }))).toBe(false);
  });
});
