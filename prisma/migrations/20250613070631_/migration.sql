/*
  Warnings:

  - Added the required column `user_id` to the `period_days` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "period_days" ADD COLUMN     "user_id" INTEGER NOT NULL;
