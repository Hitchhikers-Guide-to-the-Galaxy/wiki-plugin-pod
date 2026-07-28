// roll.js — what the pod plugin knows how to do, as plain functions.
//
// No request, no response, no argv, nothing from a web framework. Everything it
// needs arrives as ordinary values, so the same function answers the plugin's
// own route and the farm's mounted operation without either knowing about the
// other. Lifted out of server/server.js unchanged; that file is now a thin
// caller of this one.
//
// Node-only (it reads the farm directory), and deliberately NOT imported by the
// client — the client shares only the vocabulary in ./commands.js.

import fs from 'node:fs/promises'
import path from 'node:path'

/** Every pod this module can gather, as predicates over farm directory names. */
export const selectorsFor = ({ origin, parentDomain }) => {
  const domainOf = name => name.split('.').slice(1).join('.')
  return {
    sisters: name => name !== origin && domainOf(name) === parentDomain,
    parent: name => parentDomain !== '' && name === parentDomain,
    children: name => domainOf(name) === origin,
    descendants: name => name !== origin && name.endsWith('.' + origin),
    farm: name => name !== origin,
  }
}

/** A directory is a wiki when it carries a readable sitemap. */
const isWiki = (farmRoot, name) =>
  fs
    .access(path.join(farmRoot, name, 'status', 'sitemap.json'), fs.constants.R_OK)
    .then(() => true)
    .catch(() => false)

const pageCount = (farmRoot, name) =>
  fs
    .readdir(path.join(farmRoot, name, 'pages'))
    .then(entries => entries.length)
    .catch(() => 0)

/** The parent domain of a site name — '' for a farm root such as `localhost`. */
export const parentOf = origin => origin.split('.').slice(1).join('.')

/**
 * Gather the requested pods of the site being asked.
 *
 * `origin` and `farmRoot` are the context: the answer genuinely depends on WHERE
 * the question was asked, which is why they are arguments rather than something
 * this module reaches for. Unknown kinds are dropped rather than refused, and
 * the default is sisters — the same forgiveness the item text shows.
 */
export const roll = async ({ kinds, origin, farmRoot }) => {
  const parentDomain = parentOf(origin)
  const selectors = selectorsFor({ origin, parentDomain })

  const wanted = (Array.isArray(kinds) ? kinds : String(kinds || 'sisters').split(','))
    .map(k => String(k).trim())
    .filter(k => selectors[k])

  let entries
  try {
    entries = await fs.readdir(farmRoot, { withFileTypes: true })
  } catch {
    return { origin, parentDomain, groups: {} }
  }

  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)
  const flags = await Promise.all(dirs.map(name => isWiki(farmRoot, name)))
  const wikis = dirs.filter((_, i) => flags[i])

  const groups = {}
  for (const kind of wanted) {
    const names = wikis.filter(selectors[kind])
    const group = await Promise.all(
      names.map(async name => ({ site: name, pages: await pageCount(farmRoot, name) })),
    )
    group.sort((a, b) => a.site.localeCompare(b.site))
    groups[kind] = group
  }

  return { origin, parentDomain, groups }
}
