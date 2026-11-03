// Client for the Silex Help MCP server: public, read-only, no key. The server
// stores nothing; see https://trysilex.com/privacy/ (section 15).

export const ENDPOINT = "https://silex-help.trysilex.workers.dev/mcp";

let nextId = 1;

export async function callTool(name, args = {}) {
  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "content-type": "application/json", accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: nextId++, method: "tools/call", params: { name, arguments: args } }),
  });
  if (!res.ok) throw new Error(`Silex Help server returned HTTP ${res.status}`);
  const msg = await res.json();
  if (msg.error) throw new Error(msg.error.message);
  if (msg.result.isError) throw new Error(msg.result.content?.[0]?.text || "Tool error");
  return msg.result.structuredContent;
}

/** Helplines, online support and debt advice. `country`: ISO code or English name. */
export const findHelp = (country) => callTool("find_gambling_help", country ? { country } : {});

/** The official national self-exclusion scheme for a country, with its sign-up link. */
export const findSelfExclusion = (country) => callTool("find_self_exclusion", { country });

/** Checks domains or URLs against the gambling list. Batches of 20, the server's limit. */
export async function checkSites(sites) {
  const results = [];
  let last;
  for (let i = 0; i < sites.length; i += 20) {
    last = await callTool("check_gambling_site", { sites: sites.slice(i, i + 20) });
    results.push(...last.results);
  }
  return { ...last, results };
}

/** PGSI: no answers returns the questions; nine answers (0–3) returns the score and band. */
export const selfCheck = (answers) => callTool("gambling_self_check", answers ? { answers } : {});

/** A blocking plan for "iphone", "android" or "bank". */
export const blockGambling = (where) => callTool("block_gambling", { where });
