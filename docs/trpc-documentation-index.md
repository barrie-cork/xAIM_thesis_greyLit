# tRPC Documentation Index

This document serves as an index for all tRPC-related documentation in the project.

## Core Documentation

| Document | Description |
|----------|-------------|
| [tRPC Onboarding Guide](./trpc-onboarding-guide.md) | Comprehensive guide for new developers |
| [tRPC Best Practices](./trpc-best-practices.md) | Best practices for using tRPC in our application |
| [tRPC Cheat Sheet](./trpc-cheat-sheet.md) | Quick reference for common tRPC patterns |
| [tRPC API Usage Fix](./trpc-api-usage-fix.md) | Documentation of the tRPC API usage fix |

## Utility Components and Hooks

| Resource | Description |
|----------|-------------|
| [Utility Hooks README](../src/hooks/README.md) | Documentation for custom tRPC hooks |
| [Utility Components README](../src/components/utils/README.md) | Documentation for tRPC-related components |
| [TRPCMutationExample](../src/components/utils/TRPCMutationExample.tsx) | Example component demonstrating proper tRPC mutation usage |
| [SearchMutationExample](../src/components/examples/SearchMutationExample.tsx) | Real-world example of tRPC mutation usage |
| [useTRPCMutation](../src/hooks/useTRPCMutation.ts) | Custom hook for standardized mutation handling |
| [MutationStateDisplay](../src/components/utils/MutationStateDisplay.tsx) | Component for displaying mutation states |

## Server-Side Implementation

| File | Description |
|------|-------------|
| [router.ts](../src/server/trpc/router.ts) | Main router that combines all sub-routers |
| [procedures.ts](../src/server/trpc/procedures.ts) | Defines public and protected procedures |
| [context.ts](../src/server/trpc/context.ts) | Creates the context for each request |
| [routers/](../src/server/trpc/routers/) | Directory containing all sub-routers |

## Client-Side Implementation

| File | Description |
|------|-------------|
| [trpc.ts](../src/utils/trpc.ts) | Creates the tRPC client for React components |
| [api.ts](../src/utils/api.ts) | Creates the tRPC client for Next.js |

## Tests

| File | Description |
|------|-------------|
| [TRPCMutationExample.test.tsx](../src/test/components/TRPCMutationExample.test.tsx) | Tests for the TRPCMutationExample component |
| [useTRPCMutation.test.tsx](../src/test/hooks/useTRPCMutation.test.tsx) | Tests for the useTRPCMutation hook |

## External Resources

| Resource | Description |
|----------|-------------|
| [tRPC Documentation](https://trpc.io/docs) | Official tRPC documentation |
| [tRPC GitHub Repository](https://github.com/trpc/trpc) | Official tRPC GitHub repository |
| [Zod Documentation](https://zod.dev/) | Documentation for Zod, used for input validation |
| [React Query Documentation](https://tanstack.com/query/latest/docs/react/overview) | Documentation for React Query, used by tRPC |
