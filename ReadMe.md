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
| `FORK` | filter each gathered family down to the members whose sitemap already holds **this page's slug** — who in your family has *forked* the page you are viewing |

`FORK` is an **existence-only** check, exactly like the wiki-client *Twins*
strip: a slug match in the family member's sitemap, with no journal or lineage
inspection. A group with no match is omitted entirely, so the panel only grows
an element when a family member has actually forked the page. Each fork row's
flag links straight to that member's copy of the page.

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
