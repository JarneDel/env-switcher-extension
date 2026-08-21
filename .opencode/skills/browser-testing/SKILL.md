---
name: browser-testing
description: Browser-test this WXT extension via wxt dev + CDP on port 9222 with chrome-devtools-mcp. Use when starting dev server, verifying extension behavior in a live browser, testing popup/background/content scripts/omnibox, or debugging "browser already running", ECONNRESET crashes, or profile lock errors.
---

# Browser Testing (wxt dev + CDP)

## Architecture

`npm run dev` (WXT) launches Chrome itself with:

- `--remote-debugging-pipe` — added by web-ext internally; talks to WXT (auto-reload)
- `--remote-debugging-port=9222` — our arg from `webExt.chromiumArgs`; open for MCP/testing
- `--user-data-dir=<cwd>/.chrome-debug-profile` — persistent dev profile (gitignored; contains session cookies)
- Extension pre-loaded; extension ID is stable per project path.

chrome-devtools-mcp connects to that same Chrome via project `opencode.jsonc`
(`--browserUrl=http://127.0.0.1:9222`, plus `--categoryExtensions`). Config changes require
restarting opencode.

## Start / stop / verify

```bash
# start detached (stdin must stay open or WXT exits):
setsid bash -c 'tail -f /dev/null | npm run dev' > /tmp/wxt-dev.log 2>&1 < /dev/null & disown

# verify CDP is up:
curl -s http://localhost:9222/json/version | grep Browser

# list targets — extension loaded iff a service_worker target exists:
curl -s http://localhost:9222/json/list | python3 -c \
  "import json,sys; [print(t['type'],'|',t['url'][:90]) for t in json.load(sys.stdin)]"
```

Expect targets: `page` (start URL), `service_worker: chrome-extension://<ID>/background.js`,
plus `browser_ui: chrome://omnibox-popup...`.

## Testing over raw CDP (no MCP needed)

Node ≥22 has a global `WebSocket`. Get a target's `webSocketDebuggerUrl` from `/json/list`,
then evaluate JS in it:

```js
const ws = new WebSocket(wsUrl);
ws.onopen = () => ws.send(JSON.stringify({
  id: 1, method: 'Runtime.evaluate',
  params: { expression: '1+1', returnByValue: true },
}));
ws.addEventListener('message', ev => { /* msg.id === 1 → msg.result.result.value */ });
```

- Open the popup as a normal tab: `PUT http://localhost:9222/json/new?<encoded url>` with
  `chrome-extension://<ID>/popup.html`; assert React mounted (`root.children.length > 0`),
  then close with `/json/close/<targetId>`.
- Service-worker checks (registered listeners etc.) run in the SW target's WS, e.g.
  `browser.omnibox.onInputChanged.hasListeners()`.

## Gotchas (each one cost us time — don't rediscover)

- **Stale profile lock**: if Chrome dies uncleanly, `.chrome-debug-profile/Singleton*` remain.
  Next launch shows an un-clickable "profile in use" dialog, Chrome exits code 21, WXT crashes
  with `ECONNRESET on Pipe`. Fix: `rm .chrome-debug-profile/Singleton*`.
- **pkill self-match**: `pkill -f wxt` inside a command that also contains the literal word
  kills its own shell (bash tool reports a timeout). Use bracket patterns like `pkill -f "[w]xt"`
  and never combine them in one command with matching text elsewhere.
- **Detached stdin**: `setsid nohup npm run dev < /dev/null &` dies (WXT reads stdin). Keep it
  open with the `tail -f /dev/null |` pipe shown above.
- **Content-script isolation**: `evaluate_script` runs in the page's main world — variables set
  by the content script are invisible. Verify through DOM side effects only.
- **Omnibox can't be driven by CDP**: address-bar input isn't automatable. Verify registration
  (listeners + manifest keyword) in the SW target, unit-test search logic separately in Node,
  and type `env <query>` manually for UX checks.
- **MCP "browser already running"**: another chrome-devtools-mcp instance holds
  `~/.cache/chrome-devtools-mcp/chrome-profile`. Kill the old MCP Chrome, or connect to ours
  via `--browserUrl` instead of spawning a second browser.
