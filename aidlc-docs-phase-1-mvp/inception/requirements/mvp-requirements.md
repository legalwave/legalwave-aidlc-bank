# Requirements (MVP)
FR1 Auth: register/login (email+password, JWT). 
FR2 Chat: send query + optional .txt/.pdf contract; response streamed over HTTP (NDJSON, one JSON event per line).
FR3 Agent: LangChain agent on Gemini with custom tools hitting e-Gov API v2 (keyword search, law_data w/ elm, laws). Outputs markdown; per-clause verdict heading RED/YELLOW/GREEN; citations as `cite://` links.
FR4 History: list/open/delete chats, persisted in Postgres.
FR5 Citations: click citation pill -> fetch article text from e-Gov.
FR6 API keys: create/list/revoke (hashed); shown once. 
FR7 MCP server: streamable-HTTP MCP at /mcp, Bearer API key, tools expose the agent.
NFR: MVP speed; latest SDK versions; backend & frontend run on host; Postgres in docker (port 5434 — 5432/5433 taken on this machine).
Out of scope: PDF report generation, DOCX, rate limiting, security hardening, tests beyond smoke.
