// commands.js — the plugin's vocabulary, in one place.
//
// This module is the single source for what a family item's text may say. The
// client imports it to parse item text; the plugin's API declaration names it so
// the farm reads the identical table. There is no second copy to drift, which is
// the same move that put the plugin's thinking in a module and left only the
// serving in its server.
//
// The item text convention is fedwiki-wide: UPPERCASE first word is a command,
// lowercase is data, and a single trailing colon is optional. See the Fedwiki
// DSL Skill.
//
// A DSL is a superset of an API, never a mirror of one — so every command
// declares which KIND it is, and only some kinds cross to HTTP:
//
//   parameter    supplies an argument to the call        → crosses
//   macro        shorthand expanding to other commands   → expands, then crosses
//   client-data  the server cannot supply it at all      → never crosses
//   presentation changes only how it is drawn            → never crosses
//   alias        another spelling of a command           → resolves first
//
// Adding a command here is the whole change: the parser, the API's allowed
// values, the rendered reference page and the plugin's own documentation all
// read this table.

export const VOCABULARY_VERSION = 1

/** The story item type these commands are written into. An agent needs this to author one. */
export const ITEM_TYPE = 'family'

/** What the item does when no command is recognised. */
export const FALLBACK = ['sisters']

export const COMMANDS = {
  // ---- parameter: these become values of the `kinds` parameter -------------
  SISTERS: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'sisters',
    label: 'Sisters',
    description: 'sibling sites sharing the parent domain',
  },
  PARENT: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'parent',
    label: 'Parent',
    description: 'the parent-domain site itself',
  },
  CHILDREN: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'children',
    label: 'Children',
    description: 'direct sub-domains of this site',
  },
  DESCENDANTS: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'descendants',
    label: 'Descendants',
    description: 'all sub-domains, any depth',
  },
  FARM: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'farm',
    label: 'Farm',
    description: 'every wiki in the farm',
  },

  // ---- macro ---------------------------------------------------------------
  FAMILY: {
    kind: 'macro',
    expands: ['PARENT', 'SISTERS'],
    description: 'PARENT and SISTERS together (shorthand)',
  },

  // ---- client-data: gathered in the browser, invisible to any server -------
  NEIGHBOURHOOD: {
    kind: 'client-data',
    value: 'neighbourhood',
    label: 'Neighbourhood',
    description: 'the sites currently in your neighborhood',
    why: 'reads the neighbourhood the browser has already assembled, which no server can see',
  },
  NEIGHBORHOOD: { kind: 'alias', alias: 'NEIGHBOURHOOD', description: 'American spelling' },
  SNAPSHOT: {
    kind: 'client-data',
    value: 'snapshot',
    label: 'Snapshot',
    description: 'freeze the current neighborhood',
    why: 'same browser-only source as NEIGHBOURHOOD',
  },
  TWIN: {
    kind: 'client-data',
    description: "show only members holding a page with this page's slug",
    why: "matches against each neighbour's own sitemap, fetched from the browser",
  },
  WATCH: {
    kind: 'client-data',
    description: 'stricter TWIN — only members whose copy is a fork of this page',
    why: "reads each candidate's page journal, one fetch per neighbour, from the browser",
  },

  // ---- presentation: never leaves the client -------------------------------
  ROSTER: {
    kind: 'presentation',
    description: 'draw the gather compactly, mirroring a normal roster item',
  },
  TITLE: {
    kind: 'presentation',
    argument: 'yes|no',
    default: true,
    description: 'whether the ROSTER title shows',
  },
}

/** Values a trailing TITLE argument may take to mean "no". */
const FALSEY = ['no', 'false', 'off', '0', 'hide', 'none']

/** Follow an alias to the command it spells. */
export const resolve = name => {
  const entry = COMMANDS[name]
  return entry && entry.kind === 'alias' ? COMMANDS[entry.alias] : entry
}

/** The canonical name a command resolves to, for reporting. */
export const canonical = name => {
  const entry = COMMANDS[name]
  return entry && entry.kind === 'alias' ? entry.alias : name
}

/**
 * The keyword a line begins with, normalised. UPPERCASE is canonical but input
 * case is forgiven, and one trailing colon is optional — never required.
 */
export const keywordOf = line =>
  String(line || '')
    .trim()
    .split(/\s+/)[0]
    .replace(/:$/, '')
    .toUpperCase()

/** Every value a parameter may take, in declaration order. The API's enum. */
export const valuesFor = parameter =>
  Object.values(COMMANDS)
    .filter(c => c.kind === 'parameter' && c.parameter === parameter && c.value)
    .map(c => c.value)

/** Kinds gathered in the browser rather than asked of a server. */
export const clientValues = () =>
  Object.values(COMMANDS)
    .filter(c => c.kind === 'client-data' && c.value)
    .map(c => c.value)

/** Display names, derived so a label is written once beside its command. */
export const labels = () => {
  const out = {}
  for (const c of Object.values(COMMANDS)) if (c.value && c.label) out[c.value] = c.label
  return out
}

/**
 * Item text to an ordered, de-duplicated list of gathered kinds.
 *
 * Macros expand in place, aliases resolve, unrecognised lines are ignored as
 * data rather than treated as an error. Default when nothing is recognised:
 * sisters.
 */
export const parseKinds = (text, { fallback = ['sisters'] } = {}) => {
  const kinds = []
  const take = name => {
    const entry = resolve(name)
    if (!entry) return
    if (entry.kind === 'macro') return entry.expands.forEach(take)
    if (!entry.value) return
    if (!kinds.includes(entry.value)) kinds.push(entry.value)
  }
  for (const line of String(text || '').split('\n')) {
    if (!line.trim()) continue
    take(keywordOf(line))
  }
  return kinds.length ? kinds : [...fallback]
}

/** Whether a bare command appears on a line of its own. */
export const hasCommand = (text, name) =>
  String(text || '')
    .split('\n')
    .some(line => canonical(keywordOf(line)) === name)

/** TITLE yes|no — shown unless explicitly turned off. */
export const parseTitle = text => {
  for (const raw of String(text || '').split('\n')) {
    const parts = raw.trim().split(/\s+/)
    if (canonical(keywordOf(raw)) !== 'TITLE') continue
    return !FALSEY.includes((parts[1] || '').toLowerCase().replace(/:$/, ''))
  }
  return COMMANDS.TITLE.default
}
