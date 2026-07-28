// vocabulary.mjs — the plugin's half of the check.
//
//   node test/vocabulary.mjs
//
// The farm checks the command table against this plugin's specification. It
// cannot check the parser, because it has no browser and the shipped client is
// a bundle. So the parser is checked here, against the same table — and because
// the parser IMPORTS that table rather than keeping a copy, agreeing with it is
// the default rather than an achievement.
//
// What is actually being asserted: every command classified as reaching the farm
// produces its declared value, and no command classified as staying in the
// browser produces anything at all.

import { COMMANDS, ITEM_TYPE, FALLBACK, parseKinds, hasCommand, parseTitle, valuesFor } from '../src/family/commands.js'

let failures = 0
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`)
}

// Every parameter command yields exactly its declared value, from its own word.
for (const [word, command] of Object.entries(COMMANDS)) {
  if (command.kind !== 'parameter') continue
  check(`${word} → ${command.value}`, parseKinds(word), [command.value])
}

// Every macro yields exactly what it says it expands to.
for (const [word, command] of Object.entries(COMMANDS)) {
  if (command.kind !== 'macro') continue
  check(`${word} → ${command.expands.join(' + ')}`, parseKinds(word), parseKinds(command.expands.join('\n')))
}

// Aliases are the same word twice.
for (const [word, command] of Object.entries(COMMANDS)) {
  if (command.kind !== 'alias') continue
  check(`${word} ≡ ${command.alias}`, parseKinds(word), parseKinds(command.alias))
}

// Nothing that stays in the browser may leak into a call. This is the assertion
// that makes the classification load-bearing rather than decorative.
for (const [word, command] of Object.entries(COMMANDS)) {
  if (command.kind !== 'presentation') continue
  check(`${word} gathers nothing`, parseKinds(word), FALLBACK)
}

// The convention itself: case forgiven, one trailing colon optional, data ignored.
check('lowercase accepted', parseKinds('children'), ['children'])
check('trailing colon accepted', parseKinds('CHILDREN:'), ['children'])
check('unrecognised line is data', parseKinds('some prose\nFARM'), ['farm'])
check('nothing recognised', parseKinds(''), FALLBACK)
check('order preserved, deduped', parseKinds('FARM\nFAMILY\nFARM'), ['farm', 'parent', 'sisters'])

// The two presentation commands the client actually reads.
check('ROSTER detected', hasCommand('CHILDREN\nROSTER', 'ROSTER'), true)
check('TITLE off', parseTitle('TITLE no'), false)
check('TITLE default', parseTitle('CHILDREN'), COMMANDS.TITLE.default)

// And the values the API is told to accept are the ones the parser can produce.
check('kinds enum is what the parser emits', valuesFor('kinds'), parseKinds(
  Object.entries(COMMANDS)
    .filter(([, c]) => c.kind === 'parameter')
    .map(([word]) => word)
    .join('\n'),
))

console.log(`\nitem type: ${ITEM_TYPE} · ${Object.keys(COMMANDS).length} commands · ${failures ? `${failures} FAILED` : 'all agree'}`)
process.exitCode = failures ? 1 : 0
