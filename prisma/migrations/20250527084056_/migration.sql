/*
  Warnings:

  - Changed the type of `type` on the `otps` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('registration', 'reset');

-- AlterTable
ALTER TABLE "otps" DROP COLUMN "type",
ADD COLUMN     "type" "OtpType" NOT NULL;
