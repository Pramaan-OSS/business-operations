import type { ReactNode } from "react";
type KnownClient = { icon: ReactNode; developerName: string; website: string };
/** A registered name alone does not establish the developer's identity. */
export function getKnownClient(_appName: string): KnownClient | null { return null; }
