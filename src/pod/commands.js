// commands.js — the plugin's vocabulary, in one place.
//
// This module is the single source for what a pod item's text may say. The
// client imports it to parse item text; the plugin's API declaration names it so
// the farm reads the identical table. There is no second copy to drift.
//
// The PARSER is not here. It is @fortyfoxes/wiki-dsl, bundled at build time and
// shared with every other plugin whose item text is a small language — this
// module writes the table and nothing else. What the farm's vocabulary check
// accepts (the kinds below) is what that parser reads, so a table it can parse
// is a table the farm can mount.
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

import { dsl } from '@fortyfoxes/wiki-dsl'

export const VOCABULARY_VERSION = 1

/** The story item type these commands are written into. An agent needs this to author one. */
export const ITEM_TYPE = 'pod'

/** What the item does when no command is recognised. */
export const FALLBACK = ['sisters']

export const COMMANDS = {
  // ---- parameter: these become values of the `kinds` parameter -------------
  //
  // `heading` is what the drawn group is called. `{site}` is the site the item
  // is on, because that is what a pod is relative to and the one thing a reader
  // landing cold cannot work out.
  SISTERS: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'sisters',
    label: 'Sisters',
    heading: 'Sisters of {site}',
    description: 'sibling sites sharing the parent domain',
  },
  PARENT: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'parent',
    label: 'Parent',
    heading: 'Parent of {site}',
    description: 'the parent-domain site itself',
  },
  CHILDREN: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'children',
    label: 'Children',
    heading: 'Children of {site}',
    description: 'direct sub-domains of this site',
  },
  DESCENDANTS: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'descendants',
    label: 'Descendants',
    heading: 'Descendants of {site}',
    description: 'all sub-domains, any depth',
  },
  FARM: {
    kind: 'parameter',
    parameter: 'kinds',
    value: 'farm',
    label: 'Farm',
    heading: 'The rest of the farm',
    description: 'every wiki in the farm',
  },

  // ---- macro ---------------------------------------------------------------
  POD: {
    kind: 'macro',
    expands: ['PARENT', 'SISTERS'],
    description: 'PARENT and SISTERS together (shorthand)',
  },

  // ---- client-data: gathered in the browser, invisible to any server -------
  NEIGHBOURHOOD: {
    kind: 'client-data',
    value: 'neighbourhood',
    label: 'Neighbourhood',
    heading: 'Your neighbourhood',
    description: 'the sites currently in your neighborhood',
    why: 'reads the neighbourhood the browser has already assembled, which no server can see',
  },
  NEIGHBORHOOD: { kind: 'alias', alias: 'NEIGHBOURHOOD', description: 'American spelling' },
  SNAPSHOT: {
    kind: 'client-data',
    value: 'snapshot',
    label: 'Snapshot',
    heading: 'Your neighbourhood',
    description: 'freeze the current neighborhood',
    why: 'same browser-only source as NEIGHBOURHOOD',
  },

  // ---- presentation: never leaves the client -------------------------------
  TITLE: {
    kind: 'presentation',
    argument: 'yes|no',
    default: true,
    description: 'whether each group shows its heading',
  },

  // ---- retired: kept so pages that say them still parse ---------------------
  //
  // A word removed from this table is a word the parser reports as a mistake, so
  // retiring one by deleting it would put a false "not a pod command" warning on
  // every page that still says it. These stay, as presentation (the kind the
  // farm's check allows for a word that never crosses), carrying what became of
  // them.
  ROSTER: {
    kind: 'presentation',
    retired: 'the default — every pod is drawn as a roster of flags',
    description: 'no longer needed: rosters are how a pod is drawn',
  },
  TWIN: {
    kind: 'presentation',
    retired: 'wiki-plugin-twin',
    description: 'moved: which pod members hold a page with this page’s slug',
  },
  WATCH: {
    kind: 'presentation',
    retired: 'wiki-plugin-twin',
    description: 'moved: which pod members have forked this page',
  },
}

/** What a retired command became, or undefined for a live one. */
export const retirementOf = word => COMMANDS[word]?.retired

/**
 * The parser, bound to this table. Everything here is @fortyfoxes/wiki-dsl —
 * imported rather than written, so pod, and any other plugin with a command
 * table, read their text the same way.
 */
export const { parseKinds, hasCommand, argumentOf, problems, valuesFor, fieldByValue, canonical, resolve } = dsl(
  COMMANDS,
  { fallback: FALLBACK },
)
