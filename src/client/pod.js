// wiki-plugin-pod — gather configurable pods of related wiki sites.
//
// Augments the Present plugin: instead of only listing sister sites, the item
// text chooses WHICH pods of sites to gather and show. Each gathered site is
// registered as a neighbor so its pages join your search and lineage.
//
// The commands an author may write are NOT listed here. They live in
// ../pod/commands.js, which the plugin's API declaration also names, so what an
// author may type and what the mounted operation accepts come from one table.
// Restating that table in a comment is how the two drift apart; read the table.
//
// Where each pod comes from: this plugin ships NO server. It declares a
// specification and a module of plain functions (api/, src/pod/), and the Farm
// Plugin mounts them — so the disk-derived pods are read from that mount,
// /system/api/pod/roll.json, the same address an agent uses. A second route of
// our own, wrapping the same handler for the browser's benefit, is the thing
// this plugin used to carry and no longer needs.
//
// NEIGHBOURHOOD and SNAPSHOT never leave the browser at all, being the
// neighbourhood the client has already assembled.
import { valuesFor, labels, parseKinds, parseProblems, hasCommand, parseTitle } from '../pod/commands.js'

const SERVER_KINDS = valuesFor('kinds')
const LABEL = labels()

const escapeHtml = text =>
  (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const expand = text => escapeHtml(text).replace(/\*(.+?)\*/g, '<i>$1</i>')

// A mistyped command (CHIKDREN for CHILDREN) is parsed as data, so the item
// falls back to sisters and draws a pod nobody asked for. Say so above the
// gather — in every display mode, since ROSTER drops the echo of the item text
// and would otherwise show no trace of the typo at all.
const problemsHtml = problems =>
  problems.length
    ? `<p class=pod-problem style="color:#a00;font-size:80%;text-align:center;margin:0 0 4px">` +
      problems
        .map(p =>
          p.suggestion
            ? `${escapeHtml(p.word)} — did you mean <b>${p.suggestion}</b>?`
            : `${escapeHtml(p.word)} — not a pod command`,
        )
        .join('<br>') +
      `</p>`
    : ''

// How stale a member is, from the dates in its sitemap. The wording is
// wiki-client's own (wiki.util.formatElapsedTime, as wiki-plugin-activity uses)
// rather than a second implementation that phrases durations differently.
const freshness = sitemap => {
  const dates = (sitemap || []).map(p => p.date).filter(d => typeof d === 'number')
  return dates.length ? wiki.util.formatElapsedTime(Math.max(...dates)) : ''
}

const portSuffix = () => ([80, '80', '', null].includes(location.port) ? '' : `:${location.port}`)

// parseKinds, hasCommand and parseTitle come from the shared vocabulary above.
// ROSTER, TWIN and WATCH are bare keywords on their own line, so they never
// pollute the gathered kinds: ROSTER draws the whole gather compactly (with a
// button to save it as a roster page); TWIN and WATCH switch the panel to a
// roster of the pod members that hold this page (TWIN by slug, WATCH by an
// actual fork event in the copy's journal).
const hasAction = hasCommand

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
  `<table width=100% class=pod-${kind}>${rows.join('\n')}</table>`

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
  // the gathered pod, captured during render so saveRosters() can reuse it:
  // kind -> neighbourhood keys, which carry the port suffix off port 80
  const candidates = {}
  const bare = key => (suffix && key.endsWith(suffix) ? key.slice(0, -suffix.length) : key)

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
      `<div class=pod style="background-color:#eee;padding:15px"><center>${expand(item.text)}` +
      `<p class=caption>Pod is only available when viewed on a page's home wiki.</p></div>`,
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
  // After the status caption, so `.caption` first() still finds the status line
  // the paint steps rewrite.
  const warning = problemsHtml(parseProblems(item.text))
  div.html(
    `<div class=pod style="position:relative;background-color:#eee;padding:15px">${echo}` +
    `${status}${warning}<div class=groups>${rosterCmd ? '<i>gathering…</i>' : ''}</div></div>`,
  )

  const render = groups => {
    // Candidate pod members per kind, as neighbourhood lookup keys (with the
    // port suffix). Server kinds are registered once here so their sitemaps
    // load; TWIN/WATCH later filter these candidates down to the matching
    // members.
    for (const kind of kinds) {
      if (SERVER_KINDS.includes(kind)) {
        candidates[kind] = (groups[kind] || []).map(site => site + suffix)
        for (const key of candidates[kind]) wiki.neighborhoodObject.registerNeighbor(key)
      } else {
        // neighbourhood / snapshot — read the live in-browser neighbourhood
        candidates[kind] = Object.keys(wiki.neighborhood)
      }
    }

    /**
     * The members' flags, flowing inline and deduplicated across kinds — the
     * markup of a wiki-plugin-roster item exactly: space-separated `img.remote`
     * in the panel's grey box, the (sub)domain in the hover tooltip.
     *
     * One builder serves both flag views because they differ in only two ways:
     * where a flag leads (ROSTER → each member's welcome page; TWIN/WATCH →
     * that member's copy of THIS page) and which members appear (ROSTER → all;
     * TWIN/WATCH → those matching). Sitemaps, and for WATCH the fetched
     * journals, arrive asynchronously, so this is re-run as they resolve.
     */
    const buildFlags = ({ target, filtered }) => {
      const seen = new Set()
      const flags = []
      for (const kind of kinds) {
        for (const key of candidates[kind]) {
          if (filtered && watch) ensureWatchChecked(key, paint) // lazily confirm the fork event
          if (seen.has(key) || (filtered && !matches(key))) continue
          seen.add(key)
          flags.push(
            `<img class="remote" src="${wiki.site(key).flag()}" ` +
            `title="${key}" data-site="${key}" data-slug="${target}">`,
          )
        }
      }
      return flags
    }

    // Non-roster: the full pod tables (favicon + name + page count + freshness).
    const buildGroups = () => {
      const html = []
      for (const kind of kinds) {
        const rows = candidates[kind].map(key => {
          const sm = wiki.neighborhood[key]?.sitemap
          return rowHtml(bare(key), sm ? sm.length : 0, sm)
        })
        const empty = SERVER_KINDS.includes(kind) ? '<tr><td><i>none</i>' : '<tr><td><i>empty</i>'
        html.push(groupHtml(kind, rows.length ? rows : [empty]))
      }
      return html.join('\n')
    }

    const paint = () => {
      if (roster) {
        // TWIN / WATCH — flat, filtered flags
        const flags = buildFlags({ target: slug, filtered: true })
        div.find('.groups').html(flags.join(' '))
        div.find('.caption').first().text(
          flags.length ? '' : watch ? 'no pod watchers yet' : 'no pod twins yet',
        )
        return
      }
      if (rosterCmd) {
        // Mirror a roster item: an optional left-aligned title, then a <br>, then
        // the flags — all in the panel's grey box. TITLE off → flags only, even
        // padding all round.
        const title = showTitle ? `${rostersTitle} <br> ` : ''
        const flags = buildFlags({ target: 'welcome-visitors', filtered: false })
        div.find('.groups').html(title + (flags.join(' ') || '<i>none</i>'))
        return
      }
      div.find('.groups').html(buildGroups())
      div.find('.caption').first().text('just updated')
    }
    paint()

    // Save the gathered pod as a roster ghost page titled after the commands
    // (e.g. "SISTERS Rosters"), one roster item per kind. No FREEZE command any
    // more: it's reached from the ❄ icon tucked into the corner of the ROSTER
    // and wide-table views.
    const saveRosters = () => {
      const hexId = () =>
        Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0')
      const story = [{ type: 'markdown', id: hexId(), text: `# ${rostersTitle}` }]
      for (const kind of kinds) {
        const domains = (candidates[kind] || []).map(bare)
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
        '<span class=pod-freeze-icon title="Display Rosters — save as a roster page" ' +
        'style="position:absolute;top:6px;right:9px;cursor:pointer;font-size:14px;opacity:.55">❄</span>',
      )
      icon.on('click', saveRosters)
      div.find('.pod').append(icon)
    }

    // As each neighbour's sitemap loads: in TWIN/WATCH mode repaint, since a match
    // may have just appeared (a member whose sitemap now shows our slug — and for
    // WATCH that also kicks off the journal fetch); otherwise just backfill that
    // member's page-count / freshness cell.
    //
    // The wiki never tells an item it has gone, so this listener unhooks itself
    // once its div has left the document — otherwise every re-render of the page
    // leaves another one behind, firing forever against detached markup.
    let wasMounted = false
    const onNeighbor = (e, site) => {
      // Never unhook an item that has not been mounted yet — the wiki can render
      // into a fragment before attaching it, and a neighbour arriving in that
      // window would otherwise silence the item for good.
      if (div[0]?.isConnected) wasMounted = true
      else if (wasMounted) return $('body').off('new-neighbor-done', onNeighbor)
      else return
      if (roster) return paint()
      const cell = div.find(`td[data-site="${site}"]`)
      if (!cell.length) return
      const sm = wiki.neighborhood[site]?.sitemap
      if (sm) cell.text(`${sm.length} pages ${freshness(sm)}`)
    }
    $('body').on('new-neighbor-done', onNeighbor)
  }

  // Only the disk-derived pods need asking; NEIGHBOURHOOD and SNAPSHOT are
  // already in the browser.
  const serverKinds = kinds.filter(k => SERVER_KINDS.includes(k))
  if (serverKinds.length === 0) {
    render({})
    return
  }

  fetch(`/system/api/pod/roll.json?kinds=${encodeURIComponent(serverKinds.join(','))}`)
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
      // A 404 means nothing is mounted at that address: this farm has no
      // wiki-plugin-farm, or it has not been restarted since pod was installed.
      // Name it, rather than saying "server error", so the operator knows what
      // to install.
      const msg =
        err && err.status === 404
          ? 'pod needs wiki-plugin-farm on this wiki to mount its API — install it and restart'
          : 'server error'
      div.find('.caption').first().text(msg)
    })
}

export const bind = (div, item) => {
  div.dblclick(() => wiki.textEditor(div, item))
}

if (typeof window !== 'undefined') {
  window.plugins = window.plugins || {}
  window.plugins.pod = { emit, bind }
}
