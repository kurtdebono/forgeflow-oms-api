import { describe, expect, it } from "vitest";
import { parsePageParam } from "./pagination";

describe("parsePageParam (QA edge cases)", () => {
  it.each([
    ["2147483647", 2147483647],
    ["2147483648", 1],
    ["99999999999999999999", 1],
    ["007", 1],
    ["+2", 1],
    ["2.0", 1],
    ["1e1", 1],
    ["0x10", 1],
    [" 2", 1],
    ["2 ", 1],
    ["", 1],
    ["١٢", 1],
  ])("maps %j to %i", (input, expected) => {
    expect(parsePageParam(input)).toBe(expected);
  });

  it("treats a repeated param (array) as page 1", () => {
    expect(parsePageParam(["2", "3"])).toBe(1);
  });
});
