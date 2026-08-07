import { describe, expect, test } from "bun:test"
import { parsePagesParam } from "../src/lib/pages"
import { AppError } from "../src/lib/errors"

describe("parsePagesParam", () => {
  test("parses list and ranges", () => {
    expect(parsePagesParam("0,2,5-7")).toEqual([0, 2, 5, 6, 7])
  })

  test("returns undefined for empty", () => {
    expect(parsePagesParam(undefined)).toBeUndefined()
    expect(parsePagesParam("")).toBeUndefined()
  })

  test("rejects invalid tokens", () => {
    expect(() => parsePagesParam("a")).toThrow(AppError)
  })
})
