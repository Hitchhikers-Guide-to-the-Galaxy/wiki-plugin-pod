// vocabulary.js — the table, read.
//
// ./commands.js is data with no imports, because the farm loads it server-side
// and a vocabulary that cannot be imported is dropped from the farm's document.
// Everything that READS that table lives here instead: @fortyfoxes/wiki-dsl,
// bundled into the client at build time and shared with every other plugin whose
// item text is a small language.

import { dsl } from '@fortyfoxes/wiki-dsl'

import { COMMANDS, FALLBACK } from './commands.js'

export const { parseKinds, hasCommand, argumentOf, problems, valuesFor, fieldByValue, canonical, resolve, suggest } =
  dsl(COMMANDS, { fallback: FALLBACK })

/** What a retired command became, or undefined for a live one. */
export const retirementOf = word => COMMANDS[word]?.retired

export { COMMANDS, FALLBACK }
export { VOCABULARY_VERSION, ITEM_TYPE } from './commands.js'
