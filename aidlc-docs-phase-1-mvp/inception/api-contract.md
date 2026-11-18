# API Contract (source of truth for backend + frontend)

> **This document states the intent of the API. The machine-enforced contract
> is `backend/openapi.json`.**
>
> The shapes below are generated from `backend/app/routes.py` and
> `backend/app/schemas.py` into `backend/openapi.json`, and from there into
> `frontend/src/shared/api/types.ts`. CI runs a `--check` at each link, so
> code and contract cannot drift apart silently. If this prose and the spec
> disagree about a shape, the **spec is authoritative** and this document is
> what needs correcting.

Backend: FastAPI on `http://localhost:8000`. Frontend: Vite dev server on 5173 (or next free), proxies `/api` and `/mcp` to 8000. Backend CORS allows `http://localhost:5173-5180`.
All JSON. Auth: `Authorization: Bearer <jwt>` for `/api/*` except register/login.
Errors: HTTP status + `{"detail": "..."}`.

## Auth
- `POST /api/auth/register` `{email, password, name?}` -> `{access_token, user:{id,email,name}}`
- `POST /api/auth/login` `{email, password}` -> same shape (401 on bad creds)
- `GET /api/auth/me` -> `{id,email,name}`

## Chats
- `GET /api/chats` -> `[{id,title,preview,updated_at}]` newest first
- `GET /api/chats/{id}` -> `{id,title,messages:[{id,role:"user"|"assistant",content,attachment:{filename,size}|null,created_at}]}`
- `DELETE /api/chats/{id}` -> 204

## Streaming — `POST /api/chats/stream`
Request: `multipart/form-data`: `message` (str, required), `chat_id` (str uuid, optional; absent = new chat), `file` (optional `.txt` or `.pdf`, <= 5MB).
Response: `200`, `Content-Type: application/x-ndjson`, chunked (HTTP streaming). **One JSON object per line** (`\n` terminated), each with `type`:

| type | fields | notes |
|---|---|---|
| `chat` | `chat_id`, `title` | first event always |
| `stage` | `stage` (`uploaded`\|`reading_file`\|`fetching_statutes`\|`analyzing`\|`grounding`), `status` (`active`\|`complete`), `label` | progress UI. `uploaded`/`reading_file` only when file present |
| `tool_call` | `id`, `name`, `args` (object) | agent invoked tool |
| `tool_result` | `id`, `name`, `summary` (short str) | tool finished |
| `text_delta` | `delta` (markdown str) | append to assistant message |
| `citations` | `items:[{id,label,law_id,law_title,article}]` | sent once before `done`; ids referenced from text |
| `done` | `message_id` | final |
| `error` | `message` | terminal on failure |

Frontend must tolerate unknown types and partial reads (buffer by `\n`).

### Markdown conventions the agent emits (frontend renders specially)
- Verdict heading per clause: `### RED · Clause 7 — Unilateral amendment` (also `YELLOW`, `GREEN`). Frontend turns the leading token into a colored badge (RED=noncompliant #C97064, YELLOW=risky #D2973B, GREEN=compliant #6FA08A).
- Overall verdict line near top: `**Overall: RED**`.
- Quoted clause text as blockquote `> ...`.
- Citation links: `[民法 第1条](cite://<law_id>/<article_num>)` e.g. `cite://322AC0000000049/24`. Frontend renders as amber pill; click opens modal calling `GET /api/laws/{law_id}/articles/{article_num}`.
- Final line: `_Not legal advice · Verdicts are informational_`.

## Law lookup (for citation modal)
- `GET /api/laws/{law_id}/articles/{article_num}` -> `{law_id,law_title,article_num,article_title,paragraphs:[{num,text}],source_url}` (404 if missing)

## API keys
- `GET /api/keys` -> `[{id,prefix,created_at,last_used_at,revoked_at}]` (revoked hidden after 24h)
- `POST /api/keys` -> `{id,prefix,key,created_at}` — `key` (`jlca_...`) shown ONCE
- `DELETE /api/keys/{id}` -> 204 (sets revoked_at)

## MCP server
Mounted at `/mcp` (streamable HTTP, official `mcp` Python SDK). Auth `Authorization: Bearer jlca_...` (API key). Tools:
- `analyze_contract_risk(query: str, document_text: str = "")` -> final markdown (same format as chat)
- `search_japanese_law(keyword: str)` -> short markdown list of hits

## Misc
- `GET /api/health` -> `{status:"ok"}`
- Postgres via docker compose in `backend/docker-compose.yml`, host port **5434**, db/user/pass `legal`.
- Backend env (`backend/.env`): `GOOGLE_API_KEY`, `GEMINI_MODEL`, `DATABASE_URL`, `JWT_SECRET`.
