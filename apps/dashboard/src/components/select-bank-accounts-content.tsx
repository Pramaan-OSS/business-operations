"use client";
import { BankSearchContent } from "./bank-search-content";
type Props = { enabled: boolean; onClose: () => void; onComplete?: () => void;
  onSyncStarted?: (data: { runId: string; accessToken: string }) => void; stickySubmit?: boolean; accountsListClassName?: string; fadeGradientClass?: string };
export function SelectBankAccountsContent({ enabled }: Props) { return <BankSearchContent enabled={enabled} />; }
