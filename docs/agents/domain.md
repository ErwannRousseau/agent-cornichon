# Domain Docs

How the engineering skills should consume this repo's domain documentation when
exploring the codebase.

## Before exploring, read these

- `GLOSSARY.md` at the repo root, or
- `GLOSSARY-MAP.md` at the repo root if it exists. It points to one
  `GLOSSARY.md` per context; read each one relevant to the topic.
- `docs/adr/`: read ADRs that touch the area you're about to work in.

If any of these files don't exist, proceed silently. Don't flag their absence or
suggest creating them upfront. The domain-modeling skill creates them lazily
when terms or decisions are resolved.

## File structure

This repo uses the single-context layout:

```text
/
├── GLOSSARY.md
├── docs/adr/
└── src/
```

## Use the glossary's vocabulary

When your output names a domain concept, use the term as defined in
`GLOSSARY.md`. If the concept isn't in the glossary, reconsider whether the
project uses that language or note the gap for domain modeling.

## Flag ADR conflicts

If your output contradicts an existing ADR, surface it explicitly rather than
silently overriding it.
