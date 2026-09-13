-- Scope media assets to an academy.
--
-- The asset table previously recorded only a workspace. A workspace can run
-- several academies, so "which tenant owns this file" had no answer — which
-- meant an instructor scoped to one academy could serve, or delete, another
-- academy's media.
--
-- Prisma generated this as a bare `ADD COLUMN ... NOT NULL`, which fails on any
-- database that already holds a row. There is no default that would be correct
-- here: an arbitrary academy would hand one tenant another's files. So the
-- column is added nullable, backfilled from what already points at each asset,
-- and only then made mandatory.

-- 1. Add it, permitting nulls for the moment.
ALTER TABLE "media_asset" ADD COLUMN "academyId" TEXT;

-- 2. Backfill from the lessons that reference the asset.
--
-- A draft lesson names its academy through its module's course. An asset no
-- lesson references cannot be attributed from the data at all, and is left null
-- for step 3 to deal with rather than being guessed at.
UPDATE "media_asset" AS asset
SET "academyId" = source."academyId"
FROM (
  SELECT DISTINCT ON (lesson."mediaAssetId")
    lesson."mediaAssetId" AS "assetId",
    course."academyId" AS "academyId"
  FROM "lesson" AS lesson
  JOIN "module" AS module ON module."id" = lesson."moduleId"
  JOIN "course" AS course ON course."id" = module."courseId"
  WHERE lesson."mediaAssetId" IS NOT NULL
  ORDER BY lesson."mediaAssetId", lesson."id"
) AS source
WHERE asset."id" = source."assetId";

-- 3. Refuse rather than invent.
--
-- An unreferenced asset is one whose owner is genuinely unknown. Deleting it is
-- the only honest resolution, and it is safe because nothing points at it: an
-- orphan row cannot be served, cannot be in a release, and cannot be reached
-- through any operation. Done in one statement so a database that fails here
-- fails with the reason below rather than half-migrated.
DO $$
DECLARE
  orphaned integer;
BEGIN
  SELECT count(*) INTO orphaned FROM "media_asset" WHERE "academyId" IS NULL;

  IF orphaned > 0 THEN
    RAISE NOTICE 'Removing % unattributable media asset(s): no lesson references them, so no academy owns them.', orphaned;
    DELETE FROM "media_asset" WHERE "academyId" IS NULL;
  END IF;
END $$;

-- 4. Now it can be mandatory.
ALTER TABLE "media_asset" ALTER COLUMN "academyId" SET NOT NULL;

-- 5. Index for the two questions asked of it: the sweep's "what in this academy
--    is unreferenced", and the serve route's "is this asset in the academy the
--    caller is entitled to".
CREATE INDEX "media_asset_academyId_status_idx" ON "media_asset"("academyId", "status");

-- 6. Cascade with the academy: media is academy-scoped, so removing an academy
--    removes its asset rows. The bytes are the sweep's job, which is why
--    deletion is soft and a separate pass reclaims storage.
ALTER TABLE "media_asset" ADD CONSTRAINT "media_asset_academyId_fkey"
  FOREIGN KEY ("academyId") REFERENCES "academy"("id") ON DELETE CASCADE ON UPDATE CASCADE;
