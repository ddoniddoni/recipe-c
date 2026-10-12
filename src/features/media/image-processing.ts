import "server-only";
import sharp from "sharp";
import { createHash } from "node:crypto";

export class InvalidImageError extends Error {}
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;

function inputFormat(bytes: Buffer) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "jpeg";
  if (bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    // Reject APNG even when a decoder would silently render its first frame.
    for (let offset = 8; offset + 12 <= bytes.length;) {
      const length = bytes.readUInt32BE(offset);
      if (length > bytes.length - offset - 12) throw new InvalidImageError();
      if (bytes.toString("ascii", offset + 4, offset + 8) === "acTL") throw new InvalidImageError();
      offset += length + 12;
    }
    return "png";
  }
  if (bytes.toString("ascii", 0, 4) === "RIFF" && bytes.toString("ascii", 8, 12) === "WEBP") {
    for (let offset = 12; offset + 8 <= bytes.length;) {
      const chunk = bytes.toString("ascii", offset, offset + 4);
      const length = bytes.readUInt32LE(offset + 4);
      if (length > bytes.length - offset - 8 || chunk === "ANIM" || chunk === "ANMF") throw new InvalidImageError();
      offset += length + 8 + length % 2;
    }
    return "webp";
  }
  throw new InvalidImageError();
}

export async function processRecipeImage(bytes: Buffer) {
  if (!bytes.length || bytes.length > MAX_UPLOAD_BYTES) throw new InvalidImageError();
  const format = inputFormat(bytes);
  const options = { limitInputPixels: 20_000_000, failOn: "warning" as const, animated: true };
  let metadata: sharp.Metadata;
  try { metadata = await sharp(bytes, options).timeout({ seconds: 5 }).metadata(); }
  catch { throw new InvalidImageError(); }
  if (metadata.format !== format || !metadata.width || !metadata.height || (metadata.pages ?? 1) !== 1
    || metadata.width > 6000 || metadata.height > 6000 || metadata.width * metadata.height > 20_000_000) {
    throw new InvalidImageError();
  }
  for (const size of [1600, 1200, 960]) {
    let output: { data: Buffer; info: sharp.OutputInfo };
    try {
      output = await sharp(bytes, options).autoOrient().resize(size, size, { fit: "inside", withoutEnlargement: true })
        .webp({ quality: 78, effort: 4 }).timeout({ seconds: 8 }).toBuffer({ resolveWithObject: true });
    } catch { throw new InvalidImageError(); }
    // No keepMetadata/withMetadata: remove EXIF, GPS, XMP and user metadata.
    if (output.data.length <= 1024 * 1024) return {
      bytes: output.data, width: output.info.width, height: output.info.height,
      sha256: createHash("sha256").update(output.data).digest("hex"),
    };
  }
  throw new InvalidImageError();
}
