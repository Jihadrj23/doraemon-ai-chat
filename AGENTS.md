<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- Chat streams via `src/routes/api/chat.ts` (verifies bearer token, persists UIMessage parts per thread); thread reads/writes go through `src/lib/chat.functions.ts` with `requireSupabaseAuth`. Why: keeps model calls server-side and data scoped to the signed-in user.
- Brand avatars use the body illustration while decorative watermarks use the separate face asset. Why: preserves distinct branding and background roles.
- Voice readouts use browser speech synthesis on explicit clicks, with one active utterance per chat and cancellation on navigation. Why: avoids sending conversation text to an additional service and prevents overlapping audio.
- Both chat entry and thread routes use a shared retryable load-error view. Why: failed network reads must not leave a blank chat or silently appear as an empty conversation.
