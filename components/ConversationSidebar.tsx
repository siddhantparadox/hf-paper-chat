import React, { useMemo, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Id } from "../convex/_generated/dataModel";
import { cn } from "@/lib/utils";

type Props = {
  activeConversationId: Id<"conversations"> | null;
  onSelectConversation: (conversationId: Id<"conversations">, paperId: string) => void;
};

export function ConversationSidebar({ activeConversationId, onSelectConversation }: Props) {
  const conversations = useQuery(api.conversations.listForUser, {});
  const [collapsed, setCollapsed] = useState(false);

  const sortedConversations = useMemo(
    () =>
      conversations
        ? [...conversations].sort((a, b) => b.lastUserMessageAt.localeCompare(a.lastUserMessageAt))
        : [],
    [conversations],
  );

  if (collapsed) {
    return (
      <div className="h-full w-12 flex flex-col items-center justify-between py-3">
        <button
          type="button"
          onClick={() => setCollapsed(false)}
          className="size-10 border-2 border-black bg-white shadow-neo-sm hover:bg-gray-50 font-black"
          aria-label="Expand conversations sidebar"
        >
          ›
        </button>
        <div className="text-xs font-black tracking-widest rotate-90 select-none text-gray-600">CHATS</div>
        <div className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="h-full w-72 flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b-2 border-black bg-white">
        <span className="font-black text-sm uppercase tracking-wide">Conversations</span>
        <button
          type="button"
          onClick={() => setCollapsed(true)}
          className="size-10 border-2 border-black bg-white shadow-neo-sm hover:bg-gray-50 font-black"
          aria-label="Collapse conversations sidebar"
        >
          ‹
        </button>
      </div>

      <div className="flex-1 overflow-y-auto bg-white">
        {conversations === undefined ? (
          <div className="p-4 text-sm font-bold text-gray-600">Loading conversations...</div>
        ) : sortedConversations.length === 0 ? (
          <div className="p-4 text-sm font-bold text-gray-600">
            No conversations yet. Send a message in a paper to start one.
          </div>
        ) : (
          sortedConversations.map((c) => (
            <button
              key={c._id}
              type="button"
              onClick={() => onSelectConversation(c._id, c.paperId)}
              className={cn(
                "w-full text-left px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors",
                c._id === activeConversationId && "bg-hf-yellow",
              )}
            >
              <div className="text-sm font-black truncate" title={c.paperTitle}>
                {c.paperTitle}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-xs font-bold text-gray-600">
                <span className="truncate">ARXIV: {c.paperId}</span>
                <span className="shrink-0">{new Date(c.lastUserMessageAt).toLocaleDateString()}</span>
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
