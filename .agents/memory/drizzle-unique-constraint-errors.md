---
name: Drizzle unique-constraint errors
description: Handling PostgreSQL uniqueness violations when Drizzle wraps the database exception.
---

When translating a PostgreSQL unique-constraint violation into an API conflict response, inspect the error's `cause` chain for SQLSTATE `23505` rather than checking only the outer Drizzle error.

**Why:** Drizzle can wrap the native driver error, leaving the outer exception without a `code`; checking the wrapper alone turns an expected duplicate-input conflict into a 500 response.

**How to apply:** Use a bounded, defensive cause-chain check in database error handling where API behavior needs to distinguish duplicate data from unexpected server failures.