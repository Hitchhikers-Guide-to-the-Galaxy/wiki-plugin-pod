// vocabulary.mjs — the plugin's half of the check.
//
//   node test/vocabulary.mjs
//
// The farm checks the command table against this plugin's specification. It
// cannot check the parser, because it has no browser and the shipped client is a
// bundle. The parser itself is @fortyfoxes/wiki-dsl and has its own tests, so
// what is left to assert here is what only this plugin can know: that its TABLE
// says what the farm and the client both need it to say.

import {
  COMMANDS,
  ITEM_TYPE,
  FALLBACK,
  parseKinds,
  problems,
  hasCommand,
  argumentOf,
  valuesFor,
  fieldByValue,
  retirementOf,
} from '../src/pod/commands.js'

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

// Every kind that can be drawn declares what its group is called, and every
// heading that names the site uses the one placeholder the client substitutes.
const headings = fieldByValue('heading')
for (const command of Object.values(COMMANDS)) {
  if (!command.value) continue
  check(`${command.value} has a heading`, typeof headings[command.value], 'string')
}
for (const [value, heading] of Object.entries(headings)) {
  const ok = !heading.includes('{') || heading.includes('{site}')
  check(`${value} heading uses only {site}`, ok, true)
}

// Retired words must still parse. Deleting one would put a false "not a pod
// command" warning on every page that still says it — 11 items say ROSTER and 9
// say TWIN or WATCH.
for (const word of ['ROSTER', 'TWIN', 'WATCH']) {
  check(`${word} still parses`, problems(word), [])
  check(`${word} gathers nothing`, parseKinds(word), FALLBACK)
  check(`${word} says what became of it`, typeof retirementOf(word), 'string')
  // presentation is the kind the farm's vocabulary check allows for a word that
  // never crosses; a kind of our own invention would fail validation and the
  // whole table would be dropped from the farm's merged document.
  check(`${word} is a kind the farm accepts`, COMMANDS[word].kind, 'presentation')
}
check('a live command is not retired', retirementOf('SISTERS'), undefined)

// The convention itself: case forgiven, one trailing colon optional, data ignored.
check('lowercase accepted', parseKinds('children'), ['children'])
check('trailing colon accepted', parseKinds('CHILDREN:'), ['children'])
check('unrecognised line is data', parseKinds('some prose\nFARM'), ['farm'])
check('nothing recognised', parseKinds(''), FALLBACK)
check('order preserved, deduped', parseKinds('FARM\nPOD\nFARM'), ['farm', 'parent', 'sisters'])

// The commands the client reads directly.
check('ROSTER detected', hasCommand('CHILDREN\nROSTER', 'ROSTER'), true)
check('TITLE off', argumentOf('TITLE no', 'TITLE'), false)
check('TITLE default', argumentOf('CHILDREN', 'TITLE'), COMMANDS.TITLE.default)

// A typo is still reported through the shared library.
check('typo reported', problems('CHIKDREN'), [{ word: 'CHIKDREN', suggestion: 'CHILDREN' }])
check('typo still falls back', parseKinds('CHIKDREN'), FALLBACK)
check('live item text is clean', problems('POD\n*'), [])

// And the values the API is told to accept are the ones the parser can produce.
check('kinds enum is what the parser emits', valuesFor('kinds'), parseKinds(
  Object.entries(COMMANDS)
    .filter(([, c]) => c.kind === 'parameter')
    .map(([word]) => word)
    .join('\n'),
))

console.log(`\nitem type: ${ITEM_TYPE} · ${Object.keys(COMMANDS).length} commands · ${failures ? `${failures} FAILED` : 'all agree'}`)
process.exitCode = failures ? 1 : 0
