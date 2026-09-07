// kinship.mjs — who stands as pod to whom.
//
//   node test/kinship.mjs
//
// Selection used to need a farm on disk to test, because it was tangled up with
// reading one. It is now arithmetic on names, so this file is the whole of it:
// a list of site names in, the pods out, no filesystem and no farm.

import { gather, parentOf, selectorsFor } from '../src/pod/kinship.js'

let failures = 0
const check = (name, got, want) => {
  const ok = JSON.stringify(got) === JSON.stringify(want)
  if (!ok) failures++
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}${ok ? '' : ` — got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`}`)
}

// A farm holding a root, two of its children, a grandchild, and an unrelated site.
const FARM = [
  'example.org',
  'a.example.org',
  'b.example.org',
  'deep.a.example.org',
  'other.net',
]

const at = (origin, kinds) => gather(FARM, { origin, kinds })

check('parent of a child', parentOf('a.example.org'), 'example.org')
check('parent of a root', parentOf('localhost'), '')

// The same question at two sites of one farm has two different right answers.
check('sisters at a child', at('a.example.org', 'sisters').sisters, ['b.example.org'])
check('sisters at the root', at('example.org', 'sisters').sisters, [])
check('parent at a child', at('a.example.org', 'parent').parent, ['example.org'])
check('parent at the root', at('example.org', 'parent').parent, [])
check('children are one level down', at('example.org', 'children').children, ['a.example.org', 'b.example.org'])
check('grandchildren are not children', at('example.org', 'children').children.includes('deep.a.example.org'), false)
check('descendants are any depth', at('example.org', 'descendants').descendants, [
  'a.example.org',
  'b.example.org',
  'deep.a.example.org',
])

// Every pod is a neighbourhood: the asking site is never among its own results.
for (const kind of Object.keys(selectorsFor('a.example.org'))) {
  check(`${kind} excludes the asker`, at('a.example.org', kind)[kind].includes('a.example.org'), false)
}
check('farm is everyone else', at('a.example.org', 'farm').farm, [
  'b.example.org',
  'deep.a.example.org',
  'example.org',
  'other.net',
])

// The forgiveness the item text shows, shown here too.
check('several kinds at once', Object.keys(at('example.org', 'children,farm')), ['children', 'farm'])
check('an array of kinds', Object.keys(at('example.org', ['children'])), ['children'])
check('unknown kinds are dropped', Object.keys(at('example.org', 'children,nonsense')), ['children'])
check('nothing asked for is sisters', Object.keys(at('a.example.org', '')), ['sisters'])
check('sorted by name', at('example.org', 'descendants').descendants, [...at('example.org', 'descendants').descendants].sort())
check('an empty farm answers empty', gather([], { origin: 'a.example.org', kinds: 'sisters' }), { sisters: [] })

console.log(`\n${FARM.length} sites · ${failures ? `${failures} FAILED` : 'all agree'}`)
process.exitCode = failures ? 1 : 0
