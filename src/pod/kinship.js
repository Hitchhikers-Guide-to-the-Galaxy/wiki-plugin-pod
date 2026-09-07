// kinship.js — who stands as pod to whom, as arithmetic on names.
//
// Kinship needs no disk: given the names a farm holds, every pod is a predicate
// over strings. So selection lives here, imported by both readers — the browser,
// which asks the farm only what sites exist, and the API handler, which answers
// server-side for an agent that cannot run our client. That is why the plugin's
// server shrank to one directory read and no opinions.

/** The domain a site hangs from — '' for a farm root such as `localhost`. */
export const parentOf = origin => origin.split('.').slice(1).join('.')

/** Every pod, as predicates over site names, relative to the site asking. */
export const selectorsFor = origin => {
  const parentDomain = parentOf(origin)
  const domainOf = name => name.split('.').slice(1).join('.')
  return {
    sisters: name => name !== origin && domainOf(name) === parentDomain,
    parent: name => parentDomain !== '' && name === parentDomain,
    children: name => domainOf(name) === origin,
    descendants: name => name !== origin && name.endsWith('.' + origin),
    farm: name => name !== origin,
  }
}

/**
 * Sort site names into the requested pods — names in, names out. Unknown kinds
 * are dropped rather than refused, the same forgiveness the item text shows.
 * Every pod is a neighbourhood, so the asker is never among its own results.
 */
export const gather = (sites, { origin, kinds }) => {
  const selectors = selectorsFor(origin)
  const wanted = (Array.isArray(kinds) ? kinds : String(kinds || 'sisters').split(','))
    .map(k => String(k).trim())
    .filter(k => selectors[k])

  const groups = {}
  for (const kind of wanted) groups[kind] = sites.filter(selectors[kind]).sort((a, b) => a.localeCompare(b))
  return groups
}
