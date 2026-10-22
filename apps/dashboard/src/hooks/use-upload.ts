import { useState } from "react";
import { uploadFile } from "@/utils/upload";

interface UploadParams {
  file: File;
  path: string[];
  bucket: string;
  fileName?: string;
}

interface UploadResult {
  url: string;
  path: string[];
}

export function useUpload() {
  const [isLoading, setLoading] = useState<boolean>(false);

  const upload = async ({
    file,
    path,
    bucket,
    fileName,
  }: UploadParams): Promise<UploadResult> => {
    setLoading(true);

    try {
      const result = await uploadFile({ file, path, bucket, fileName });

      if (!result.url) {
        throw new Error("Upload did not return a file link");
      }

      return {
        url: result.url,
        path: result.path,
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    uploadFile: upload,
    isLoading,
  };
}
