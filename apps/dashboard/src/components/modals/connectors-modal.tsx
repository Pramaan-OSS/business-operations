"use client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@business-operations/ui/dialog";
import { Apps } from "@/components/apps";
export function ConnectorsModal({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="max-h-[85vh] overflow-auto"><DialogHeader><DialogTitle>Connected apps</DialogTitle></DialogHeader><Apps /></DialogContent></Dialog>;
}
