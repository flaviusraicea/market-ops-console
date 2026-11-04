/**
 * Where the assistant keeps the tab's conversation (features/assistant/conversationStore.ts). Per tab. The key
 * carries the version of the stored shape: a tab left open across a deploy that changes it finds nothing under
 * the new key and starts clean, instead of restoring a record the new code cannot read.
 */
export const CONVERSATION_KEY = "mo.conversation:v1";

/** Forgets the tab's conversation: on sign-out it must not outlive the session. */
export function clearConversation(): void {
  try {
    window.sessionStorage.removeItem(CONVERSATION_KEY);
  } catch {
    // Storage blocked: nothing was stored.
  }
}
