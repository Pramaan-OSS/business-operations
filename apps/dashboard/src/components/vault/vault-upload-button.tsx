"use client";

import { Button } from "@business-operations/ui/button";
import { Icons } from "@business-operations/ui/icons";

export function VaultUploadButton() {
  return (
    <Button
      variant="outline"
      size="icon"
      onClick={() => document.getElementById("upload-files")?.click()}
    >
      <Icons.Add size={17} />
    </Button>
  );
}
