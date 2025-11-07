import { createHash } from "crypto";

export function sha256Hex(s: string): string {
  return createHash("sha256").update(s).digest("hex");
}

export function commitHex(serverSeed: string, nonce: string) {
  return sha256Hex(`${serverSeed}:${nonce}`);
}

export function combinedSeedHex(serverSeed: string, clientSeed: string, nonce: string) {
  return sha256Hex(`${serverSeed}:${clientSeed}:${nonce}`);
}

/** take first 4 bytes of hex (big-endian) → uint32 */
export function seed32FromCombined(bigEndianHex: string): number {
  const b0 = parseInt(bigEndianHex.slice(0, 2), 16);
  const b1 = parseInt(bigEndianHex.slice(2, 4), 16);
  const b2 = parseInt(bigEndianHex.slice(4, 6), 16);
  const b3 = parseInt(bigEndianHex.slice(6, 8), 16);
  return ((b0 << 24) | (b1 << 16) | (b2 << 8) | b3) >>> 0;
}
