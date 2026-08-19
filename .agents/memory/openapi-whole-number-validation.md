---
name: OpenAPI whole-number validation
description: How to validate integer-like API inputs without triggering this workspace's Zod codegen incompatibility.
---

Use `type: number` with `multipleOf: 1` for API values that must be whole numbers, such as a violation count.

**Why:** This workspace's generated Zod validation is incompatible with OpenAPI `type: integer`; `number` plus `multipleOf: 1` generates a working `.multipleOf(1)` validation rule while still rejecting fractional requests.

**How to apply:** Add the non-negative or range constraints required by the field alongside `multipleOf: 1`, regenerate the OpenAPI clients and Zod schemas, then verify a fractional API request returns a validation error.