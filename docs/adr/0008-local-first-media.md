# 8. Local-first media, pluggable providers

- **Status:** Accepted
- **Date:** 2026-09-11

## Context

Video is the primary content type in most courses, and it is also the most
expensive thing to operate. The previous system hard-coded a single commercial
provider throughout: the upload controller, the playback endpoint, and the
transcription service all called one vendor's API directly, the studio imported
that vendor's player and uploader components, and a half-finished migration to a
second provider left dead code paths behind.

That has three costs. Self-hosters cannot run the product without a paid
account. The project cannot adopt a better or cheaper provider without touching
application code. And an open-source video project that should be a natural
partner instead requires the operator to bring a GPU account and a specific
object-storage vendor.

The realistic options are very different from each other:

- **Local filesystem.** Zero external services. Playable browser-native formats
  only. Scaling across hosts requires shared storage.
- **S3-compatible storage.** Cheap, provider-agnostic, but provides no
  transcoding. R2/S3 alone does not turn a 4 GB MOV into adaptive HLS.
- **Cloudflare Stream, Mux.** Full managed pipeline, no infrastructure, metered
  cost, vendor lock-in on playback tokens.
- **OpenVOD.** Open-source, but bring-your-own-keys: it needs Cloudflare R2 plus
  a Modal GPU account for the full transcoding pipeline, and its delivery path is
  Cloudflare-only.

## Decision

Separate **storage**, **processing**, and **playback** as distinct capabilities
behind one provider interface, and make the **zero-service path the default**.

The default install ships local filesystem storage and browser-native playback.
Text, file, caption, and external-embed lessons work with no provider at all,
and local MP4 playback supports range requests so seeking works.

Providers are optional adapters implementing a common interface
(`createUploadSession`, `getAsset`, `getPlayback`, `deleteAsset`,
`listCaptions`, `requestTranscription`, `verifyWebhook`). Launch adapters:
local filesystem, S3-compatible, and OpenVOD. Cloudflare Stream and Mux follow
the same interface when needed.

**Provider selection is per asset, not per workspace.** Changing a workspace
default affects new uploads and never rewrites how existing media is served. An
asset stores the connection that produced it, permanently.

**OpenVOD is an integration, not a bundling.** It is deployed independently and
reached over its API. Its Cloudflare and Modal requirements are documented as
OpenVOD's requirements, not as Docento's, and are never part of a basic install.

Playback URLs are always resolved server-side and short-lived. The client never
receives a durable media URL, and access is checked at play time against
enrollment — not at the time the page was rendered.

## Consequences

**What this buys.**

- A complete install with no external account. This matters more than any
  individual provider integration.
- Swapping providers is an adapter, not a refactor. The previous system's
  half-migrated state is not repeatable.
- Self-hosters with existing object storage can use it; self-hosters without can
  ignore it.
- Private uploaded media has real access control. Public third-party embeds
  (YouTube, Vimeo) do not, and the docs say so plainly rather than implying
  equivalence.

**What this costs.**

- The lowest common denominator is browser-native formats. Adaptive bitrate
  streaming, cross-format transcoding, and thumbnails require a provider; local
  installation cannot produce them, and the UI has to be honest about that
  rather than silently accepting an unplayable upload.
- One interface spanning very different implementations — a filesystem and a
  managed pipeline — will always be slightly awkward. Some capabilities are
  optional and must be advertised per provider rather than assumed.
- Media assets are workspace-owned and reference-counted across courses, so
  deletion is a lifecycle problem, not a cascade. Getting this wrong deletes
  another course's video.
- Running the API and worker as separate containers with local storage requires
  both to mount the same uploads volume. This is a deployment invariant that must
  be demonstrated in the compose file and documented, because the failure mode is
  a worker that silently cannot find files.

**Explicitly deferred.** Adaptive streaming, DRM, automatic transcription as a
default, and additional commercial providers. The interface exists so they can
be added without re-arguing this decision.
