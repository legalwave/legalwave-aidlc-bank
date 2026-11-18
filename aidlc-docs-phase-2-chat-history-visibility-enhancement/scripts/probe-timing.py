#!/usr/bin/env python3
"""Measure the wall-clock gap between the `grounding active` and `grounding complete` events."""
import json
import sys
import time
import urllib.request

BASE = "http://localhost:8000/api"
EMAIL = "cdptest@example.com"
PASSWORD = "TestPass123!"
MESSAGE = "List the essential clauses of a Japanese service agreement, with citations."


def post_json(url, payload):
    req = urllib.request.Request(
        url, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json"}, method="POST")
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.loads(r.read())


def login():
    try:
        return post_json(f"{BASE}/auth/login", {"email": EMAIL, "password": PASSWORD})["access_token"]
    except Exception:
        return post_json(f"{BASE}/auth/register",
                         {"email": EMAIL, "password": PASSWORD, "name": "CDP Tester"})["access_token"]


def stream(token):
    b = "----lwprobe"
    body = (f"--{b}\r\nContent-Disposition: form-data; name=\"message\"\r\n\r\n"
            f"{MESSAGE}\r\n--{b}--\r\n").encode()
    req = urllib.request.Request(
        f"{BASE}/chats/stream", data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={b}",
                 "Authorization": f"Bearer {token}"}, method="POST")
    with urllib.request.urlopen(req, timeout=180) as r:
        for raw in r:
            line = raw.decode("utf-8", "replace").strip()
            if not line:
                continue
            try:
                yield json.loads(line)
            except json.JSONDecodeError:
                pass


def main():
    token = login()
    t0 = None
    events = []
    for ev in stream(token):
        now = time.monotonic()
        t = ev.get("type")
        if t == "stage":
            events.append((now, t, ev.get("stage"), ev.get("status")))
        elif t in ("citations", "done"):
            events.append((now, t, None, None))
        elif t == "text_delta" and not any(e[1] == "text_delta" for e in events):
            events.append((now, "text_delta(first)", None, None))

    print(f"{'t (ms)':>10}  {'type':<18} {'stage':<20} status")
    print("-" * 66)
    for now, t, stage, status in events:
        print(f"{(now - events[0][0]) * 1000:>10.1f}  {t:<18} {str(stage or ''):<20} {status or ''}")

    # The gap between grounding active and grounding complete.
    g_active = next((e[0] for e in events if e[2] == "grounding" and e[3] == "active"), None)
    g_done = next((e[0] for e in events if e[2] == "grounding" and e[3] == "complete"), None)
    print("-" * 66)
    if g_active is not None and g_done is not None:
        gap_ms = (g_done - g_active) * 1000
        print(f"grounding active -> grounding complete gap: {gap_ms:.1f} ms")
        if gap_ms < 50:
            print("VERDICT: the gap is shorter than a React commit / human perception —")
            print("         the two states are effectively simultaneous in the UI.")
        else:
            print("VERDICT: the gap is long enough for the UI to display it.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
