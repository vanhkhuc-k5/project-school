# AI Tutor Privacy & Data Handling

> **Reference:** G37 — AI Tutor Architecture

## Overview

The AI Tutor feature sends student-submitted messages to an external AI provider (OpenAI, Anthropic, or Google Gemini) to generate personalized Socratic guidance responses. This document describes exactly what data is sent, what is blocked, and the privacy guarantees of the implementation.

---

## What IS Sent to the AI Provider

The following information is transmitted to the configured AI provider for each chat request:

| Field | Example Value | Purpose |
|---|---|---|
| `grade_level` | `"high_school_10_12"` | Adjust response complexity for the student |
| `subject` | `"Toán 10"` | Subject context for domain-appropriate guidance |
| `topic` | `"Phương trình bậc 2"` | Topic-specific tutoring |
| `school_name` | `"Trường THPT ABC"` | School name only — no contact details |
| `user_message` | `"Cho tôi biết cách giải pt bậc 2"` | Student's actual question |

No personal identifying information (PII) is included in the AI provider request payload.

---

## What is NEVER Sent

The following categories of data are **blocked at the service layer** before any AI provider request is made:

### Blocked Fields (Hard Block)
These fields are replaced with `[REDACTED]` in the sanitized context object:

- `password`
- `token`
- `secret`, `key`
- `ssn`, `identity_number`, `birth_certificate`
- `address`, `phone`, `email`
- `parent_name`, `parent_phone`

### Anonymized Fields
These are replaced with `[ID_REDACTED]` in the sanitized context object:

- `id`, `student_id`, `user_id`, `name`

### Explicitly Excluded
The following are never included in the AI provider payload:

- Student full name
- Student email address
- Student phone number
- Student home address
- Parent/guardian information
- Any database primary keys
- Any authentication tokens or secrets
- Internal system identifiers

---

## Privacy Architecture

```
Student Input Text
       ↓
Controller (ai-tutor.controller.js)
  - Validates authentication
  - Looks up student context (id, grade, school) from DB
       ↓
Service Layer (ai-tutor.service.js)
  sanitizeContext() — removes blocked/anonymized fields
  buildSystemPrompt() — constructs system prompt from safe fields only
       ↓
Provider Abstraction Layer (providers/*.provider.js)
  - Receives ONLY: grade_level, subject, topic, user_message, system_prompt
  - Never receives: PII, tokens, internal IDs
       ↓
AI Provider API (OpenAI / Anthropic / Gemini)
```

---

## System Prompt Contents

The system prompt sent to the AI provider contains:

```text
- Role: "Bạn là Gia Sư AI Socratic cho học sinh Việt Nam"
- Socratic guidance principles
- Age-appropriate response guidelines
- Grade level (derived from grade_level, not student name)
- Subject and topic context
- Safety instructions (no completing assessed work, Vietnamese-only responses)
```

The system prompt does **not** contain:
- Student name or any PII
- School contact details
- Parent information
- Any database IDs

---

## Conversation History

- Messages are persisted in the application's own database (`ai_tutor_messages` table).
- Only the **last 20 turns** of conversation history are sent to the AI provider per request (controlled by `MAX_CONVERSATION_TURNS` config).
- Historical messages stored in the database are never sent to the AI provider without the context-building process above.

---

## Configuration & Feature Flags

| Environment Variable | Default | Description |
|---|---|---|
| `AI_TUTOR_ENABLED` | `true` | Set to `false` to disable the feature entirely |
| `AI_PROVIDER` | `mock` | Which provider to use: `mock`, `openai`, `anthropic`, `gemini` |
| `AI_TUTOR_RATE_LIMIT` | `50` | Max messages per window per student |
| `AI_TUTOR_RATE_WINDOW` | `60000` | Rate limit window in milliseconds |

---

## Audit Logging

All AI Tutor interactions are logged via the standard `audit_logs` table for the following events:

- `ai_tutor.chat` — every message sent
- `ai_tutor.rate_limit_exceeded` — when a student hits rate limits
- `ai_tutor.provider_error` — when an AI provider returns an error

Audit logs do NOT record the full text of student questions or AI responses.

---

## Vendor Data Handling

Each AI provider processes student messages under their respective privacy policies:

- **OpenAI:** Student messages may be used for model improvement unless the organization opts out. Configure `OPENAI_API_KEY` from an organization account with data privacy settings enabled.
- **Anthropic:** Anthropic does not use customer data for training by default. Consider using Anthropic for higher privacy requirements.
- **Google Gemini:** Subject to Google's Gemini API privacy terms. Review Google Cloud privacy documentation.

For production deployments, consider:
1. Using an organization API key with data privacy controls enabled
2. Disabling API key data usage in provider dashboards
3. Using Anthropic if maximum data privacy is required

---

## Compliance Notes

- The AI Tutor feature is designed to comply with Vietnamese data protection principles (no PII transmission without necessity).
- Schools deploying this feature should notify students/parents that the feature uses an external AI service.
- The feature flag (`AI_TUTOR_ENABLED=false`) allows instant deactivation without code changes.

---

## Related Documentation

- [Architecture Overview](./docs/ARCHITECTURE.md)
- [AI Tutor Module](./server/modules/ai-tutor/)
- [Provider Interface](./server/modules/ai-tutor/providers/provider.interface.js)
- [Privacy Configuration Source](./server/modules/ai-tutor/ai-tutor.types.js)
