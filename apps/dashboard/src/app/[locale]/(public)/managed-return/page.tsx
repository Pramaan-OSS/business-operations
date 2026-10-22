import { ManagedSignInReturn } from "@/components/managed-sign-in-return";
export const dynamic = "force-dynamic";
export default function Page() { return <ManagedSignInReturn authUrl={process.env.MANAGED_AUTH_URL || ""} />; }
