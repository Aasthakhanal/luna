/*
  Warnings:

  - Added the required column `predicted_start_date` to the `cycles` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "IrregularityType" AS ENUM ('short_cycle', 'long_cycle', 'missed_period', 'heavy_flow', 'light_flow', 'other');

-- AlterTable
ALTER TABLE "cycles" ADD COLUMN     "predicted_start_date" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "irregularities" (
    "id" SERIAL NOT NULL,
    "user_id" INTEGER NOT NULL,
    "cycle_id" INTEGER NOT NULL,
    "irregularity_type" "IrregularityType" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "irregularities_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "irregularities" ADD CONSTRAINT "irregularities_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "irregularities" ADD CONSTRAINT "irregularities_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
