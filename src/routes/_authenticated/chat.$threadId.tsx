import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { History, LogOut, Mic, MicOff, Plus, SquarePen, Settings, Trash2, ArrowUp, Paperclip } from "lucide-react";

import face from "@/assets/doraemon-face.png";
import { supabase } from "@/integrations/supabase/client";
import { createThread, deleteThread, getThreadMessages, listThreads } from "@/lib/chat.functions";
import { Conversation, ConversationContent, ConversationScrollButton } from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputFooter,
  PromptInputProvider,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputTools,
  usePromptInputAttachments,
  usePromptInputController,
  type PromptInputMessage,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/chat/$threadId")({
  head: () => ({
    meta: [
      { title: "Chat — Doraemon" },
      { name: "description", content: "Your conversation with Doraemon." },
      { property: "og:title", content: "Chat — Doraemon" },
      { property: "og:description", content: "Your conversation with Doraemon." },
    ],
  }),
  loader: ({ params }) => getThreadMessages({ data: { id: params.threadId } }),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Plan a fun weekend for me",
  "Explain black holes simply",
  "Help me write a kind message",
  "Which gadget would fix my homework?",
];

function ChatPage() {
  const { threadId } = Route.useParams();
  const initial = Route.useLoaderData();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [historyOpen, setHistoryOpen] = useState(false);

  const threads = useQuery({ queryKey: ["threads"], queryFn: () => listThreads() });

  useEffect(() => {
    if (!initial.found) navigate({ to: "/chat", replace: true });
  }, [initial.found, navigate]);

  async function newChat() {
    try {
      const { id } = await createThread();
      await qc.invalidateQueries({ queryKey: ["threads"] });
      setHistoryOpen(false);
      navigate({ to: "/chat/$threadId", params: { threadId: id } });
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  async function removeThread(id: string) {
    await deleteThread({ data: { id } });
    await qc.invalidateQueries({ queryKey: ["threads"] });
    if (id === threadId) navigate({ to: "/chat" });
  }

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="relative flex h-dvh flex-col overflow-hidden">
      {/* Watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center" aria-hidden>
        <img src={face} alt="" className="watermark w-[110vmin] max-w-[820px]" />
      </div>

      {/* Header */}
      <header className="glass-strong relative z-10 flex items-center justify-between border-x-0 border-t-0 px-4 py-3">
        <Link to="/" className="flex items-center gap-2.5">
          <span className="relative">
            <img src={face} alt="Doraemon" width={1024} height={1024} className="size-9" />
            <span className="absolute -right-0.5 -bottom-0.5 size-2.5 rounded-full border-2 border-background bg-bell" />
          </span>
          <span className="font-display text-xl font-bold tracking-tight">Doraemon</span>
        </Link>
        <div className="flex items-center gap-1">
          <IconBtn label="Chat history" onClick={() => setHistoryOpen(true)}>
            <History className="size-5" />
          </IconBtn>
          <IconBtn label="New chat" onClick={newChat}>
            <SquarePen className="size-5" />
          </IconBtn>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button aria-label="Settings" className="grid size-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-accent hover:text-bell">
                <Settings className="size-5" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="glass-strong">
              <DropdownMenuLabel>Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-collar focus:text-collar">
                <LogOut className="size-4" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent side="left" className="glass-strong w-80 border-r">
          <SheetHeader>
            <SheetTitle className="font-display text-xl">Your chats</SheetTitle>
          </SheetHeader>
          <div className="px-4">
            <button onClick={newChat} className="bg-send flex w-full items-center justify-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold text-primary-foreground">
              <Plus className="size-4" /> New chat
            </button>
          </div>
          <nav className="mt-3 flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {threads.data?.map((t) => (
              <div
                key={t.id}
                className={cn(
                  "group flex items-center rounded-xl transition-colors hover:bg-accent",
                  t.id === threadId && "bg-accent ring-1 ring-bell/40",
                )}
              >
                <Link
                  to="/chat/$threadId"
                  params={{ threadId: t.id }}
                  onClick={() => setHistoryOpen(false)}
                  className="min-w-0 flex-1 truncate px-3 py-2.5 text-sm"
                >
                  {t.title}
                </Link>
                <button
                  aria-label="Delete chat"
                  onClick={() => removeThread(t.id)}
                  className="mr-1 grid size-8 place-items-center rounded-lg text-muted-foreground hover:text-collar"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
            ))}
          </nav>
        </SheetContent>
      </Sheet>

      {initial.found && <ChatWindow key={threadId} threadId={threadId} initialMessages={JSON.parse(initial.messages) as UIMessage[]} />}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-label={label}
      title={label}
      onClick={onClick}
      className="grid size-10 place-items-center rounded-full text-foreground/80 transition-colors hover:bg-accent hover:text-bell"
    >
      {children}
    </button>
  );
}

function ChatWindow({ threadId, initialMessages }: { threadId: string; initialMessages: UIMessage[] }) {
  const qc = useQueryClient();
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: { threadId },
        headers: async (): Promise<Record<string, string>> => {
          const { data } = await supabase.auth.getSession();
          const token = data.session?.access_token;
          return token ? { Authorization: `Bearer ${token}` } : {};
        },
      }),
    [threadId],
  );

  const { messages, sendMessage, status, stop } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (e) => toast.error(e.message || "Something went wrong"),
    onFinish: () => qc.invalidateQueries({ queryKey: ["threads"] }),
  });

  const busy = status === "submitted" || status === "streaming";

  function handleSubmit(msg: PromptInputMessage) {
    if (busy) return;
    const text = msg.text.trim();
    if (!text && msg.files.length === 0) return;
    sendMessage({ text, files: msg.files });
  }

  return (
    <PromptInputProvider>
      <Conversation className="relative z-0 flex-1">
        <ConversationContent className="mx-auto w-full max-w-3xl gap-5 px-4 pt-6 pb-40">
          {messages.length === 0 ? (
            <EmptyState onPick={(t) => sendMessage({ text: t })} />
          ) : (
            messages.map((m) => (
              <Message from={m.role} key={m.id}>
                {m.role === "assistant" && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                    <img src={face} alt="" className="size-5" /> Doraemon
                  </div>
                )}
                <MessageContent
                  className={cn(
                    "glass rounded-2xl px-4 py-3 text-[15px] leading-relaxed",
                    "group-[.is-user]:bg-glass group-[.is-user]:text-foreground group-[.is-user]:rounded-br-md group-[.is-user]:border-primary/40",
                    "group-[.is-assistant]:rounded-tl-md",
                  )}
                >
                  {m.parts.map((part, i) => {
                    if (part.type === "text")
                      return m.role === "assistant" ? (
                        <MessageResponse key={i}>{part.text}</MessageResponse>
                      ) : (
                        <p key={i} className="whitespace-pre-wrap">{part.text}</p>
                      );
                    if (part.type === "file" && part.mediaType?.startsWith("image/"))
                      return <img key={i} src={part.url} alt={part.filename ?? "attachment"} className="max-h-56 rounded-xl" />;
                    if (part.type === "file")
                      return <span key={i} className="text-xs text-muted-foreground">📎 {part.filename}</span>;
                    return null;
                  })}
                </MessageContent>
              </Message>
            ))
          )}
          {status === "submitted" && (
            <div className="flex items-center gap-2 text-sm">
              <img src={face} alt="" className="size-5 animate-bounce" />
              <Shimmer>Doraemon is searching his pocket…</Shimmer>
            </div>
          )}
        </ConversationContent>
        <ConversationScrollButton className="bottom-32" />
      </Conversation>

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 px-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto max-w-3xl">
          <PromptInput
            onSubmit={handleSubmit}
            accept="image/*"
            multiple
            className="glass-strong rounded-[1.75rem] shadow-2xl [&_[data-slot=input-group]]:rounded-[1.75rem] [&_[data-slot=input-group]]:border-glass-border [&_[data-slot=input-group]]:bg-transparent"
          >
            <PromptInputTextarea placeholder="Ask Doraemon anything..." autoFocus className="min-h-12 px-4 pt-3.5 text-[15px] placeholder:text-muted-foreground" />
            <PromptInputFooter className="px-2 pb-2">
              <PromptInputTools>
                <AttachButton />
              </PromptInputTools>
              <div className="flex items-center gap-1.5">
                <VoiceButton />
                <PromptInputSubmit
                  status={status}
                  onStop={stop}
                  className="bg-send size-10 rounded-full text-primary-foreground hover:opacity-90"
                >
                  {busy ? undefined : <ArrowUp className="size-5" />}
                </PromptInputSubmit>
              </div>
            </PromptInputFooter>
          </PromptInput>
        </div>
      </div>
    </PromptInputProvider>
  );
}

function AttachButton() {
  const att = usePromptInputAttachments();
  return (
    <PromptInputButton
      aria-label="Add attachment"
      onClick={() => att.openFileDialog()}
      className="size-10 rounded-full text-foreground/80 hover:text-bell"
    >
      {att.files.length > 0 ? (
        <span className="flex items-center gap-1 text-xs font-bold text-bell">
          <Paperclip className="size-4" />
          {att.files.length}
        </span>
      ) : (
        <Plus className="size-5" />
      )}
    </PromptInputButton>
  );
}

type SpeechRec = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
};

function VoiceButton() {
  const { textInput } = usePromptInputController();
  const [listening, setListening] = useState(false);
  const recRef = useRef<SpeechRec | null>(null);
  const baseRef = useRef("");

  function toggle() {
    if (listening) {
      recRef.current?.stop();
      return;
    }
    const W = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) {
      toast.error("Voice input isn't supported in this browser.");
      return;
    }
    const rec = new Ctor();
    rec.lang = navigator.language || "en-US";
    rec.interimResults = true;
    rec.continuous = false;
    baseRef.current = textInput.value ? textInput.value + " " : "";
    rec.onresult = (e) => {
      let t = "";
      for (let i = 0; i < e.results.length; i++) t += e.results[i]?.[0]?.transcript ?? "";
      textInput.setInput(baseRef.current + t);
    };
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  }

  return (
    <PromptInputButton
      aria-label={listening ? "Stop voice input" : "Voice input"}
      onClick={toggle}
      className={cn("size-10 rounded-full text-foreground/80 hover:text-bell", listening && "bg-collar text-destructive-foreground animate-pulse")}
    >
      {listening ? <MicOff className="size-5" /> : <Mic className="size-5" />}
    </PromptInputButton>
  );
}

function EmptyState({ onPick }: { onPick: (t: string) => void }) {
  return (
    <div className="flex flex-col items-center pt-10 text-center">
      <img src={face} alt="Doraemon" width={1024} height={1024} className="size-20 drop-shadow-xl" />
      <h2 className="mt-4 font-display text-3xl font-bold">Hi, I'm Doraemon!</h2>
      <p className="mt-2 max-w-xs text-sm text-muted-foreground">What can I pull out of my 4D pocket for you today?</p>
      <div className="mt-6 grid w-full max-w-md grid-cols-1 gap-2 sm:grid-cols-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onPick(s)}
            className="glass rounded-2xl px-4 py-3 text-left text-sm transition-all hover:border-bell/50 hover:text-bell"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  );
}
