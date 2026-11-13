export function isWebp(bytes: Uint8Array) {
  if (bytes.length < 12) return false;
  const ascii = (from: number, to: number) => String.fromCharCode(...bytes.slice(from, to));
  return ascii(0, 4) === "RIFF" && ascii(8, 12) === "WEBP";
}

const coverTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function fileToCoverWebp(file: File) {
  if (!coverTypes.has(file.type) || file.size < 1 || file.size > 12 * 1024 * 1024) {
    throw new Error("Elige una imagen JPG, PNG o WebP de hasta 12 MB.");
  }
  const bitmap = await createImageBitmap(file);
  try {
    if (bitmap.width < 1 || bitmap.height < 1 || bitmap.width * bitmap.height > 24_000_000) {
      throw new Error("Esa imagen es demasiado grande para prepararla.");
    }
    const side = Math.min(bitmap.width, bitmap.height);
    const output = Math.min(1200, side);
    const originX = Math.floor((bitmap.width - side) / 2);
    const originY = Math.floor((bitmap.height - side) / 2);
    const canvas = document.createElement("canvas");
    canvas.width = output;
    canvas.height = output;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("No pudimos preparar la imagen.");
    context.drawImage(bitmap, originX, originY, side, side, 0, 0, output, output);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.82));
    if (!blob || blob.type !== "image/webp" || blob.size < 1) {
      throw new Error("No pudimos comprimir la imagen a WebP.");
    }
    const base = file.name.replace(/\.[^.]+$/, "").replace(/[^\w.-]+/g, "-").slice(0, 80) || "portada";
    return new File([blob], `${base}.webp`, { type: "image/webp" });
  } finally {
    bitmap.close();
  }
}
