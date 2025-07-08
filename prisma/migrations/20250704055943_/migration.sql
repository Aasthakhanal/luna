-- CreateEnum
CREATE TYPE "PhaseType" AS ENUM ('menstruation', 'follicular', 'ovulation', 'luteal');

-- CreateTable
CREATE TABLE "phases" (
    "id" SERIAL NOT NULL,
    "cycle_id" INTEGER NOT NULL,
    "type" "PhaseType" NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "phases_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "phases" ADD CONSTRAINT "phases_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;
