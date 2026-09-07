// roll.js — the one thing kinship cannot work out for itself: what is here.
//
// Node-only, never imported by the client. The selectors, the sorting and the
// page counts have all left: selection moved to ../pod/kinship.js, and the
// counts went away because the client never read them — it takes them from each
// neighbour's own sitemap, so the farm was reading a directory per site on
// every render for nothing.
//
// A directory is a wiki when it holds pages — the same test wiki-plugin-farm
// and wiki-plugin-hitchhiker use. This plugin used to test for
// `status/sitemap.json`, which is written on first view rather than on
// creation, so a farm's newest sites were invisible to it alone.

import fs from 'node:fs/promises'
import path from 'node:path'

import { gather, parentOf } from './kinship.js'

/** The sites of this farm — every directory holding pages. */
export const sitesOf = async farmRoot => {
  let entries
  try {
    entries = await fs.readdir(farmRoot, { withFileTypes: true })
  } catch {
    return []
  }
  const dirs = entries.filter(e => e.isDirectory()).map(e => e.name)
  const holdsPages = await Promise.all(
    dirs.map(name =>
      fs
        .access(path.join(farmRoot, name, 'pages'), fs.constants.R_OK)
        .then(() => true)
        .catch(() => false),
    ),
  )
  return dirs.filter((_, i) => holdsPages[i]).sort()
}

/**
 * Gather the requested pods of the site being asked. `origin` and `farmRoot` are
 * context: the answer depends on WHERE the question was put, which is why they
 * are arguments rather than something this module reaches for.
 */
export const roll = async ({ kinds, origin, farmRoot }) => ({
  origin,
  parentDomain: parentOf(origin),
  groups: gather(await sitesOf(farmRoot), { origin, kinds }),
})

export { parentOf }
