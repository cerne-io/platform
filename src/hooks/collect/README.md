
# Form Data Handling Hooks

## Current Architecture (TanStack Query)

This directory uses **TanStack Query** for modern, efficient form data management with automatic caching, background refetching, and optimized performance.

## Active Hooks

### Modern Data Fetching (TanStack Query)
- **`useFormDataQuery`** (in `src/hooks/queries/`) - Primary hook for fetching form data with TanStack Query
- **`useFormDataWithQuery`** - Wrapper providing form data with query capabilities
- **`form-cache/useFormDataCache.ts`** - Caching utilities
- **`form-fetch/useFormDataFetchUtils.ts`** - Fetch utilities
- **`utils/formLoadingUtils.ts`** - Shared utility functions (logging, defaults)

### Form Containers
- **`AuthenticatedFormContainer2.tsx`** - Modern authenticated form using TanStack Query
- **`PublicFormContainer2.tsx`** - Public form container

## Key Features

### Conditional Question Display
Forms now intelligently display only the question type (slider or triangle) selected during the design phase:
- **Design Phase**: User selects question format in Step 6
- **Forms**: Automatically show only the selected question type
- **Backward Compatible**: Projects without a selection show both types

### TanStack Query Benefits
- ✅ **Automatic caching** - Data cached and reused across components
- ✅ **Background refetching** - Keeps data fresh automatically
- ✅ **Request deduplication** - Multiple requests = single fetch
- ✅ **Built-in loading/error states** - Standardized async handling
- ✅ **Optimistic updates** - UI updates before server confirms

## Directory Structure

```
hooks/collect/
├── form-cache/          # Caching functionality
│   └── useFormDataCache.ts
├── form-fetch/          # Fetch utilities
│   └── useFormDataFetchUtils.ts
├── form-submission/     # Form submission logic
├── utils/               # Shared utilities
│   └── formLoadingUtils.ts
└── index.ts            # Public exports
```

## Usage Example

```tsx
import { useFormDataWithQuery } from "@/hooks/collect/useFormDataWithQuery";

const MyFormComponent = ({ projectId }) => {
  const formData = useFormDataWithQuery(projectId, false);
  
  if (formData.isLoading) return <LoadingState />;
  
  return (
    <FormProvider
      initialValues={{
        storyQuestion: formData.storyQuestion,
        sliderQuestions: formData.sliderQuestions,
        participantQuestions: formData.participantQuestions,
        triangleQuestions: formData.triangleQuestions,
      }}
      onSubmit={handleSubmit}
    >
      <StoryForm />
    </FormProvider>
  );
};
```

## Recent Changes

### November 2024 - Legacy Code Cleanup
- ✅ Removed all legacy manual data fetching hooks
- ✅ Consolidated to single TanStack Query approach
- ✅ Deleted ~500+ lines of duplicate code
- ✅ Simplified architecture and maintenance

### Removed (Legacy)
- ~~`useFormDataLoader`~~ - Replaced by TanStack Query
- ~~`useFormDataFetcher`~~ - Replaced by TanStack Query  
- ~~`useFormDataHelper`~~ - Functionality moved to utilities
- ~~`useFormCache`~~ - Replaced by `form-cache/useFormDataCache`
- ~~`form-load/` directory~~ - Consolidated into `utils/`

## Migration Guide

If you have old code references:

| Old Hook | New Approach |
|----------|-------------|
| `useFormDataLoader` | `useFormDataWithQuery` |
| `useFormDataFetcher` | `useFormDataQuery` |
| `useFormDataHelper` | Use `form-fetch/useFormDataFetchUtils` |
| `useFormCache` | Use `form-cache/useFormDataCache` |

## Contributing

When adding new form-related features:
1. Use `useFormDataQuery` from `hooks/queries/useFormDataQuery.ts`
2. Follow TanStack Query patterns for caching and state management
3. Avoid creating new manual data fetching hooks
4. Add utility functions to `utils/formLoadingUtils.ts` if needed
