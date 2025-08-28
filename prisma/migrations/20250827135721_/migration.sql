/*
  Warnings:

  - The values [heavy_flow,light_flow] on the enum `IrregularityType` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "IrregularityType_new" AS ENUM ('short_cycle', 'long_cycle', 'missed_period', 'other');
ALTER TABLE "irregularities" ALTER COLUMN "irregularity_type" TYPE "IrregularityType_new" USING ("irregularity_type"::text::"IrregularityType_new");
ALTER TYPE "IrregularityType" RENAME TO "IrregularityType_old";
ALTER TYPE "IrregularityType_new" RENAME TO "IrregularityType";
DROP TYPE "IrregularityType_old";
COMMIT;
