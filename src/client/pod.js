// wiki-plugin-pod — gather configurable pods of related wiki sites.
//
// The item text chooses WHICH pods of sites to gather — sisters, parent,
// children, descendants, the farm, the neighbourhood — and each gathered site is
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
// /system/api/pod/roll.json, the same address an agent uses. NEIGHBOURHOOD and
// SNAPSHOT never leave the browser at all, being the neighbourhood the client
// has already assembled.
//
// How it draws: it doesn't. A gather IS a roster — a heading over the members'
// flags — and wiki-plugin-roster already draws one, on every wiki there is. So
// pod builds the roster text and hands it to that plugin. The text it builds is
// also exactly what the ❄ icon saves as a page, so the drawn thing and the saved
// thing are one string rather than two code paths that must agree.
import { valuesFor, fieldByValue, parseKinds, problems, hasCommand, argumentOf, retirementOf } from '../pod/vocabulary.js'

const SERVER_KINDS = valuesFor('kinds')
const HEADING = fieldByValue('heading')

const escapeHtml = text =>
  (text || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

// A mistyped command (CHIKDREN for CHILDREN) is parsed as data, so the item
// falls back to sisters and draws a pod nobody asked for. Say so above the
// gather, since nothing else on the panel would show a trace of it.
const problemsHtml = found =>
  found.length
    ? `<p class=pod-problem style="color:#a00;font-size:80%;text-align:center;margin:0 0 6px">` +
      found
        .map(p =>
          p.suggestion
            ? `${escapeHtml(p.word)} — did you mean <b>${p.suggestion}</b>?`
            : `${escapeHtml(p.word)} — not a pod command`,
        )
        .join('<br>') +
      `</p>`
    : ''

// A command that has moved says where it went, rather than silently doing
// nothing on a page that still asks for it.
const retiredHtml = text => {
  const moved = ['TWIN', 'WATCH', 'ROSTER']
    .filter(word => hasCommand(text, word))
    .map(word => [word, retirementOf(word)])
  return moved.length
    ? `<p class=pod-retired style="color:#666;font-size:80%;text-align:center;margin:0 0 6px">` +
      moved.map(([word, became]) => `${word} — now ${escapeHtml(became)}`).join('<br>') +
      `</p>`
    : ''
}

const portSuffix = () => ([80, '80', '', null].includes(location.port) ? '' : `:${location.port}`)

export const emit = (div, item) => {
  const suffix = portSuffix()
  const kinds = parseKinds(item.text)
  const showHeadings = argumentOf(item.text, 'TITLE')
  const notes = problemsHtml(problems(item.text)) + retiredHtml(item.text)

  if (div.closest('.page').hasClass('remote')) {
    div.html(
      `<div class=pod style="background-color:#eee;padding:15px"><center>` +
      `<p class=caption>Pod is only available when viewed on a page's home wiki.</p></div>`,
    )
    return
  }

  div.html(`${notes}<div class=pod-gather><p class=caption>gathering…</p></div>`)

  // The roster text: a heading, a BLANK LINE, then one domain per line, and a
  // blank line again between groups. That is wiki-plugin-roster's own markup —
  // categories are the lines that are not domains, and a blank line starts a new
  // display line, which is what puts the heading on a line of its own with the
  // flags in a row beneath it. Without the blank line roster runs them together:
  // "Sisters of demo.localhost [flag] [flag]" on one line.
  //
  // This same string draws the item and, saved, becomes an ordinary roster item
  // on a page any wiki can read.
  const rosterText = (groups, origin) =>
    kinds
      .map(kind => {
        const sites = groups[kind] || []
        if (!sites.length) return ''
        const heading = showHeadings ? (HEADING[kind] || kind).replace('{site}', origin) + '\n\n' : ''
        return heading + sites.join('\n')
      })
      .filter(Boolean)
      .join('\n\n')

  const render = (groups, origin) => {
    // Register the disk-derived members as neighbours so their pages join search
    // and lineage — the reason a pod item is worth having on a page at all.
    for (const kind of kinds) {
      if (!SERVER_KINDS.includes(kind)) continue
      for (const site of groups[kind] || []) wiki.neighborhoodObject.registerNeighbor(site + suffix)
    }

    const text = rosterText(groups, origin)
    const target = div.find('.pod-gather')
    target.empty()
    if (!text) return target.html('<p class=caption><i>none</i></p>')

    wiki.getPlugin('roster', roster => {
      target.empty()
      roster.emit(target, { type: 'roster', id: `${item.id}-roster`, text })
      // Freeze — the same text, saved as a real roster item on a new page.
      const icon = $(
        '<span class=pod-freeze-icon title="Freeze — save this gather as a roster page" ' +
        'style="position:absolute;top:6px;right:9px;cursor:pointer;font-size:14px;opacity:.55">❄</span>',
      )
      icon.on('click', () => {
        const title = kinds.map(k => (HEADING[k] || k).replace('{site}', origin)).join(', ')
        const page = wiki.newPage({
          title,
          story: [{ type: 'roster', id: Math.floor(Math.random() * 0xffffffffffff).toString(16).padStart(12, '0'), text }],
        })
        wiki.showResult(page, { $page: div.parents('.page') })
      })
      div.css('position', 'relative').append(icon)
    })
  }

  // Only the disk-derived pods need asking; NEIGHBOURHOOD and SNAPSHOT are
  // already in the browser.
  const neighbourhood = () => Object.keys(wiki.neighborhood).map(key => (suffix && key.endsWith(suffix) ? key.slice(0, -suffix.length) : key))
  const localGroups = () => {
    const groups = {}
    for (const kind of kinds) if (!SERVER_KINDS.includes(kind)) groups[kind] = neighbourhood()
    return groups
  }

  const serverKinds = kinds.filter(k => SERVER_KINDS.includes(k))
  if (serverKinds.length === 0) {
    render(localGroups(), location.hostname)
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
    .then(data => render({ ...(data.groups || {}), ...localGroups() }, data.origin || location.hostname))
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
