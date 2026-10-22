"use client";

import { getDesktopSchemeUrl } from "@business-operations/desktop-client/platform";
import Image from "next/image";
import { useEffect, useRef } from "react";
import { sanitizeRedirectPath } from "@business-operations/utils/sanitize-redirect";
import appIcon from "../../public/appicon.png";

interface CheckoutSuccessDesktopProps {
  redirectPath: string;
}

export function CheckoutSuccessDesktop({
  redirectPath,
}: CheckoutSuccessDesktopProps) {
  const hasRunned = useRef(false);
  const schemeUrl = getDesktopSchemeUrl();
  const destination = sanitizeRedirectPath(redirectPath || "/").slice(1);

  useEffect(() => {
    if (redirectPath && !hasRunned.current) {
      window.location.replace(`${schemeUrl}${destination}`);
      hasRunned.current = true;
    }
  }, [redirectPath, schemeUrl, destination]);

  return (
    <div>
      <div className="h-screen flex flex-col items-center justify-center text-center text-sm text-[#606060]">
        <Image
          src={appIcon}
          width={80}
          height={80}
          alt="Business Operations"
          quality={100}
          className="mb-10"
        />
        <p>Return to Business Operations</p>
        <p className="mb-4">
          If Business Operations doesn't open in a few seconds,{" "}
          <a className="underline" href={`${schemeUrl}${destination}`}>
            click here
          </a>
          .
        </p>
        <p>You may close this browser tab when done</p>
      </div>
    </div>
  );
}
