# Paper Pages API: Findings and add-on ideas

Current app already hits `/api/daily_papers`, `/api/papers/{id}`, and `/api/arxiv/{id}/repos`, but it only uses a small subset of the payload. Below are fields seen in live calls and concrete things we can wire up next.

## Endpoint notes (with sample responses)
- `GET /api/daily_papers` (tested `limit=2` and `date=2025-03-31&limit=1`): returns a top-level paper plus a nested `paper` object. Extra fields we do not surface yet: `ai_summary`, `ai_keywords[]`, `thumbnail`/`mediaUrls`, `discussionId`, `numComments`, `githubRepo`, `projectPage`, `submittedOnDailyBy { user/avatar }`, `organization { name, avatar }`, and `upvotes`. Supports params: `limit`, `p` (page), `submitter`, `date|week|month`, `sort=publishedAt|trending`.
- `GET /api/papers/{arxiv_id}` (tested `2511.20639`): returns the same paper plus submitter, `discussionId`, `githubRepo`, `organization`, `ai_summary`, `ai_keywords`, and timestamps. Good source for enriching a single paper card/detail.
- `GET /api/arxiv/{arxiv_id}/repos` (tested `2511.20639` → empty, `2403.12015` → data): returns `models[]`, `datasets[]`, `spaces[]` with `likes`, `downloads`, `tags` (includes `arxiv:*`, `pipeline_tag`), `lastModified`, `author`, and for Spaces, `cardData` (title, emoji, colors), `sdk`, `subdomain`. This is richer than the current minimal `id/likes/author` parsing.
- `GET /api/papers/search?q=latent`: returns papers with `highlightedTitle/highlightedSummary` segments, `githubStars`, `upvotes`, `numComments`, `isAuthorParticipating`, and the standard paper metadata. Useful for keyword search UX.

## Integration ideas for HuggingXiv
- Enrich paper cards/detail with `ai_summary` as a short blurb and `ai_keywords` as chips; show `thumbnail/mediaUrls` for better visuals.
- Surface social/contextual data: `upvotes`, `numComments`, `discussionId` → link to HF discussion, `submittedOnDailyBy` and `organization` badges, `githubRepo`/`projectPage` buttons, and (from search) `githubStars`.
- Expand filters: use `date|week|month`, `submitter`, `sort=trending`, and `limit/p` to add paging and a “Trending / Latest” toggle alongside the existing calendar picker.
- Improve “Associated Resources”: pull `downloads`, `pipeline_tag`, `lastModified`, and Space `cardData` from `/api/arxiv/{id}/repos`; show counts (models/datasets/spaces) even when lists are long, not just the first few.
- Provide richer share/download CTAs in detail view: “Open on HF”, “View GitHub”, “Launch demo Space”, “Download model/dataset”.
