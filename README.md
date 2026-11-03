# stop-gambling

Gambling help from your terminal: free helplines checked by hand, your country's official
self-exclusion scheme, a check against about 294,000 gambling and betting domains, the PGSI
self-check, and step-by-step plans to block gambling on iPhone, Android and at the bank.

Made by [Silex](https://trysilex.com/), the quit-gambling app. No account, no key, and nothing
you look up is stored.

> If you are in immediate danger or thinking about suicide, call your local emergency number now.

```bash
npx stop-gambling helplines
```

## Commands

```bash
stop-gambling helplines [country]       # free, confidential lines; defaults to your locale's country
stop-gambling self-exclude <country>    # GAMSTOP, OASIS, RGIAJ, ANJ, Spelpaus, ROFUS, BetStop…
stop-gambling check <site…>             # is it a gambling site? exit code 1 if any is
stop-gambling self-check                # the PGSI, 9 questions, interactive
stop-gambling block <iphone|android|bank>
stop-gambling mcp                       # use the same tools from Claude, ChatGPT or Cursor
```

Add `--json` to any command for machine-readable output. Country is an ISO code (`GB`, `US`,
`DE`) or an English name (`"New Zealand"`).

```console
$ stop-gambling check bet365.com sports.stake.com wikipedia.org
  ✗ bet365.com  gambling
  ✗ sports.stake.com  gambling (matches stake.com)
  ✓ wikipedia.org  not on the list
```

`check -` reads sites from stdin, so it works in scripts:

```bash
cat visited-domains.txt | stop-gambling check - --json
```

`self-check --answers 2,1,2,0,2,1,1,1,2` scores nine answers (0 never … 3 almost always)
without the prompts.

## As a library

```js
import { checkSites, findHelp, findSelfExclusion, selfCheck, blockGambling } from "stop-gambling";

const { results } = await checkSites(["bet365.com", "example.org"]);
const help = await findHelp("GB");
```

Node 18 or later. No dependencies.

## How it works

Every command calls the public, read-only
[Silex Help MCP server](https://silex-help.trysilex.workers.dev/mcp), the same one behind the
Silex plugin for ChatGPT. It keeps no logs of what you ask
([privacy policy](https://trysilex.com/privacy/), section 15). Only the country or the sites
you pass are sent.

- **Helplines and self-exclusion schemes** are checked by hand against official sources and
  re-checked with every release.
- **The PGSI** is the Problem Gambling Severity Index (Ferris & Wynne, 2001). It is a screening
  tool, not a diagnosis.
- **The domain list** is the one the Silex app and the free
  [Silex browser extension](https://chromewebstore.google.com/detail/silex-%E2%80%94-free-gambling-blo/mnpnejkadjdiadkbdfdjddbmgpgocbjd)
  block. It is derived from [The Blocklist Project](https://github.com/blocklistproject/Lists)
  (public domain) and the [UT1 blacklists](https://dsi.ut-capitole.fr/blacklists/) of
  Université Toulouse Capitole (CC BY-SA 4.0). A site missing from it is not proof a site is
  safe; report misses to support@trysilex.com.

Silex is not medical care and does not diagnose or treat any condition.

## Licence

The code is MIT. The domain-list data stays under its own licences, above.
