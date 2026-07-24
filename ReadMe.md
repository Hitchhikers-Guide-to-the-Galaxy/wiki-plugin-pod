# Federated Wiki - Family Plugin

Plugin type: `family`. Gathers configurable **families of related wiki sites**
and adds them to your neighborhood. An augmentation of the
[Present](https://github.com/wardcunningham/wiki-plugin-present) plugin: instead
of only listing sister sites, the item text is a list of keywords choosing
*which* families to gather.

## Commands (one per line in the item text)

The item text follows the [fedwiki DSL convention](../../.claude/skills/fedwiki-dsl/SKILL.md):
each line is a **command** — UPPERCASE is canonical, input case is forgiven, and
a single trailing colon (YAML-style) is optional.

| Command | Gathers | Source |
|---|---|---|
| `FAMILY` | `PARENT` + `SISTERS` together (shorthand) | server |
| `SISTERS` | sibling sites sharing the parent domain | server |
| `PARENT` | the parent-domain site itself | server |
| `CHILDREN` | direct sub-domains of this site | server |
| `DESCENDANTS` | all sub-domains, any depth | server |
| `FARM` | every wiki in the farm | server |
| `NEIGHBOURHOOD` | the sites currently in your neighborhood | client |
| `SNAPSHOT` | freeze the current neighborhood (v0.1 == NEIGHBOURHOOD) | client |

Example item text:

```
FAMILY
```

## Actions

Actions are not site-kinds — they change what the panel *does* with the family
it gathered. Add one on its own line alongside the kind commands.

| Action | Effect |
|---|---|
| `FREEZE` | show a button that saves the gathered family as a **roster** ghost page (one roster item per kind) |
| `TWIN` | show a roster of the family members that hold a page with **this page's slug** |
| `FORK` | show a roster of the family members whose copy of this page is *actually a fork* of it |

`TWIN` and `FORK` both turn the panel into a compact **roster of flags** — like a
roster item, the members' flags flow inline, each linking to that member's copy
of the page, with the (sub)domain shown on hover (no titles, since every copy is
the same page). They differ only in how strict the match is:

- **`TWIN`** is **existence-only**, exactly like the wiki-client *Twins* strip: a
  slug match in the member's sitemap. Cheap — read straight from the neighbourhood.
- **`FORK`** is **lineage-aware**: it fetches each twin's page JSON and keeps only
  those whose journal carries a `fork` event. So `FORK ⊆ TWIN` — a page that
  merely shares the name but was authored independently is a twin, not a fork.

Example — watch who among your sisters has forked the page you're on:

```
SISTERS
FORK
```

## Build

```
npm install
npm run build      # esbuild: src/client/family.js -> client/family.js
```

## How it differs from Present

Present computes peers from the farm *root* (`argv.data`), which misfires in a
farm laid out as `{farm}/{sub}.{domain}/`. Family derives the origin from the
*requesting* site (`argv.status`) and resolves each family relative to it.

## License

MIT
