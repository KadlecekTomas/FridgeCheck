# Security Contract

## Principle

Household inventory data is private by default.

Security must be enforced at trusted boundaries. A hidden button or client-side route guard is not authorization.

## Data ownership

Every household-scoped resource must have a clear ownership/access path.

Examples include:

- households
- household memberships
- storage units
- products when household-private
- inventory batches
- stock targets
- inventory events
- shopping-list data

A user must never gain access to another household by changing an ID in a URL, query, request body or client-side state.

## Supabase authorization

Supabase Row Level Security is part of the security model and must be treated as production code.

For every household-scoped table:

- enable RLS where appropriate
- define explicit SELECT policy
- define explicit INSERT policy
- define explicit UPDATE policy
- define explicit DELETE policy when deletion is supported
- test authorized and unauthorized behavior

Do not rely solely on application queries that “normally” include the current user ID.

## Credentials

Never commit:

- Supabase service-role keys
- private API tokens
- database passwords
- session tokens
- signing secrets
- production credentials

`NEXT_PUBLIC_*` values are visible to the browser and must be safe to expose publicly.

Privileged credentials must remain server-side and receive minimum required permissions.

## Authentication

Authentication establishes identity; authorization decides access.

Do not treat a valid session as permission to access arbitrary household resources.

Session/logout flows should fail safely and stale sessions must not expose data.

## Input validation

Validate untrusted input at the trusted boundary, not only in the form UI.

Examples:

- IDs
- quantities
- units
- expiry dates
- EAN values
- text fields
- URLs/images from external metadata

Client-side validation improves UX but can be bypassed.

## External services

Open Food Facts responses are untrusted external input.

Normalize and validate fields before persistence/rendering. Handle missing and malformed data.

Do not execute or inject external strings as HTML.

Remote image handling must respect Next.js/security configuration and should not accept arbitrary unsafe schemes.

## XSS and rendering

Avoid `dangerouslySetInnerHTML` unless there is a concrete, reviewed requirement with sanitization.

Do not render user/external content into executable contexts.

## CSRF and mutations

Use framework/Supabase mechanisms appropriately for authenticated mutations. Evaluate CSRF risk whenever introducing cookie-authenticated custom endpoints.

Mutating endpoints/actions must verify authorization independently of UI state.

## Logging and observability

Logs must not contain secrets or unnecessary private household data.

Do not log:

- auth tokens
- passwords
- service keys
- full sensitive session objects

When debugging production behavior, log identifiers/context minimally and deliberately.

## Privacy

Collect only data required for product behavior.

Before adding analytics, tracking or third-party telemetry, define:

- what is collected
- why it is needed
- retention
- who receives it
- whether it contains household/food behavior data

Do not silently add invasive analytics.

## File/image uploads

If uploads are introduced, validate:

- authenticated ownership
- content type
- size limits
- storage path isolation
- public/private bucket semantics

Do not trust filename extensions.

## Dependency security

Keep dependencies deliberate and reasonably current.

A new dependency should be justified by value versus maintenance/security surface.

Critical/high-confidence vulnerabilities in reachable production dependencies must be triaged before merge/release.

Do not blindly upgrade major dependencies without tests.

## Database integrity

Authorization is not the only security concern. Protect data integrity with:

- foreign keys
- constraints
- transactions for multi-step mutations
- migration validation

A partial inventory mutation can be a correctness/security incident if it exposes or corrupts household data.

## Service-role usage

Service-role/admin credentials bypass RLS and therefore require exceptional care.

Use them only in trusted server/administrative contexts. Never expose them to the browser. Scope administrative operations tightly and validate target household/user explicitly.

## Security testing minimum

Automated tests must prove at least:

- authorized member can read permitted data
- unauthorized user cannot read it
- unauthorized user cannot insert/update/delete it
- forged household/storage/batch IDs cannot cross boundaries
- client credentials cannot perform privileged operations

## Incident rule

If a change may have exposed secrets or cross-household data, stop normal feature work and treat it as an incident:

1. contain/revoke access where relevant
2. establish scope
3. fix the root cause
4. add regression coverage
5. document necessary follow-up

Do not hide or minimize security failures to keep delivery moving.
