import { createFileRoute, Link } from "@tanstack/react-router";
import face from "@/assets/doraemon-face.png";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Doraemon — Your AI friend from the future" },
      { name: "description", content: "Ask Doraemon anything. A premium AI chat with a friendly robot cat." },
      { property: "og:title", content: "Doraemon — Your AI friend from the future" },
      { property: "og:description", content: "Ask Doraemon anything. A premium AI chat with a friendly robot cat." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <img src={face} alt="" aria-hidden className="watermark pointer-events-none absolute w-[140vmin] max-w-none" />
      <img src={face} alt="Doraemon" width={1024} height={1024} className="relative size-28 drop-shadow-2xl" />
      <h1 className="relative mt-6 font-display text-5xl font-bold tracking-tight">Doraemon</h1>
      <p className="relative mt-3 max-w-sm text-muted-foreground">
        Your friendly AI companion from the 22nd century. Ask anything — there's a gadget for every question.
      </p>
      <Link
        to="/chat"
        className="bg-send relative mt-8 rounded-full px-8 py-3 font-semibold text-primary-foreground transition-transform hover:scale-105"
      >
        Start chatting
      </Link>
      <div className="relative mt-6 flex items-center gap-2 text-xs text-muted-foreground">
        <span className="size-2 rounded-full bg-collar" />
        <span className="size-2 rounded-full bg-bell" />
        <span className="size-2 rounded-full bg-primary" />
      </div>
    </main>
  );
}
