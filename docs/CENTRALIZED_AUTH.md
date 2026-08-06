# Centralized Authentication — AU Campus

Campus, Digest, and Score share **one Supabase Auth project** (`auth.users` + `public.profiles`).  
Same credentials everywhere. Sessions are still **per-origin cookies** until a shared parent domain is configured.

```
┌──────────┐  ┌──────────┐  ┌──────────┐
│  Campus  │  │  Digest  │  │  Score   │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     └─────────────┼─────────────┘
                   ▼
         Shared Supabase project
         auth.users + profiles + app_roles
```

---

## 1. Identity model

| Field | Purpose |
|-------|---------|
| `profiles.id` | FK → `auth.users` |
| `display_name` | Human name (not unique) |
| `username` | Unique Instagram/X-style handle |
| `email` | Login email |
| `is_super_admin` | Cross-platform owner (usually one human) |
| `verification_level` | `soft` (L1, default) \| `verified` (L2, future IRL) |
| `matric_number` | Reserved for L2 IRL link — **not** required at signup |
| `app_roles` | Per-app privilege rows (`campus` \| `digest` \| `score`) |

Signup (Campus hub and Score Join modal) creates a **soft** account: name + username + email + password. No matric gate at signup.

---

## 2. Roles (coherent + scalable)

### Super admin

- `profiles.is_super_admin = true`
- Full admin on **Campus + Digest + Score**
- Only person who can grant/revoke `app_roles` (`grant_app_role` / `revoke_app_role`)
- Prefer a single owner account

Promote yourself (SQL editor, once):

```sql
UPDATE public.profiles
SET is_super_admin = true
WHERE email = 'you@example.com';
```

### Per-app admins (`app_roles`)

| App | Allowed roles | Meaning |
|-----|---------------|---------|
| `campus` | `admin` | Future Campus hub ops |
| `digest` | `admin` | Digest platform admin (Team, revenue, …) |
| `score` | `admin`, `record_keeper` | Score ops / live match staff |

Grant (as super admin, signed in — or via service role SQL):

```sql
SELECT public.grant_app_role('<user-uuid>', 'score', 'admin');
SELECT public.grant_app_role('<user-uuid>', 'digest', 'admin');
SELECT public.grant_app_role('<user-uuid>', 'campus', 'admin');
SELECT public.grant_app_role('<user-uuid>', 'score', 'record_keeper');
```

Revoke:

```sql
SELECT public.revoke_app_role('<user-uuid>', 'score');
```

### Digest newsroom ladder (separate, stays on `profiles.role`)

`reader` → `writer` → `editor` → `admin`

- Used for article workflow only
- **Digest `profiles.role = admin` does not grant Score admin**
- Super admin and `app_roles (digest, admin)` elevate Digest capabilities without touching Score

### Score privilege sources (in order)

1. `is_super_admin`
2. `app_roles` where `app = 'score'`
3. Legacy `score_admins` / `score_user_roles` (still honored during transition)

---

## 3. Student verification (ship ASAP — no school registry)

We are **not** validating matric numbers at scale for launch.  
Accounts start at **L1**. There is **no L0 guest tier** in product.

| Level | Code | Who | Guardrail |
|-------|------|-----|-----------|
| ~~L0~~ | — | Unused | Reserved; do not ship open anonymous consequential actions |
| **L1 Soft** | `verification_level = 'soft'` | Everyone on signup | Normal campus account; browse + soft fan features |
| **L2 Verified** | `verification_level = 'verified'` | IRL-linked later | Consequential student actions (gated voting, student pricing, roster claim, …) |

### Future L2 (document only — no promotion UI yet)

When ready:

1. Trusted verifiers (super admin / designated captains) confirm identity **in person**
2. Link claim → signed-in campus account:
   - set `matric_number` (unique), `verification_level = 'verified'`, `verified_at`, `verified_by`
   - optional `player_account_links` for roster athletes
3. Gate high-stakes features on `verification_level = 'verified'`
4. If university IT later offers email domain / SAML, treat that as an **alternate path into L2**, not a rewrite

Until then: ship soft accounts freely; do not trust self-asserted matric.

---

## 4. Cross-app sessions (SSO reality)

| Deploy | Session sharing |
|--------|-----------------|
| `localhost:3000/3001/3002` | Separate cookies — same password, re-sign-in per app |
| `*.vercel.app` | Separate cookies |
| `campus.example.edu` + `digest.` + `score.` under one parent | Set cookie `Domain=.example.edu` + shared Site URL / redirect allowlist in Supabase |

Same credentials ≠ automatic SSO until a shared parent domain exists. Document this in onboarding UX.

---

## 5. Security baseline (ops checklist)

- [ ] Run migrations: username (`20260806160000_…`) + platform roles (`20260806170000_…`)
- [ ] Set `is_super_admin` on the owner email
- [ ] Production: demo staff bypass and `?demo=1` are disabled
- [ ] Match event POSTs require Score staff (app layer + RLS)
- [ ] Club logo / player avatar uploads: Score admin only
- [ ] Phantom create/update: authenticated; RLS owner/staff only
- [ ] Never promote Digest newsroom admin expecting Score access — grant `app_roles` score explicitly

---

## 6. Env

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

NEXT_PUBLIC_CAMPUS_URL=
NEXT_PUBLIC_DIGEST_URL=
NEXT_PUBLIC_SCORE_URL=

# Optional legacy seed helper
PLATFORM_OWNER_EMAIL=
```

Point **all three apps** at the same Supabase project.
