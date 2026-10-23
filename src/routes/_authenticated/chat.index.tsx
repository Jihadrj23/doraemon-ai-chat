import { createFileRoute, redirect } from "@tanstack/react-router";
import { createThread, listThreads } from "@/lib/chat.functions";

export const Route = createFileRoute("/_authenticated/chat/")({
  head: () => ({
    meta: [
      { title: "Chat — Doraemon" },
      { name: "description", content: "Start a conversation with Doraemon." },
      { property: "og:title", content: "Chat — Doraemon" },
      { property: "og:description", content: "Start a conversation with Doraemon." },
    ],
  }),
  loader: async () => {
    const threads = await listThreads();
    const id = threads[0]?.id ?? (await createThread()).id;
    throw redirect({ to: "/chat/$threadId", params: { threadId: id }, replace: true });
  },
});
