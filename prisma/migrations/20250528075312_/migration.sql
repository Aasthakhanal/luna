-- CreateEnum
CREATE TYPE "FlowLevel" AS ENUM ('spotting', 'light', 'medium', 'heavy');

-- CreateTable
CREATE TABLE "period_days" (
    "id" SERIAL NOT NULL,
    "cycle_id" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "flow_level" "FlowLevel" NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "period_days_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "period_days" ADD CONSTRAINT "period_days_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
