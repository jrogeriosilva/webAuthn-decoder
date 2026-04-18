export function hexToBytes(hex: string): ArrayBuffer {
  const clean =
    hex.startsWith("0x") || hex.startsWith("0X") ? hex.slice(2) : hex;

  if (clean.length === 0) {
    throw new Error("Invalid hex: empty input");
  }

  if (clean.length % 2 !== 0) {
    throw new Error(
      `Invalid hex: odd number of characters (${clean.length})`
    );
  }

  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < clean.length; i += 2) {
    const chunk = clean.substring(i, i + 2);
    if (!/^[0-9a-fA-F]{2}$/.test(chunk)) {
      const badPos = /[^0-9a-fA-F]/.exec(chunk);
      const pos = i + (badPos ? badPos.index : 0);
      throw new Error(`Invalid hex: unexpected character at position ${pos}`);
    }
    bytes[i / 2] = parseInt(chunk, 16);
  }

  return bytes.buffer as ArrayBuffer;
}
