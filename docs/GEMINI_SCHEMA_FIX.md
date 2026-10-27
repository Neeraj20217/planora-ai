# Gemini structured-output compatibility fix

Verified 27 October 2026 (IST), following Phase 2 commit 4d5f39b. Scope: the HTTP 400 request-compatibility issue only. No model/credential change, Phase 3, deployment or competition submission.

## Offline diagnosis

The adapter forwarded z.toJSONSchema(proposalShape) almost unchanged. The 2,687-byte original schema included two pattern constraints, 24 string-length constraints, 16 array bounds (including tasks[].dependsOn), and four numeric bounds. The SDK serialized those constraints directly into generationConfig.responseJsonSchema.

Google's [Generate Content structured-output guide](https://ai.google.dev/gemini-api/docs/generate-content/structured-output) documents a JSON Schema subset and warns that schema complexity can cause rejection. The [current structured-output reference](https://ai.google.dev/gemini-api/docs/structured-output) specifically identifies nested array limits and numeric bounds as possible constrained-decoding complexity factors; string lengths are ignored rather than enforced. Regex pattern is not part of the listed string subset. Therefore ignored length keywords alone are not established as the cause of the earlier 400.

The configured LOW thinking level is supported for Gemini 3.5 Flash-Lite according to Google's [thinking documentation](https://ai.google.dev/gemini-api/docs/thinking), so it was preserved. No credentials, model settings, token cap, timeout or retry policy were changed.

## Focused correction

- New response-schema.ts derives a small provider-facing schema from the same proposalShape, retaining every field, required list, primitive type, category/priority enum, array item structure and additionalProperties:false.
- Bounds and regexes become advisory descriptions rather than constrained-decoding keywords. JSON Schema metadata is not forwarded.
- client.ts sends that projection through the existing official SDK adapter.
- proposalShape, proposalSchema and planSchema remain unchanged. String lengths, regexes, bounded arrays/numbers, unknown-field rejection and semantic/dependency checks are still authoritative application-side validation.
- No changes were made to budget, timeline or orchestration business logic.

The same-model live request succeeded after this schema-only request change. This supports excessive/unsupported provider-schema constraints as the compatibility cause, but the earlier generic INVALID_ARGUMENT response did not identify one exact offending keyword. No extra calls were made to isolate individual constraints.

## Offline checks

- 58 relevant tests passed across adapter, orchestration and planning suites.
- The adapter suite was rerun after strengthening assertions: 4 passed. It verifies the recursively limited provider subset, required fields/enums, strict local rejection of invalid lengths/bounds/keys/dependencies/extra fields, unchanged model/thinking configuration and SDK attempts:1.
- TypeScript, lint and production Webpack build passed.
- Offline wire inspection used an intercepted fetch and synthetic fixture; it sent no Gemini request.

## Exactly one live verification

The existing SDK adapter was called directly once, bypassing the orchestration retry/repair loop. SDK attempts:1 and an outbound network guard prevented additional generation requests.

Input: birthday celebration, Hyderabad, 10 November 2026, 50 guests, INR 30,000, simple/affordable theme, vegetarian food, no special requirements. Model: gemini-3.5-flash-lite, unchanged from .env.local.

| Check | Actual result |
| --- | --- |
| Provider response | HTTP 200, finish reason STOP |
| Outbound generation calls | Exactly 1 |
| Adapter response latency | 5,714 ms |
| Reported usage | 475 prompt + 771 candidate = 1,246 total tokens; standard service tier |
| JSON/application validation | JSON parsed; strict proposalSchema and composed planSchema passed |
| Budget | Exactly 3,000,000 paise, including 300,000-paise contingency |
| Timeline | 10 tasks; all dates within 27 October–10 November 2026; dependency validation passed |
| Vendors | Venue, coordination/logistics and catering, relevant to the supplied brief |
| Recommendations | Affordable home/community-space format and vegetarian buffet |
| Ideas | Digital invitations and a DIY photo backdrop |

One model rationale says a home/community venue "ensures availability on short notice." That is an overstatement, not a verified fact. The plan's feasibility warning still requires venue/catering confirmation. This test verifies the request and structured planning pipeline; it does not establish factual reliability for every recommendation or validate other event types live. No quota limit or billing amount was reported.

Live artifacts remain in ignored local tool storage, not tracked source. No key was displayed or committed. No second request was sent.
