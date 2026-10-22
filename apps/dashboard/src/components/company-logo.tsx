"use client";

import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@business-operations/ui/avatar";
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@business-operations/ui/card";
import { Spinner } from "@business-operations/ui/spinner";
import { stripSpecialCharacters } from "@business-operations/utils";
import { useEffect, useRef, useState } from "react";
import { useTeamMutation, useTeamQuery } from "@/hooks/use-team";
import { useUpload } from "@/hooks/use-upload";

export function CompanyLogo() {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isLoading, uploadFile } = useUpload();
  const { data } = useTeamQuery();
  const updateTeam = useTeamMutation();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    setReady(true);
  }, []);
  const busy = isLoading || updateTeam.isPending;

  const handleUpload = async (evt: React.ChangeEvent<HTMLInputElement>) => {
    const { files } = evt.target;
    const selectedFile = files as FileList;
    if (!selectedFile?.[0]) return;

    const filename = stripSpecialCharacters(selectedFile[0]?.name ?? "");

    setError("");
    try {
      const { url } = await uploadFile({
        bucket: "apps",
        path: [data?.id ?? ""],
        fileName: filename,
        file: selectedFile[0] as File,
      });

      if (url) {
        await updateTeam.mutateAsync({ logoUrl: url });
      }
    } catch {
      setError("The company image could not be saved. Try again.");
    }
  };

  return (
    <Card>
      <div className="flex justify-between items-center pr-6">
        <CardHeader>
          <CardTitle>Company logo</CardTitle>
          <CardDescription>
            This is your company's logo. Click on the logo to upload a custom
            one from your files.
          </CardDescription>
        </CardHeader>

        <button
          type="button"
          aria-label="Upload company logo"
          disabled={!ready || busy}
          onClick={() => inputRef.current?.click()}
        >
          <Avatar className="rounded-none w-16 h-16 flex items-center justify-center bg-accent cursor-pointer">
            {busy ? (
              <Spinner className="h-4 w-4" />
            ) : (
              <>
                <AvatarImage
                  src={data?.logoUrl ?? undefined}
                  alt={data?.name ?? undefined}
                  width={64}
                  height={64}
                />
                <AvatarFallback>
                  <span className="text-md">{data?.name?.charAt(0)}</span>
                </AvatarFallback>
              </>
            )}
          </Avatar>
        </button>
        <input
          ref={inputRef}
          type="file"
          aria-label="Company logo image"
          disabled={!ready || busy}
          style={{ display: "none" }}
          multiple={false}
          onChange={handleUpload}
        />
        {error && <p role="alert">{error}</p>}
      </div>
      <CardFooter>An avatar is optional but strongly recommended.</CardFooter>
    </Card>
  );
}
