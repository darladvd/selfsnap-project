/**
 * Upload a canvas blob to S3 via a pre-signed URL from the backend.
 * Fires-and-forgets — errors are logged but won't block the user.
 */
export async function uploadPhoto(
  canvas: HTMLCanvasElement,
  type: "screen" | "print"
): Promise<void> {
  const apiBase = import.meta.env.VITE_API_BASE;
  if (!apiBase) {
    console.warn("VITE_API_BASE not set — skipping upload");
    return;
  }

  // Get pre-signed URL from Lambda
  const res = await fetch(`${apiBase}/upload-url`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type }),
  });

  if (!res.ok) {
    throw new Error(`Failed to get upload URL: ${res.status}`);
  }

  const { url } = await res.json();

  // Convert canvas to blob
  const blob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("Canvas toBlob failed"))),
      "image/png"
    );
  });

  // Upload directly to S3
  const put = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "image/png" },
    body: blob,
  });

  if (!put.ok) {
    throw new Error(`S3 upload failed: ${put.status}`);
  }
}
