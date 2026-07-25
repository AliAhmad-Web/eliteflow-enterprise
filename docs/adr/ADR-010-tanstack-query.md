# ADR-010: Why TanStack Query

**Status:** Accepted  
**Date:** 2026-07-22  
**Deciders:** Architecture Team

---

## Context

The Enterprise Business Management Web Application frontend fetches data from the Express API across 20+ feature modules — clients, projects, tasks, invoices, reports, dashboard stats, notifications, and more. Each module performs CRUD operations with loading states, error handling, caching, and optimistic updates.

Server state (data from the API) is fundamentally different from UI state (sidebar open/closed, active modal). Mixing both in a single state manager creates complexity, stale data, and unnecessary re-renders.

---

## Problem

We need a server state management solution that can:

- Fetch, cache, and synchronize data from the REST API across 20+ modules
- Handle loading, error, and success states declaratively
- Automatically refetch stale data when the user returns to a page
- Support pagination, infinite scroll, and filtered queries
- Enable optimistic updates for better UX (e.g., marking a task complete instantly)
- Invalidate related queries after mutations (create client → refresh client list)
- Deduplicate identical requests made by multiple components simultaneously
- Integrate with TypeScript for type-safe query responses
- Work seamlessly with React Server Components and Client Components in Next.js App Router

Using `useEffect` + `useState` for data fetching leads to boilerplate, race conditions, and no caching. Using Redux or Zustand for server data conflates two different state concerns.

---

## Decision

We will use **TanStack Query (React Query v5)** for all server state management in the frontend.

Key implementation choices:

- **Query hooks in `features/*/hooks/`** — each feature defines its own query and mutation hooks
- **Centralized query keys** — `constants/query-keys.ts` with a query key factory pattern
- **API calls in `features/*/services/`** — service functions called by query hooks, not directly by components
- **Global `QueryClient`** configured in `lib/react-query.ts` with defaults:
  - `staleTime: 5 minutes` — data considered fresh for 5 minutes
  - `retry: 1` — single retry on failure
  - `refetchOnWindowFocus: true` — refresh data when user returns to tab
- **`QueryClientProvider`** in `components/providers/query-provider.tsx`
- **Mutations** invalidate related queries on success via `queryClient.invalidateQueries()`
- **No server state in Zustand** — TanStack Query owns all API data

### Pattern per feature:

```typescript
// features/clients/hooks/use-clients.ts
export function useClients(filters: ClientFilters) {
  return useQuery({
    queryKey: queryKeys.clients.list(filters),
    queryFn: () => clientsService.getAll(filters),
  });
}

// features/clients/hooks/use-create-client.ts
export function useCreateClient() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsService.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.clients.all });
    },
  });
}
```

---

## Consequences

### Positive

- **Automatic caching** — fetched data cached in memory; no redundant API calls
- **Background refetching** — stale data refreshed silently without loading spinners
- **Declarative loading/error states** — `isLoading`, `isError`, `data` available directly in components
- **Optimistic updates** — UI updates instantly before server confirms
- **Query invalidation** — mutations automatically refresh related data
- **Request deduplication** — multiple components requesting the same data trigger one API call
- **Devtools** — TanStack Query Devtools for debugging cache state in development
- **Pagination support** — `useInfiniteQuery` for infinite scroll lists

### Negative

- **Learning curve** — query keys, stale time, and invalidation patterns require team understanding
- **Cache management** — incorrect invalidation leads to stale UI; must design key hierarchy carefully
- **Bundle size** — ~13 KB gzipped (acceptable for the functionality provided)
- **Server Component boundary** — queries run in Client Components only; Server Components fetch directly

### Neutral

- TanStack Query handles server state; Zustand handles UI state (ADR-011) — clear separation
- Query keys factory in `constants/query-keys.ts` must be maintained as features are added

---

## Alternatives Considered

| Alternative | Reason Rejected |
|-------------|-----------------|
| **Redux Toolkit Query (RTK Query)** | Tied to Redux ecosystem; heavier bundle; Zustand preferred for UI state |
| **SWR** | Less feature-rich; weaker mutation/invalidation support; smaller ecosystem |
| **Apollo Client** | GraphQL-specific; we use REST API; massive bundle size for REST usage |
| **Zustand for server state** | No caching, refetching, or invalidation; wrong tool for async server data |
| **useEffect + useState** | No caching, race conditions, boilerplate in every component |
| **Relay** | Facebook-specific; GraphQL-only; overkill for REST API |

---

## Why This Decision Is Best

TanStack Query is the industry standard for server state management in React applications. For an enterprise app with **20+ modules performing CRUD operations**, manually managing fetch lifecycle, caching, and invalidation in every feature would be hundreds of lines of error-prone boilerplate.

TanStack Query eliminates this entirely. Define a query hook once in `features/clients/hooks/use-clients.ts` — every component that needs client data gets automatic caching, loading states, error handling, and background refetching.

The clear separation between server state (TanStack Query) and UI state (Zustand) prevents the most common state management anti-pattern: putting API response data in a global store and manually syncing it. Each tool does what it is best at.
