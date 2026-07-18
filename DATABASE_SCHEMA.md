# DATABASE_SCHEMA.md — Supabase (Postgres) schema

*Single source of truth for data structure. When the schema changes in code, update this file too.*

## `users`
```
id, email, telegram_id, whatsapp_number, phone (for SMS), 
preferred_channel, digest_frequency (immediate/daily/weekly), 
created_at
```

## `profiles`
```
user_id, raw_cv_text, cv_file_url, chat_summary (text from the 
AI onboarding conversation), preferences_json (keyword, location, 
salary, employment type), profile_embedding (vector — from CV + 
chat combined, not just short preferences), updated_at
```

## `cv_versions`
```
id, user_id, version_name (e.g. "Frontend", "Fullstack"), 
file_url, tailored_for_tag, created_at
```

## `job_postings` (shared across users, not duplicated)
```
id, source (profesia/worki/kariera), title, company, salary, 
location, url, posted_date, scraped_at, description_text, 
job_embedding (vector), deadline (AI-extracted if present), 
fake_score (0-100, computed once per posting)
```

## `matches`
```
id, user_id, job_posting_id, match_tier (strong_match/
worth_considering/stretch), match_score (numeric, from embedding 
comparison), ai_reasoning (text — why it matches or why it's a 
lower match), sent_at, channel_used
```

## `application_tracker`
```
id, user_id, job_posting_id, status (new_match/interested/
applied/interview/offer/rejected), applied_at, cv_version_id 
(reference to cv_versions), cover_letter_text, deadline, 
user_notes, follow_up_reminder_at
```

## `user_feedback`
```
user_id, job_posting_id, feedback_type (fake/relevant/
irrelevant), created_at
→ This table is the foundation for future automatic 
  fake-job detection (Phase 3+)
```

## `blacklisted_companies`
```
user_id, company_name, created_at
```

## `notification_preferences`
```
user_id, channel (telegram/whatsapp/email/sms/push), 
enabled (bool), priority_threshold (from which match_tier 
to send on this channel)
```

---

## Note on embeddings
`profile_embedding` and `job_embedding` are vectors (e.g. 1536 
dimensions depending on the chosen model) stored via the 
`pgvector` extension in Supabase. Comparison is done via a 
cosine similarity SQL query, not an AI call — this is a cheap, 
fast step BEFORE anything gets sent to Haiku/Sonnet for final 
evaluation.
