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

## Actions

Actions are not site-kinds — they change what the panel *does* with the pod
it gathered. Add one on its own line alongside the kind commands.

| Action | Effect |
|---|---|
| `ROSTER` | draw the gather compactly, **mirroring a normal roster item** — a left-aligned "&lt;commands&gt; Rosters" title over flowing flags, instead of the wide table |
| `TWIN` | show only the members that hold a page with **this page's slug** |
| `WATCH` | show only the members whose copy of this page is *actually a fork* of it — i.e. who is watching (tracking) your page |
| `TITLE yes\|no` | whether the `ROSTER` title shows (default `yes`). `TITLE no` hides it, keeping even padding around the flags |

`ROSTER`, `TWIN` and `WATCH` all render as a compact **roster of flags** — the
members' `img.remote` flags flow inline in the grey box, each linking to that
member's copy of the page, the (sub)domain shown on hover. `ROSTER` shows the
whole gather; `TWIN`/`WATCH` filter it:

- **`TWIN`** is **existence-only**, exactly like the wiki-client *Twins* strip: a
  slug match in the member's sitemap. Cheap — read straight from the neighbourhood.
- **`WATCH`** is **lineage-aware**: it fetches each twin's page JSON and keeps only
  those whose journal carries a `fork` event. So `WATCH ⊆ TWIN` — a page that
  merely shares the name but was authored independently is a twin, not a fork.

### Saving a roster page

The `ROSTER` view and the wide table both carry a subtle **❄ icon** in the corner
that saves the gathered pod as a **roster ghost page** titled after the
commands (e.g. `PARENT SISTERS Rosters`), one roster item per kind. (There is no
separate `FREEZE` command — the icon replaces it.)

Example — watch who among your sisters is tracking the page you're on:

```
SISTERS
WATCH
```

Example — a compact roster of the whole pod, no title:

```
POD
ROSTER
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
declared as context in the specification and supplied by the farm. The plugin's
own route `/plugin/pod/roll` is unchanged and still answers identically.

## One vocabulary

`src/pod/commands.js` is the single table of what a pod item's text may
say. The client imports it to parse; the API declaration names it so the farm
reads the same one. Each command declares which kind it is, because a command
language is a superset of an interface:

| Kind | Commands | Reaches the farm |
|---|---|---|
| parameter | `SISTERS` `PARENT` `CHILDREN` `DESCENDANTS` `FARM` | yes — a value of `kinds` |
| macro | `POD` | via `PARENT` + `SISTERS` |
| presentation | `ROSTER` `TITLE` | no — a drawing choice |
| client-data | `NEIGHBOURHOOD` `SNAPSHOT` `TWIN` `WATCH` | no — only a browser holds it |
| alias | `NEIGHBORHOOD` | resolves to `NEIGHBOURHOOD` |

The `kinds` parameter's allowed values are derived from that table rather than
written a second time. `npm test` checks the parser against it; the farm checks
it against the specification.
