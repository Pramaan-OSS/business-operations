import { Avatar, AvatarFallback, AvatarImage } from "@business-operations/ui/avatar";
import { cn } from "@business-operations/ui/cn";
import { useState } from "react";

type Props = {
  src: string | null;
  alt: string;
  size?: number;
};

export function BankLogo({ src, alt, size = 34 }: Props) {
  const [hasError, setHasError] = useState(false);
  const showingFallback = !src || hasError;

  return (
    <Avatar
      style={{ width: size, height: size }}
      className={cn(!showingFallback && "border border-border")}
    >
      {src && !hasError ? (
        <AvatarImage
          src={src}
          alt={alt}
          className="object-contain bg-white"
          onError={() => setHasError(true)}
        />
      ) : (
        <AvatarImage
          src={`/api/logo?name=${encodeURIComponent(alt)}`}
          alt={alt}
          className="object-contain"
        />
      )}
      <AvatarFallback>
        {alt.slice(0, 1).toUpperCase()}
      </AvatarFallback>
    </Avatar>
  );
}
