/**
 * Client-side image compression & safe network fetch helpers
 * Prevents HTTP 413 (Payload Too Large) when uploading high-res mobile photos.
 */

export interface CompressImageOptions {
  maxDimension?: number;
  quality?: number;
}

/**
 * Compresses an image File or Blob to a JPEG Data URL.
 * Downscales images exceeding maxDimension (default 1280px) and applies JPEG compression (default 0.78).
 * Reduces 10MB+ smartphone camera photos to ~150KB–250KB (>97% size reduction)
 * while preserving detail for computer vision and emergency triage.
 */
export async function compressImage(
  file: File | Blob,
  options?: CompressImageOptions,
): Promise<string> {
  const maxDimension = options?.maxDimension ?? 1280;
  const quality = options?.quality ?? 0.78;

  if (typeof window === "undefined") {
    throw new Error("compressImage can only run in a browser environment");
  }

  // 1. Try modern createImageBitmap with orientation handling (Safari 15+, Chrome, Firefox, Edge)
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(file);
      let { width, height } = bitmap;

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(bitmap, 0, 0, width, height);
        bitmap.close?.();
        return canvas.toDataURL("image/jpeg", quality);
      }
      bitmap.close?.();
    } catch (e) {
      // Fall through to Image element approach
      console.warn("createImageBitmap compression failed, falling back to Image element:", e);
    }
  }

  // 2. Fallback using HTMLImageElement + canvas
  return new Promise<string>((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let { naturalWidth: width, naturalHeight: height } = img;
      if (!width || !height) {
        width = img.width;
        height = img.height;
      }

      if (width > maxDimension || height > maxDimension) {
        const ratio = Math.min(maxDimension / width, maxDimension / height);
        width = Math.max(1, Math.round(width * ratio));
        height = Math.max(1, Math.round(height * ratio));
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // Fallback to reading raw file
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error("Failed to process image"));
        reader.readAsDataURL(file);
        return;
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(img, 0, 0, width, height);

      try {
        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrl);
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      // Fail-safe: read raw data if image element fails
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("Could not read image file"));
      reader.readAsDataURL(file);
    };

    img.src = objectUrl;
  });
}

/**
 * Safely parses an API response as JSON, preventing SyntaxError crashes when
 * servers or edge proxies return non-JSON responses (e.g. 413 Request Entity Too Large,
 * 502 Bad Gateway, 504 Gateway Timeout).
 */
export async function safeFetchJson<T>(
  response: Response,
  fallbackErrorMessage = "Request failed",
): Promise<{ ok: boolean; status: number; data?: T; error?: string }> {
  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.toLowerCase().includes("application/json");

  if (isJson) {
    try {
      const data = (await response.json()) as T & { error?: string };
      if (!response.ok) {
        return {
          ok: false,
          status: response.status,
          error: (data && typeof data === "object" && "error" in data && typeof data.error === "string" && data.error)
            ? data.error
            : `${fallbackErrorMessage} (${response.status})`,
        };
      }
      return { ok: true, status: response.status, data };
    } catch {
      // JSON parse failed despite header; continue to text recovery
    }
  }

  // Non-JSON response (e.g. 413, 500, 502, 504)
  const rawText = await response.text().catch(() => "");

  if (response.status === 413 || /request entity too large|payload too large/i.test(rawText)) {
    return {
      ok: false,
      status: response.status,
      error: "The photo or attachment is too large for the network. Please choose a smaller photo.",
    };
  }

  if (!response.ok) {
    const cleanSnippet = rawText.replace(/<[^>]*>?/gm, "").trim();
    return {
      ok: false,
      status: response.status,
      error:
        cleanSnippet.length > 0 && cleanSnippet.length < 160
          ? cleanSnippet
          : `${fallbackErrorMessage} (Server status ${response.status})`,
    };
  }

  return {
    ok: false,
    status: response.status,
    error: "Unexpected response format from server.",
  };
}
