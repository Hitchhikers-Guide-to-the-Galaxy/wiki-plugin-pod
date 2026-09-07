# Federated Wiki - Pod Plugin

Plugin type: `pod`. Gathers configurable **pods of related wiki sites**
and adds them to your neighborhood. An augmentation of the
[Present](https://github.com/wardcunningham/wiki-plugin-present) plugin: instead
of only listing sister sites, the item text is a list of keywords choosing
*which* pods to gather.

## Commands (one per line in the item text)

The item text follows the [fedwiki DSL convention](../../.claude/skills/fedwiki-dsl/SKILL.md):
each line is a **command** — UPPERCASE is canonical, input case is forgiven, and
a single trailing colon (YAML-style) is optional.

| Command | Gathers | Source |
|---|---|---|
| `POD` | `PARENT` + `SISTERS` together (shorthand) | server |
| `SISTERS` | sibling sites sharing the parent domain | server |
| `PARENT` | the parent-domain site itself | server |
| `CHILDREN` | direct sub-domains of this site | server |
| `DESCENDANTS` | all sub-domains, any depth | server |
| `FARM` | every wiki in the farm | server |
| `NEIGHBOURHOOD` | the sites currently in your neighborhood | client |
| `SNAPSHOT` | freeze the current neighborhood (v0.1 == NEIGHBOURHOOD) | client |

Example item text:

```
POD
```

### Mistyped commands

A misspelled command is not swallowed as data. `CHIKDREN` names nothing, so the
item would otherwise fall back to `SISTERS` and draw a pod nobody asked for.
Instead the panel says *CHIKDREN — did you mean CHILDREN?* above the gather. A
word that announces itself as a command (uppercase, the fedwiki convention) but
names none is always reported, with a suggestion where a real command is within
a typo or two. Ordinary lowercase prose stays data.

This is not pod's code: it is `@fortyfoxes/wiki-dsl`, so every plugin whose item
text is a small language gets the same report from the same lines.

## How it draws

Every pod is drawn as a **roster**: a heading, then the members' flags. Pod does
not draw it — `wiki-plugin-roster` does, on every wiki there is, so pod builds
the roster text and hands it over. The text it builds is exactly what the ❄ icon
saves as a page, so the drawn thing and the saved thing are one string.

Each group's heading names the site the pod is relative to — *Sisters of
fedwiki.club*, *Children of ide.earth*, *The rest of the farm*, *Your
neighbourhood* — which is the one thing a reader landing cold cannot work out.

| Command | Effect |
|---|---|
| `TITLE no` | draw the flags with no headings |

## Retired commands

`ROSTER`, `TWIN` and `WATCH` are kept in the table rather than deleted, because a
word removed from the table is a word the parser reports as a mistake — and 11
live items say `ROSTER`, 9 say `TWIN` or `WATCH`. They parse, gather nothing, and
say what became of them:

- **`ROSTER`** — the default now. Nothing to say.
- **`TWIN`** and **`WATCH`** — moved to
  [wiki-plugin-twin](https://github.com/Hitchhikers-Guide-to-the-Galaxy/wiki-plugin-twin),
  which asks who holds *this page* rather than who is kin to *this site*.

## Saving a roster page

A subtle **❄ icon** in the corner saves the gathered pod as a **roster page**,
titled after the groups it holds (e.g. *Parent of ide.earth, Sisters of
ide.earth*). What it saves is the same roster text the item is drawing, so the
page is an ordinary roster item that any wiki can read with no pod installed.
(There is no `FREEZE` command — the icon replaces it.)

Example — the whole pod, flags only:

```
POD
TITLE no
```

## Build

```
npm install
npm run build      # esbuild: src/client/pod.js -> client/pod.js
```

## How it differs from Present

Present computes peers from the farm *root* (`argv.data`), which misfires in a
farm laid out as `{farm}/{sub}.{domain}/`. Pod derives the origin from the
*requesting* site (`argv.status`) and resolves each pod relative to it.

## License

MIT

## The interface it declares

The plugin ships no server of its own for this — it declares a specification and
a module of plain functions, and the Farm Plugin mounts them:

    GET /system/api/pod/roll.json?kinds=children,sisters

The answer depends on the site it is asked at, so `origin` and `farmRoot` are
declared as context in the specification and supplied by the farm. Each group is
a list of site names.

**The browser reads that same mount.** There is no second route wrapping the
same handler for the client's benefit — the item fetches
`/system/api/pod/roll.json?kinds=…`, the address an agent uses. So this plugin
carries no server component, no express route and no CommonJS/ESM loader
hazard, and `wiki-plugin-farm` is declared in `fedwiki.requires`: without it the
disk-derived pods say so rather than failing quietly.

Kinship itself is arithmetic on names (`src/pod/kinship.js`), and the only thing
needing the disk is what sites exist — one directory read, no page counts, since
the client takes counts and freshness from each neighbour's own sitemap.

## One vocabulary

`src/pod/commands.js` is the single table of what a pod item's text may
say. The client imports it to parse; the API declaration names it so the farm
reads the same one. Each command declares which kind it is, because a command
language is a superset of an interface:

| Kind | Commands | Reaches the farm |
|---|---|---|
| parameter | `SISTERS` `PARENT` `CHILDREN` `DESCENDANTS` `FARM` | yes — a value of `kinds` |
| macro | `POD` | via `PARENT` + `SISTERS` |
| presentation | `TITLE` | no — a drawing choice |
| client-data | `NEIGHBOURHOOD` `SNAPSHOT` | no — only a browser holds it |
| alias | `NEIGHBORHOOD` | resolves to `NEIGHBOURHOOD` |
| retired | `ROSTER` `TWIN` `WATCH` | no — kept so pages that say them still parse |

The `kinds` parameter's allowed values are derived from that table rather than
written a second time, and so are the group headings. The **parser** is not
written here either: it is [@fortyfoxes/wiki-dsl](https://github.com/Hitchhikers-Guide-to-the-Galaxy/wiki-dsl),
bundled at build time and shared with every other plugin whose item text is a
small language — including the mistyped-command report. `npm test` checks this
table; the library has its own tests; the farm checks the table against the
specification.
