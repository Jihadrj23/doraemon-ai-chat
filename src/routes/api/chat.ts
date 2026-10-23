import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { convertToModelMessages, type UIMessage } from "ai";
import type { Database } from "@/integrations/supabase/types";
import { createResponsesCall } from "@/lib/ai/responses";
import { withLovableAiGatewayRunIdHeader } from "@/lib/ai/run-id";

const SYSTEM = `You are Doraemon, the friendly robot cat from the 22nd century. You are warm, playful, encouraging and genuinely helpful. Occasionally (not every message) reference a fitting gadget from your 4D pocket in a fun way, but always give clear, accurate, practical answers. Use markdown for structure when useful.`;

function userClient(token: string) {
  const url = process.env['SUPABASE_URL']!;
  const key = process.env['SUPABASE_PUBLISHABLE_KEY']!;
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const headers = new Headers(init?.headers);
        headers.set("apikey", key);
        headers.set("Authorization", `Bearer ${token}`);
        return fetch(input, { ...init, headers });
      },
    },
  });
}

function textOf(m: UIMessage) {
  return m.parts.map((p) => (p.type === "text" ? p.text : "")).join(" ").trim();
}

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
        if (!token) return new Response("Unauthorized", { status: 401 });
        const sb = userClient(token);
        const { data: userData, error: userErr } = await sb.auth.getUser(token);
        if (userErr || !userData.user) return new Response("Unauthorized", { status: 401 });

        const body = (await request.json()) as { messages: UIMessage[]; threadId: string };
        const { messages, threadId } = body;
        if (!Array.isArray(messages) || !threadId) return new Response("Bad request", { status: 400 });

        const { data: thread } = await sb.from("threads").select("id,title").eq("id", threadId).maybeSingle();
        if (!thread) return new Response("Thread not found", { status: 404 });

        const last = messages[messages.length - 1];
        if (last?.role === "user") {
          const { error } = await sb.from("messages").upsert(
            { thread_id: threadId, message_id: last.id, role: "user", parts: last.parts as never },
            { onConflict: "thread_id,message_id" },
          );
          if (error) console.error("save user msg", error);
          const patch: { updated_at: string; title?: string } = { updated_at: new Date().toISOString() };
          if (thread.title === "New chat") patch.title = textOf(last).slice(0, 60) || "New chat";
          await sb.from("threads").update(patch).eq("id", threadId);
        }

        const apiKey = process.env['LOVABLE_API_KEY'];
        if (!apiKey) return new Response("AI not configured", { status: 500 });

        const { result, runIdFetch } = createResponsesCall(
          request,
          { baseURL: "https://ai.gateway.lovable.dev/v1", apiKey, model: "openai/gpt-6-astra" },
          await convertToModelMessages(messages),
          SYSTEM,
        );

        const response = result.toUIMessageStreamResponse({
          originalMessages: messages,
          sendReasoning: true,
          onFinish: async ({ responseMessage }) => {
            const { error } = await sb.from("messages").upsert(
              {
                thread_id: threadId,
                message_id: responseMessage.id,
                role: "assistant",
                parts: responseMessage.parts as never,
              },
              { onConflict: "thread_id,message_id" },
            );
            if (error) console.error("save assistant msg", error);
          },
          onError: (err) => {
            const status = (err as { statusCode?: number })?.statusCode;
            if (status === 429) return "Doraemon is a bit busy — please try again in a moment.";
            if (status === 402) return "AI credits are used up. Please add credits to keep chatting.";
            return "Something went wrong. Please try again.";
          },
        });
        return withLovableAiGatewayRunIdHeader(response, runIdFetch);
      },
    },
  },
});
