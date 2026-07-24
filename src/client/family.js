// wiki-plugin-family — gather configurable families of related wiki sites.
//
// Augments the Present plugin: instead of only listing sister sites, the item
// text is a list of keywords choosing WHICH families of sites to gather and
// show. Each gathered site is registered as a neighbor so its pages join your
// search and lineage. Reads the in-browser neighbourhood for the client-side
// families, and a small server route for the disk-derived ones.
//
// Recognised keywords (one per line, in item.text):
//   sisters        sibling sites sharing the parent domain   (server)
//   parent         the parent-domain site itself             (server)
//   children       direct sub-domains of this site           (server)
//   descendants    all sub-domains, any depth                (server)
//   farm           every wiki in the farm                    (server)
//   neighbourhood  the sites currently in your neighborhood  (client)
//   snapshot       freeze the current neighborhood           (client, v0.1 == neighbourhood)
//
// Actions (not site-kinds):
//   ROSTER         draw the gathered family compactly, mirroring a normal roster
//                  item — a left-aligned "<commands> Rosters" title over flowing
//                  `img.remote` flags in the grey box, instead of the wide
//                  tables. A ❄ corner icon saves it as a roster ghost page.
//   TITLE yes|no   whether the ROSTER title shows (default yes). TITLE no hides
//                  it, leaving even padding around the flags.
//   TWIN           show a roster of the family members that hold a page with
//                  THIS page's slug — existence-only, exactly like the
//                  wiki-client Twins strip: a slug match in the neighbour's
//                  sitemap, no journal or lineage check.
//   WATCH          stricter TWIN: show only the members whose copy is actually a
//                  fork of this page — its journal carries a `fork` event — i.e.
//                  who is watching (tracking) your page. Fetches each candidate.
//
// TWIN and WATCH render like a roster item (flowing flags, the (sub)domain in the
// hover tooltip); each flag links to that member's copy of the page. ROSTER is
// the same compact style for the whole (unfiltered) gather. The wider table (no
// display command) carries a small ❄ icon that saves the roster page too, so
// there is no separate FREEZE command.

const SERVER_KINDS = ['sisters', 'parent', 'children', 'descendants', 'farm']
const CLIENT_KINDS = ['neighbourhood', 'snapshot']
const LABEL = {
  sisters: 'Sisters',
  parent: 'Parent',
  children: 'Children',
  descendants: 'Descendants',
  farm: 'Farm',
  neighbourhood: 'Neighbourhood',
  snapshot: 'Snapshot',
}

const expand = text =>
  (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\*(.+?)\*/g, '<i>$1</i>')

const elapsed = ms => {
  const s = Math.floor(ms / 1000)
  const f = 1.9
  let out = 'a minute ago'
  if (s > f * 60) out = `${Math.round(s / 60)} minutes ago`
  if (s > f * 3600) out = `${Math.round(s / 3600)} hours ago`
  if (s > f * 86400) out = `${Math.round(s / 86400)} days ago`
  if (s > f * 604800) out = `${Math.round(s / 604800)} weeks ago`
  if (s > f * 2592000) out = `${Math.round(s / 2592000)} months ago`
  if (s > f * 31536000) out = `${Math.round(s / 31536000)} years ago`
  return out
}

const freshness = sitemap => {
  if (!sitemap) return ''
  const dates = sitemap.map(p => p.date).filter(d => typeof d === 'number')
  return dates.length ? elapsed(Date.now() - Math.max(...dates)) : ''
}

const portSuffix = () => ([80, '80', '', null].includes(location.port) ? '' : `:${location.port}`)

// DSL commands (UPPERCASE canonical, optional trailing colon — see the
// fedwiki-dsl convention) mapped to the internal lowercase kind key.
// A command maps to one kind, or to several (FAMILY = PARENT + SISTERS together).
const COMMANDS = {
  FAMILY: ['parent', 'sisters'],
  SISTERS: 'sisters',
  PARENT: 'parent',
  CHILDREN: 'children',
  DESCENDANTS: 'descendants',
  FARM: 'farm',
  NEIGHBOURHOOD: 'neighbourhood',
  NEIGHBORHOOD: 'neighbourhood', // accept either spelling
  SNAPSHOT: 'snapshot',
}

// Actions are commands that aren't site-kinds — ROSTER, TWIN, WATCH. Each is a
// bare keyword on its own line, so they never pollute the gathered kinds. ROSTER
// draws the whole gather compactly (with a button to save it as a roster page);
// TWIN and WATCH switch the panel to a roster of the family members that hold
// this page (TWIN by slug, WATCH by an actual fork event in the copy's journal).
const hasAction = (text, name) =>
  (text || '').split('\n').some(raw => {
    const key = raw.trim().split(/\s+/)[0].replace(/:$/, '').toUpperCase()
    return key === name
  })

// TITLE <yes|no|true|false|on|off> — whether the ROSTER display shows its title
// caption. Default: shown. A falsey value hides it (and the edge whitespace stays
// even, since nothing is left in its place).
const parseTitle = text => {
  for (const raw of (text || '').split('\n')) {
    const parts = raw.trim().split(/\s+/)
    if (parts[0].replace(/:$/, '').toUpperCase() !== 'TITLE') continue
    const v = (parts[1] || '').toLowerCase().replace(/:$/, '')
    return !['no', 'false', 'off', '0', 'hide', 'none'].includes(v)
  }
  return true // default: show the title
}

// item.text -> ordered, de-duplicated list of recognised kinds (default: sisters).
// Each line: first word is the command; UPPERCASE is canonical, but input case is
// forgiven, and a single trailing colon (YAML-style) is optional.
const parseKinds = text => {
  const kinds = []
  for (const raw of (text || '').split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const key = line.split(/\s+/)[0].replace(/:$/, '').toUpperCase()
    const mapped = COMMANDS[key]
    if (!mapped) continue
    for (const k of [].concat(mapped)) if (!kinds.includes(k)) kinds.push(k)
  }
  return kinds.length ? kinds : ['sisters']
}

// Display name for a site row. Descendants of the viewing site keep their
// whole relative name (david.pod.peoplepowered.money seen from
// peoplepowered.money → "david.pod"); everything else shows its first label.
const shortName = site =>
  site.endsWith('.' + location.hostname)
    ? site.slice(0, -(location.hostname.length + 1))
    : site.split('.')[0]

const rowHtml = (site, pages, sitemap) => {
  const suffix = portSuffix()
  const short = shortName(site)
  const img =
    `<img class=remote title="${site}${suffix}" src="//${site}${suffix}/favicon.png" ` +
    `data-site="${site}${suffix}" data-slug=welcome-visitors>`
  return (
    `<tr><td align=right>${short} ${img}` +
    `<td data-site="${site}${suffix}">${pages} pages ${freshness(sitemap)}`
  )
}

const groupHtml = (kind, rows) =>
  `<p class=caption><b>${LABEL[kind]}</b></p>` +
  `<table width=100% class=family-${kind}>${rows.join('\n')}</table>`

export const emit = (div, item) => {
  const suffix = portSuffix()
  const kinds = parseKinds(item.text)
  const watch = hasAction(item.text, 'WATCH')
  const twin = hasAction(item.text, 'TWIN')
  const roster = watch || twin // both render as a (filtered) roster of member flags
  const rosterCmd = hasAction(item.text, 'ROSTER') // compact display of the whole gather
  const showTitle = parseTitle(item.text) // TITLE yes/no — show the ROSTER title
  // Title for the ROSTER caption and the saved roster page — the commands
  // present, e.g. "SISTERS Rosters" / "PARENT SISTERS Rosters".
  const rostersTitle = `${kinds.map(k => k.toUpperCase()).join(' ')} Rosters`
  // slug of the page hosting this item — what TWIN/WATCH match against, the way
  // Twins matches the viewing page's slug across the neighbourhood. The page
  // div's id IS the slug (possibly with a _rev… suffix on a historical view);
  // .data('key') is the lineup key, NOT the slug, so don't use it here.
  const slug = (div.closest('.page').attr('id') || '').split('_rev')[0]
  // gathered family, captured during render so saveRosters() can reuse it:
  // kind -> ordered list of full domain names
  const gathered = {}

  // TWIN test — existence-only: does this neighbour's already-loaded sitemap hold
  // a page with our slug? (Twins' inner test — no journal, no lineage.)
  const hasTwin = key => {
    const sm = wiki.neighborhood[key]?.sitemap
    return Array.isArray(sm) && sm.some(p => p.slug === slug)
  }

  // WATCH test — is this member watching us: their copy of this page carries a
  // `fork` event in its journal (fedwiki's term for a copy taken from ours).
  // Needs the page JSON, so results are fetched lazily and cached (true/false
  // once resolved, `in` even while the request is in flight). We only fetch where
  // the sitemap already shows the slug, so it costs one request per actual twin.
  const watchStatus = {}
  const ensureWatchChecked = (key, onDone) => {
    if (key in watchStatus || !hasTwin(key)) return
    watchStatus[key] = undefined // in-flight marker
    wiki.site(key).get(`${slug}.json`, (err, page) => {
      watchStatus[key] =
        !err && Array.isArray(page?.journal) && page.journal.some(a => a?.type === 'fork')
      onDone()
    })
  }
  const matches = key => (watch ? watchStatus[key] === true : hasTwin(key))

  if (div.closest('.page').hasClass('remote')) {
    div.html(
      `<div class=family style="background-color:#eee;padding:15px"><center>${expand(item.text)}` +
      `<p class=caption>Family is only available when viewed on a page's home wiki.</p></div>`,
    )
    return
  }

  // The flag-display modes (ROSTER / TWIN / WATCH) carry their own caption, so
  // skip echoing the raw command text; the table keeps its echo. ROSTER also
  // drops the centred `.caption` line entirely — it renders its own left-aligned
  // title inside `.groups`, mirroring a roster item, so the box padding stays
  // even (important when TITLE is off).
  const echo = roster || rosterCmd ? '' : `<center>${expand(item.text)}`
  const status = rosterCmd ? '' : `<p class=caption>gathering…</p>`
  div.html(
    `<div class=family style="position:relative;background-color:#eee;padding:15px">${echo}` +
    `${status}<div class=groups>${rosterCmd ? '<i>gathering…</i>' : ''}</div></div>`,
  )

  const render = serverGroups => {
    // Candidate family members per kind, as neighbourhood lookup keys (with the
    // port suffix). Server kinds are registered once here so their sitemaps load;
    // TWIN/WATCH later filter these candidates down to the matching members.
    const candidates = {}
    for (const kind of kinds) {
      if (SERVER_KINDS.includes(kind)) {
        const roll = serverGroups[kind] || []
        gathered[kind] = roll.map(r => r.site)
        candidates[kind] = roll.map(r => r.site + suffix)
        for (const key of candidates[kind]) wiki.neighborhoodObject.registerNeighbor(key)
      } else {
        // neighbourhood / snapshot — read the live in-browser neighbourhood
        const sites = Object.keys(wiki.neighborhood)
        gathered[kind] = sites
        candidates[kind] = sites
      }
    }

    // TWIN / WATCH render like a roster item: the matching members' flags flowing
    // inline, deduplicated across kinds, each linking to that member's copy of
    // THIS page. No titles are shown (every copy is the same page) — the
    // (sub)domain lives in the hover tooltip. Sitemaps (and, for WATCH, the
    // fetched page journals) arrive asynchronously, so this is re-run as they
    // resolve, which is when matches reveal themselves.
    const buildRoster = () => {
      const seen = new Set()
      const flags = []
      for (const kind of kinds) {
        for (const key of candidates[kind]) {
          if (watch) ensureWatchChecked(key, paint) // lazily confirm the fork event
          if (seen.has(key) || !matches(key)) continue
          seen.add(key)
          flags.push(
            `<img class="remote" src="${wiki.site(key).flag()}" ` +
            `title="${key}" data-site="${key}" data-slug="${slug}">`,
          )
        }
      }
      return flags
    }

    // ROSTER — the whole gather as one compact roster: a single "<commands>
    // Rosters" caption (the panel's own .caption) over all members' flags. The
    // markup mirrors the wiki-plugin-roster item exactly: space-separated
    // `img.remote` flags in the panel's grey box — no extra wrapper — each
    // linking to that member's welcome page. The ❄ icon saves it as a page.
    const buildRosterDisplay = () => {
      const seen = new Set()
      const flags = []
      for (const kind of kinds) {
        for (const key of candidates[kind]) {
          if (seen.has(key)) continue
          seen.add(key)
          flags.push(
            `<img class="remote" src="${wiki.site(key).flag()}" ` +
            `title="${key}" data-site="${key}" data-slug="welcome-visitors">`,
          )
        }
      }
      return flags.join(' ') || '<i>none</i>'
    }

    // Non-roster: the full family tables (favicon + name + page count + freshness).
    const buildGroups = () => {
      const html = []
      for (const kind of kinds) {
        const rows = candidates[kind].map(key => {
          const bare = suffix && key.endsWith(suffix) ? key.slice(0, -suffix.length) : key
          const sm = wiki.neighborhood[key]?.sitemap
          return rowHtml(bare, sm ? sm.length : 0, sm)
        })
        const empty = SERVER_KINDS.includes(kind) ? '<tr><td><i>none</i>' : '<tr><td><i>empty</i>'
        html.push(groupHtml(kind, rows.length ? rows : [empty]))
      }
      return html.join('\n')
    }

    const paint = () => {
      if (roster) {
        // TWIN / WATCH — flat, filtered flags
        const flags = buildRoster()
        div.find('.groups').html(flags.join(' '))
        div.find('.caption').first().text(
          flags.length ? '' : watch ? 'no family watchers yet' : 'no family twins yet',
        )
        return
      }
      if (rosterCmd) {
        // Mirror a roster item: an optional left-aligned title, then a <br>, then
        // the flags — all in the panel's grey box. TITLE off → flags only, even
        // padding all round.
        const title = showTitle ? `${rostersTitle} <br> ` : ''
        div.find('.groups').html(title + buildRosterDisplay())
        return
      }
      div.find('.groups').html(buildGroups())
      div.find('.caption').first().text('just updated')
    }
    paint()

    // Save the gathered family as a roster ghost page titled after the commands
    // (e.g. "SISTERS Rosters"), one roster item per kind. No FREEZE command any
    // more: it's reached from the ❄ icon tucked into the corner of the ROSTER
    // and wide-table views.
    const saveRosters = () => {
      const hexId = () =>
        Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')
      const story = [{ type: 'markdown', id: hexId(), text: `# ${rostersTitle}` }]
      for (const kind of kinds) {
        const domains = gathered[kind] || []
        story.push({
          type: 'roster',
          id: hexId(),
          text: `${LABEL[kind]} Wikis\n\n${domains.join('\n') || '(none)'}`,
        })
      }
      const page = wiki.newPage({ title: rostersTitle, story })
      wiki.showResult(page, { $page: div.parents('.page') })
    }

    // Freeze affordance — a subtle ❄ icon in the panel corner, on the ROSTER and
    // the wide-table views (TWIN / WATCH are monitoring views, so they get none).
    if (rosterCmd || !roster) {
      const icon = $(
        '<span class=family-freeze-icon title="Display Rosters — save as a roster page" ' +
        'style="position:absolute;top:6px;right:9px;cursor:pointer;font-size:14px;opacity:.55">❄</span>',
      )
      icon.on('click', saveRosters)
      div.find('.family').append(icon)
    }

    // As each neighbour's sitemap loads: in TWIN/WATCH mode repaint, since a match
    // may have just appeared (a member whose sitemap now shows our slug — and for
    // WATCH that also kicks off the journal fetch); otherwise just backfill that
    // member's page-count / freshness cell.
    $('body').on('new-neighbor-done', (e, site) => {
      if (roster) return paint()
      const cell = div.find(`td[data-site="${site}"]`)
      if (!cell.length) return
      const sm = wiki.neighborhood[site]?.sitemap
      if (sm) cell.text(`${sm.length} pages ${freshness(sm)}`)
    })
  }

  const serverKinds = kinds.filter(k => SERVER_KINDS.includes(k))
  if (serverKinds.length === 0) {
    render({})
    return
  }

  fetch(`/plugin/family/roll?kinds=${encodeURIComponent(serverKinds.join(','))}`)
    .then(res => {
      if (!res.ok) {
        const err = new Error(`HTTP ${res.status}`)
        err.status = res.status
        throw err
      }
      return res.json()
    })
    .then(data => render(data.groups || {}))
    .catch(err => {
      // A 404 means the plugin's server component never registered its route —
      // almost always an old wiki-server / Node combination that couldn't load
      // server/server.js (see this plugin's server notes). Say so, rather than a
      // generic error, so the operator knows where to look.
      const msg =
        err && err.status === 404
          ? 'family server not loaded — the host wiki may need a restart or a newer wiki-server / Node'
          : 'server error'
      div.find('.caption').first().text(msg)
    })
}

export const bind = (div, item) => {
  div.dblclick(() => wiki.textEditor(div, item))
}

if (typeof window !== 'undefined') {
  window.plugins = window.plugins || {}
  window.plugins.family = { emit, bind }
}
