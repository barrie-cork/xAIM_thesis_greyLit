# Search Result Filtering

This document explains how to configure and use the filtering system to include or exclude search results based on various criteria.

## Overview

The filtering system allows you to define sets of rules (`FilterSet`) that are applied to search results. Each `FilterSet` contains multiple filter conditions (`FilterConfig`) that specify criteria for matching results.

## Filter Sets (`FilterSet`)

A `FilterSet` groups multiple filter conditions together and controls whether the set is active.

```typescript
// Example FilterSet structure (from src/lib/search/filtering/types.ts)
export interface FilterSet {
  id: string;          // Unique identifier for the set (e.g., "block-social-media")
  name: string;        // User-friendly name (e.g., "Block Social Media Sites")
  description?: string; // Optional description
  filters: FilterConfig[]; // Array of filter conditions
  junction: FilterJunction; // How filters combine: AND | OR (currently applies implicitly as AND in implementation)
  enabled: boolean;    // Is this filter set active?
}

export enum FilterJunction {
  AND = 'and',
  OR = 'or',
}
```

- **`junction`**: Determines if *all* (`AND`) rules or *any* (`OR`) rule in the `filters` array must match for the set's logic to apply (Note: The current implementation in `applyFilters` implicitly uses AND logic for exclusion).
- **`enabled`**: Toggles the entire filter set on or off.

Filter sets are managed using the `FilterService`:
```typescript
import { FilterService, FilterSet } from '@/lib/search/filtering';

const filterService = new FilterService();

const myFilterSet: FilterSet = { /* ... definition ... */ };
filterService.addFilterSet(myFilterSet);

const results = [/* ... your BaseSearchResult[] ... */];
const filterResult = filterService.applyFilterSet('my-filter-set-id', results);
```

## Filter Configuration (`FilterConfig`)

Each filter condition within a `FilterSet` is defined by a `FilterConfig` object. This provides a flexible way to define rules based on result fields.

```typescript
// Example FilterConfig structure (from src/lib/search/filtering/types.ts)
export interface FilterConfig {
  id: string;               // Unique ID for this specific rule config
  field: string;            // Field to check in BaseSearchResult (e.g., "url", "title", "metadata.contentType")
  operator: FilterOperator; // Comparison operator (e.g., CONTAINS, EQUALS, STARTS_WITH)
  value: any;               // Value to compare against the field's content
  enabled: boolean;         // Is this specific rule active?
}
```

- **`field`**: Specifies which property of the `BaseSearchResult` to evaluate. Dot notation can potentially be used for nested properties within `metadata` (e.g., `metadata.readability.score`).
- **`operator`**: Defines the comparison logic. See `FilterOperator` enum below.
- **`value`**: The target value for the comparison (e.g., a domain string, a keyword, a number).
- **`enabled`**: Toggles this individual rule on or off.

**Available Operators (`FilterOperator` Enum):**

```typescript
export enum FilterOperator {
  AND = 'and', // Logical AND (for combining rules, used in CompositeFilterRule)
  OR = 'or',   // Logical OR (for combining rules, used in CompositeFilterRule)
  NOT = 'not', // Logical NOT (potentially for wrapping rules)
  EQUALS = 'equals',
  NOT_EQUALS = 'not_equals',
  GREATER_THAN = 'greater_than',
  LESS_THAN = 'less_than',
  CONTAINS = 'contains',
  NOT_CONTAINS = 'not_contains',
  STARTS_WITH = 'starts_with',
  ENDS_WITH = 'ends_with',
  BETWEEN = 'between', // Value should be [min, max]
  NOT_BETWEEN = 'not_between', // Value should be [min, max]
  IN = 'in',         // Value should be an array
  NOT_IN = 'not_in',     // Value should be an array
}
```

## Relationship between `FilterConfig` and `FilterRule` Types

While `FilterConfig` provides a flexible way to *define* rules, the internal logic of `FilterService` often uses more specific, strongly-typed rule interfaces like `DomainFilterRule`, `KeywordFilterRule`, etc. (defined in `types.ts`).

Currently, the `FilterService` includes static helper methods (e.g., `FilterService.createDomainBlockRule(...)`) to construct these specific `FilterRule` objects directly. The `FilterConfig` approach appears to be the intended *configuration* mechanism, but the internal conversion (`convertConfigsToRules`) is not fully implemented yet.

**Therefore, when configuring filters, you might currently rely more on constructing specific `FilterRule` objects using the static methods provided in `FilterService` until the `FilterConfig` conversion is complete.**

Example using static method:
```typescript
import { FilterService } from '@/lib/search/filtering';

const blockRule = FilterService.createDomainBlockRule(
  'block-example', 
  'Block Example.com', 
  ['example.com'], 
  true // Match subdomains
);

// This blockRule can potentially be used directly with applyFilters (though applyFilterSet is preferred)
// const filterResult = filterService.applyFilters([blockRule], results);

// Or, ideally, construct a FilterSet using FilterConfig (once conversion works)
// or potentially adapt FilterSet to hold FilterRuleUnion[] directly.
```

## Applying Filters

Use the `applyFilterSet` method of the `FilterService` instance, providing the ID of the desired `FilterSet` and the array of `BaseSearchResult` objects.

```typescript
const { filtered, excluded, stats } = filterService.applyFilterSet(
  'my-filter-set-id',
  searchResults
);

console.log(`Included: ${filtered.length}, Excluded: ${excluded.length}`);
console.log('Rule Stats:', stats.ruleStats);
```

The method returns an object containing the `filtered` results, the `excluded` results, and `stats` about the filtering process. 