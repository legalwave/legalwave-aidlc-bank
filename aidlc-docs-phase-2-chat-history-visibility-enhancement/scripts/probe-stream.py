#!/usr/bin/env python3
"""Probe the live backend's streaming endpoint and report the stage event sequence."""
import json
import sys
import urllib.request

BASE = "http://localhost:8000/api"
EMAIL = "cdptest@example.com"
PASSWORD = "TestPass123!"
MESSAGE = "What are the requirements for a valid service agreement under Japanese law?"


def post_json(url, payload, token=None):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    if token:
        req.add_header("Authorization", f"Bearer {token}")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def login():
    try:
        return post_json(f"{BASE}/auth/login", {"email": EMAIL, "password": PASSWORD})["access_token"]
    except Exception:
        return post_json(
            f"{BASE}/auth/register",
            {"email": EMAIL, "password": PASSWORD, "name": "CDP Tester"},
        )["access_token"]


def stream(token):
    """Yield (event_type, stage, status) for each NDJSON line."""
    boundary = "----lwcdptest"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="message"\r\n\r\n'
        f"{MESSAGE}\r\n"
        f"--{boundary}--\r\n"
    ).encode()
    req = urllib.request.Request(
        f"{BASE}/chats/stream",
        data=body,
        headers={
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Authorization": f"Bearer {token}",
        },
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=180) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                continue


def main():
    token = login()
    print(f"[auth] ok (token {token[:16]}...)")
    print(f"[stream] POST /api/chats/stream")
    print("-" * 70)

    stages = []
    events = []
    try:
        for ev in stream(token):
            t = ev.get("type")
            events.append(t)
            if t == "stage":
                stages.append((ev.get("stage"), ev.get("status")))
                print(f"  STAGE   {ev.get('stage'):<20} {ev.get('status')}")
            elif t == "chat":
                print(f"  CHAT    id={ev.get('chat_id')} title={ev.get('title')!r}")
            elif t == "error":
                print(f"  ERROR   {ev.get('message')}")
            elif t == "done":
                print(f"  DONE    message_id={ev.get('message_id')}")
            elif t == "text_delta":
                if not any(e == "text_delta" for e in events[:-1]):
                    print(f"  TEXT    (first delta)")
            else:
                print(f"  {t.upper():<7} {str(ev)[:70]}")
    except Exception as exc:
        print(f"  STREAM FAILED: {type(exc).__name__}: {exc}")
        return 1

    print("-" * 70)
    print(f"[summary] event types: {events}")
    print(f"[summary] stage sequence: {stages}")

    keys = [s for s, _ in stages]
    expected = ["fetching_statutes", "analyzing", "grounding"]
    seen = [k for k in keys if k in expected]
    print(f"[check] expected stages present: {seen}")
    if not seen:
        print("[check] FAIL - no expected stage events were emitted")
        return 1
    if seen == expected:
        print("[check] PASS - full progression fetching -> analyzing -> grounding")
    else:
        print(f"[check] PARTIAL - got {seen}, wanted {expected}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
