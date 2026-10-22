"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@business-operations/ui/dialog";
import { BankSearchContent } from "../bank-search-content";
type Props = { connectionId: string; provider: string; accessToken: string | null; referenceId: string | null;
 enrollmentId: string | null; institutionId: string | null; existingAccounts: readonly unknown[]; isOpen: boolean;
 onOpenChange: (open: boolean) => void; onAccountsAdded?: () => void };
export function AddBankAccountsModal({ isOpen, onOpenChange }: Props) {
 return <Dialog open={isOpen} onOpenChange={onOpenChange}><DialogContent><DialogHeader><DialogTitle>Connect bank accounts</DialogTitle></DialogHeader><BankSearchContent enabled={isOpen} /></DialogContent></Dialog>;
}
