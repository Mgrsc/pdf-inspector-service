import type { ErrorHandler } from "hono"
import { AppError } from "../lib/errors"
import type { AuthVariables } from "./auth"

export const errorHandler: ErrorHandler<{ Variables: AuthVariables }> = (err, c) => {
  const requestId = c.get("requestId") ?? "unknown"

  if (err instanceof AppError) {
    return c.json(
      {
        error: {
          code: err.code,
          message: err.message,
          requestId,
          ...(err.details !== undefined ? { details: err.details } : {}),
        },
      },
      err.status as 400,
    )
  }

  console.error(
    JSON.stringify({
      level: "error",
      msg: "Unhandled error",
      requestId,
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    }),
  )

  return c.json(
    {
      error: {
        code: "internal_error",
        message: "An unexpected error occurred",
        requestId,
      },
    },
    500,
  )
}
