# Deck architectures

Two deck types are in scope. The slide lists are the shapes of decks that worked; adapt
them to the material, never pad to match them.

## 1. Journal club (one paper)

Recurring decisions: the background a non-specialist needs is taught in ≤ 2 slides;
derivations and secondary results go to hidden backups; **a whole-method pipeline slide
is mandatory**; the deck stands alone (no invented lineage to papers presented before).

A typical 12-slide shape:

1. Cover — meeting, title, method name, authors, journal and year
2. Why the problem matters (what is missing without this method)
3. Why the naive approach fails — the paper's core obstacle, drawn
4. The key idea — ideally the paper's own one-picture explanation
5. Pipeline end to end — inputs → steps → read-out, data visibly flowing
6. A worked or toy example from the paper
7. Simulation design
8. Simulation results — one figure, one or two sentences of interpretation
9. Real-data results or a second result figure
10. What changes the answer (sensitivity: reference data, priors, settings)
11. Limitations — 4–6 label + one-line rows
12. Take-home — three numbered points

Hidden backups: positioning among related methods · glossary and every number on the
main slides with its source (figure, table, page) · runtimes and implementation detail ·
paper-internal inconsistencies, stated as found · "relevance to our work" (keep hidden
unless asked).

`examples/finemap-demo/` in the repository follows this shape on simulated data (a methods
tutorial rather than a paper).

## 2. Research progress (your own method)

1. Cover — "Research progress", method name, one-line expansion, date, presenter
2. Section 01 — Background
3. The existing approach, drawn
4. Where it falls short (comparison table or 3 short points)
5. Section 02 — Method
6. Model idea, drawn
7. The model, one equation per level, each term labelled
8. Inference and decision criteria (convergence checks stated)
9. Section 03 — Results
10. Main result figure (one per slide; the figure carries the slide)
11. Comparison with the previous approach
12. Diagnostics / decomposition
13. Limitations and next steps
14. Take-home
15+. (Supp.) per-dataset result figures, hidden

Progress decks are figure-dominant: the result figure carries the slide; text is a
title and a few labels. Equations are native (OMML) and labelled term by term.
`examples/synthetic-demo/` shows the section dividers, cards, rows and take-home slide.
