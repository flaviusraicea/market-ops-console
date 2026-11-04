import { QueryClient } from "@tanstack/react-query";

let client: QueryClient | null = null;

/**
 * The one client for the alert rules, made on first use and kept for the life of the page. It lives here, above
 * the collapsible section, rather than inside the body the section mounts and unmounts: a save still in flight when
 * the section folds keeps its cache, its rollback and its failure, so the notice is there when the section opens
 * again. Module-level and lazy, so it still loads with the alerts chunk and never with the first paint.
 */
export function getAlertsQueryClient(): QueryClient {
  return (client ??= new QueryClient());
}
