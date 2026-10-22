// Client-side uploads: plain requests to this app's own upload endpoint,
// which stores files through the local storage module. No direct-to-host
// uploads. Supabase is used only for the session token, like every other
// authenticated call.
import { createClient } from "@business-operations/supabase/client";
import { stripSpecialCharacters } from "@business-operations/utils";

type UploadParams = {
  file: File;
  path: string[];
  bucket: string;
  fileName?: string;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
};

async function sessionToken(): Promise<string | undefined> {
  const client = createClient();
  const {
    data: { session },
  } = await client.auth.getSession();
  return session?.access_token;
}

function apiBase(): string {
  return (process.env.NEXT_PUBLIC_API_URL || "http://localhost:3002").replace(
    /\/+$/,
    "",
  );
}

/** Upload one file with progress callbacks. */
export async function uploadFile({
  file,
  path,
  bucket,
  onProgress,
  fileName,
}: UploadParams): Promise<{ filename: string; path: string[]; url?: string; file: File }> {
  const filename = stripSpecialCharacters(fileName || file.name);
  const folder = [...path].join("/");
  const token = await sessionToken();

  let storedPath = [...path, filename];
  const url = await new Promise<string | undefined>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open(
      "POST",
      `${apiBase()}/files/upload?bucket=${encodeURIComponent(bucket)}&folder=${encodeURIComponent(folder)}&filename=${encodeURIComponent(filename)}&contentType=${encodeURIComponent(file.type || "application/octet-stream")}`,
    );
    if (token) request.setRequestHeader("Authorization", `Bearer ${token}`);
    request.setRequestHeader("Content-Type", "application/octet-stream");
    request.upload.onprogress = (event) => {
      onProgress?.(event.loaded, event.total);
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        try {
          const body = JSON.parse(request.responseText) as { url?: string; path?: string[] };
          if (!body.path?.length) throw new Error("The file path was not returned.");
          storedPath = body.path;
          resolve(body.url);
        } catch {
          reject(new Error("The upload result could not be confirmed."));
        }
      } else {
        reject(new Error(`Upload failed (${request.status})`));
      }
    };
    request.onerror = () => reject(new Error("Upload failed"));
    request.send(file);
  });

  return { filename, path: storedPath, url, file };
}
