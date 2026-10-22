"use client";
import { useState } from "react";
import { Button } from "@business-operations/ui/button";
import { ConnectorsModal } from "@/components/modals/connectors-modal";
export function ConnectorsBar() { const [open, setOpen] = useState(false); return <><Button variant="ghost" onClick={() => setOpen(true)}>Connect apps</Button><ConnectorsModal open={open} onOpenChange={setOpen} /></>; }
