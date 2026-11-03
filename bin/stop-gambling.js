#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createInterface } from "node:readline/promises";
import { ENDPOINT, findHelp, findSelfExclusion, checkSites, selfCheck, blockGambling } from "../index.js";

const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8"));

const USAGE = `stop-gambling ${pkg.version} — gambling help from your terminal, by Silex (https://trysilex.com)

Usage:
  stop-gambling helplines [country]     Free, confidential helplines (country: GB, US, "Germany"…;
                                        defaults to your system locale's country)
  stop-gambling self-exclude <country>  Your country's official self-exclusion scheme and sign-up link
  stop-gambling check <site…>           Is it on the list of ~294,000 gambling domains? Use "-" to
                                        read sites from stdin. Exit code 1 if any site is listed.
  stop-gambling self-check              The PGSI, a validated 9-question screener (interactive;
                                        or pass --answers 0,1,2,… with nine values 0–3)
  stop-gambling block <iphone|android|bank>
                                        A step-by-step plan to block gambling there
  stop-gambling mcp                     Use the same tools from Claude, ChatGPT, Cursor and others

Options:
  --json      Print the raw result as JSON
  -v, --version
  -h, --help

If you are in immediate danger or thinking about suicide, call your local emergency number now.
Silex is not medical care and does not diagnose.`;

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code) => (s) => (color ? `\x1b[${code}m${s}\x1b[0m` : String(s));
const bold = paint(1), dim = paint(2), green = paint(32), red = paint(31), cyan = paint(36);

const out = (s = "") => console.log(s);
const list = (items) => items.forEach((s) => out(`  • ${s}`));
const link = (url) => cyan(url);

function localeCountry() {
  const env = process.env.LC_ALL || process.env.LC_MESSAGES || process.env.LANG || "";
  const fromEnv = env.match(/^[a-z]{2,3}[_-]([A-Z]{2})\b/);
  if (fromEnv) return fromEnv[1];
  const region = new Intl.Locale(Intl.DateTimeFormat().resolvedOptions().locale).maximize().region;
  return region || undefined;
}

async function helplines(country) {
  const guessed = !country;
  const r = await findHelp(country || localeCountry());
  if (json(r)) return;
  out(bold(`Gambling help${r.country ? ` — ${r.country}` : ""}`) + (guessed && r.country ? dim("  (from your locale; pass a country to change)") : ""));
  for (const h of r.helplines) out(`  ${bold(h.name)}  ${h.description}`);
  if (!r.helplines.length) out(`  ${r.coverage_note}`);
  out();
  out(bold("Online, anywhere"));
  // Online entries named by domain carry the service name in the description.
  for (const h of r.online) out(`  ${h.name.includes(".") ? h.description : `${h.name} — ${h.description}`}: ${link(h.contact)}`);
  if (r.debt_help.length) {
    out();
    out(bold("Debt advice"));
    for (const d of r.debt_help) out(`  ${d.name} — ${d.desc}: ${link(d.url)}`);
  }
  out();
  out(red(r.urgent));
}

async function selfExclude(country) {
  if (!country) fail("Which country? e.g. stop-gambling self-exclude GB");
  const r = await findSelfExclusion(country);
  if (json(r)) return;
  if (!r.scheme) {
    out(bold(`Self-exclusion${r.country ? ` — ${r.country}` : ""}`));
    out(`  ${r.note}`);
  } else {
    out(bold(`${r.scheme} — ${r.country}`));
    if (r.covers) out(`  ${r.covers}`);
    if (r.terms) out(`  Terms: ${r.terms}`);
    if (r.facts) list(r.facts);
    out(`  Sign up: ${link(r.url)}`);
  }
  out();
  out(bold("Also"));
  list(r.also);
  out();
  out(`Guide: ${link(r.guide)}`);
}

async function check(args) {
  let sites = args;
  if (args.length === 1 && args[0] === "-") {
    sites = readFileSync(0, "utf8").split(/\s+/).filter(Boolean);
  }
  if (!sites.length) fail("Which sites? e.g. stop-gambling check bet365.com wikipedia.org");
  const r = await checkSites(sites);
  const listed = r.results.some((x) => x.on_gambling_list);
  if (!json(r)) {
    for (const x of r.results) {
      if (x.valid === false) out(`  ${dim("?")} ${x.input}  ${dim("not a domain or URL")}`);
      else if (x.on_gambling_list) out(`  ${red("✗")} ${x.domain}  ${red("gambling")}${x.matched !== x.domain ? dim(` (matches ${x.matched})`) : ""}`);
      else out(`  ${green("✓")} ${x.domain}  ${dim("not on the list")}`);
    }
    out();
    out(dim(r.note));
    if (listed) out(`Block them: ${link(r.how_to_block)}`);
  }
  process.exitCode = listed ? 1 : 0;
}

async function pgsi(answersArg) {
  let answers;
  if (answersArg !== undefined) {
    answers = String(answersArg).split(",").map((s) => Number(s.trim()));
  } else {
    const q = await selfCheck();
    if (!process.stdin.isTTY) fail("self-check is interactive; pass --answers with nine values 0–3 instead.");
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const scale = q.scale.map((s) => `${s.value} ${s.label}`).join("   ");
    out(bold("Problem Gambling Severity Index (PGSI)"));
    out(dim(`Nine questions about the last 12 months. Nothing is stored.\n${q.source}`));
    answers = [];
    for (const [i, question] of q.questions.entries()) {
      out();
      out(`${bold(`${i + 1}/9`)} ${question}`);
      for (;;) {
        const a = (await rl.question(`  ${dim(scale)}\n  > `)).trim();
        if (/^[0-3]$/.test(a)) { answers.push(Number(a)); break; }
        out(dim("  Type 0, 1, 2 or 3."));
      }
    }
    rl.close();
    out();
  }
  const r = await selfCheck(answers);
  if (json(r)) return;
  out(`${bold(`Score: ${r.score} / ${r.max}`)} — ${bold(r.band)}`);
  out(`  ${r.meaning}`);
  out();
  out(r.next_step.replace("call find_gambling_help", "run `stop-gambling helplines`")
    .replace("(find_self_exclusion)", "(`stop-gambling self-exclude <country>`)"));
  out();
  out(dim(r.disclaimer));
  out(`More: ${link(r.page)}`);
}

async function block(where) {
  if (!["iphone", "android", "bank"].includes(where)) fail("Block where? iphone, android or bank.");
  const r = await blockGambling(where);
  if (json(r)) return;
  out(bold(`Block gambling — ${where === "iphone" ? "iPhone" : where === "android" ? "Android" : "your bank"}`));
  r.steps.forEach((s, i) => out(`  ${i + 1}. ${s}`));
  out();
  out(bold("What doesn't work"));
  list(r.doesnt_work);
  out();
  out(`Full guide: ${link(r.guide)}`);
}

function mcp() {
  const config = { mcpServers: { "silex-help": { type: "http", url: ENDPOINT } } };
  if (json({ url: ENDPOINT, ...config })) return;
  out(bold("Silex Help MCP server") + dim("  — no key, no account, read-only"));
  out(`  URL: ${link(ENDPOINT)}`);
  out();
  out(`Claude Code:  claude mcp add --transport http silex-help ${ENDPOINT}`);
  out("ChatGPT:      chatgpt.com/plugins → Add → Add custom MCP server, with the URL above");
  out("Cursor and others (mcp.json):");
  out(JSON.stringify(config, null, 2).replace(/^/gm, "  "));
}

// ---------- plumbing ----------

let asJson = false;
function json(r) {
  if (asJson) console.log(JSON.stringify(r, null, 2));
  return asJson;
}

function fail(message) {
  console.error(`stop-gambling: ${message}`);
  process.exit(2);
}

async function main(argv) {
  const args = [];
  let answers;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") asJson = true;
    else if (a === "-h" || a === "--help") return out(USAGE);
    else if (a === "-v" || a === "--version") return out(pkg.version);
    else if (a === "--answers") answers = argv[++i];
    else if (a.startsWith("--answers=")) answers = a.slice(10);
    else args.push(a);
  }
  const [cmd, ...rest] = args;
  switch (cmd) {
    case "helplines": case "help-lines": return helplines(rest.join(" ") || undefined);
    case "self-exclude": case "self-exclusion": return selfExclude(rest.join(" ") || undefined);
    case "check": return check(rest);
    case "self-check": case "pgsi": return pgsi(answers);
    case "block": return block(rest[0]?.toLowerCase());
    case "mcp": return mcp();
    case undefined: case "help": return out(USAGE);
    default: fail(`unknown command "${cmd}". Run stop-gambling --help.`);
  }
}

main(process.argv.slice(2)).catch((e) => fail(e.message));
