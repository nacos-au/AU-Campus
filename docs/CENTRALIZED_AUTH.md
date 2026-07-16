# Centralized Authentication — AU Score + AU Digest

Both platforms share a **single Supabase Auth instance**. A student who signs into AU Digest is automatically recognized by AU Score (and vice versa) because they share the same `auth.users` table and `profiles` row.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│   AU Digest     │     │    AU Score     │
│  (Next.js App)  │     │  (Next.js App)  │
└────────┬────────┘     └────────┬────────┘
         │                       │
         └───────────┬───────────┘
                     ▼
         ┌───────────────────────┐
         │  Shared Supabase      │
         │  Project              │
         ├───────────────────────┤
         │  auth.users           │  ← Single identity store
         │  profiles             │  ← Shared university profile
         │  (AU Score tables)    │  ← App-specific data
         │  (AU Digest tables)   │  ← App-specific data
         └───────────────────────┘
```

## Setup Steps

### 1. Use One Supabase Project

Pick **one** existing Supabase project (recommend the AU Digest project if it already has auth configured). AU Score connects to it via the same env vars:

```env
NEXT_PUBLIC_SUPABASE_URL=<shared-project-url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<shared-anon-key>
```

Both apps must point to identical values.

### 2. Shared `profiles` Table

The `profiles` table in `001_initial_schema.sql` extends `auth.users`:

| Column | Purpose |
|--------|---------|
| `id` | FK to `auth.users(id)` — the universal user ID |
| `email` | University email |
| `matric_number` | Validated on signup (one account per student) |
| `department_id` | Links to faculty |
| `role` | `student` (default), `record_keeper`, `super_admin` |

**If AU Digest already has a profiles table**, merge rather than duplicate:

- Add AU Score-specific columns (`role`) to the existing table
- Or use a `app_roles` junction table if roles differ per platform

### 3. Matric Number Validation

Enforce university identity at signup via a Supabase Auth Hook or Edge Function:

```typescript
// supabase/functions/validate-signup/index.ts
// Reject signups where matric_number isn't in the university registry
```

Options for the registry:
- CSV/API from the university student information system
- Manual admin approval queue
- Email domain restriction (`@university.edu.ng` only)

### 4. Cross-App Session Sharing

Supabase Auth cookies are domain-scoped. For seamless SSO:

| Deployment | Cookie Domain | Result |
|------------|---------------|--------|
| `digest.university.edu` + `score.university.edu` | Set cookie domain to `.university.edu` | Shared session |
| `university.edu/digest` + `university.edu/score` | Same origin | Automatic sharing |
| `digest.vercel.app` + `score.vercel.app` | Different domains | Users sign in separately (same credentials) |

For subdomains, configure in Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://score.university.edu
Additional Redirect URLs:
  - https://digest.university.edu/**
  - https://score.university.edu/**
```

### 5. Role Management

| Role | AU Score Permissions |
|------|---------------------|
| `student` | Read all public data, vote on matches |
| `record_keeper` | Log events on assigned matches only |
| `super_admin` | Full CRUD on departments, teams, fixtures |

Promote roles via SQL (super admin only):

```sql
UPDATE profiles SET role = 'record_keeper' WHERE matric_number = 'AU/CS/2022/0142';
```

### 6. AU Digest Integration Checklist

- [ ] Confirm AU Digest's Supabase project URL and keys
- [ ] Audit existing `profiles` / user tables for conflicts
- [ ] Run AU Score migration against the shared project
- [ ] Add `role` column or `app_roles` table if missing
- [ ] Configure shared cookie domain for production
- [ ] Test: sign up on Digest → open Score → already authenticated

## Alternative: External Identity Provider

If the university uses a central IdP (LDAP, Azure AD, Google Workspace):

1. Configure Supabase SAML/OAuth provider once
2. Both apps use the same Supabase Auth with that provider
3. No duplicate user stores anywhere

This is the enterprise-grade path if IT manages central identity.
