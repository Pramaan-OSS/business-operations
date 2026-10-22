"use client";

import { Button } from "@business-operations/ui/button";
import { Icons } from "@business-operations/ui/icons";
import { useChatState } from "@/components/chat/chat-context";

export function NewChatButton({
  variant = "ghost",
}: {
  variant?: "ghost" | "outline";
}) {
  const { setMessages, setInputValue, setChatTitle } = useChatState();

  return (
    <Button
      variant={variant}
      size="icon"
      data-track="Assistant New Chat"
      onClick={() => {
        setMessages([]);
        setInputValue("");
        setChatTitle(null);
      }}
    >
      <Icons.Add className="size-4" />
    </Button>
  );
}
