import { timingSafeEqual, createHash } from "node:crypto"

export function extractApiKey(authorization: string | undefined, xApiKey: string | undefined): string | null {
  if (xApiKey && xApiKey.trim()) {
    return xApiKey.trim()
  }
  if (!authorization) return null
  const match = /^Bearer\s+(.+)$/i.exec(authorization.trim())
  if (!match?.[1]) return null
  const key = match[1].trim()
  return key.length > 0 ? key : null
}

export function keyMatches(provided: string, allowed: string[]): boolean {
  const providedBuf = Buffer.from(provided)
  for (const candidate of allowed) {
    const candidateBuf = Buffer.from(candidate)
    if (providedBuf.length !== candidateBuf.length) continue
    if (timingSafeEqual(providedBuf, candidateBuf)) {
      return true
    }
  }
  return false
}

export function keyIdFor(key: string): string {
  const hash = createHash("sha256").update(key).digest("hex")
  return `key-${hash.slice(0, 8)}`
}
