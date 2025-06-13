-- CreateTable
CREATE TABLE "gynecologists" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "distance" DECIMAL(65,30) NOT NULL,
    "phone" TEXT,
    "specialty" TEXT NOT NULL,
    "latitude" DECIMAL(65,30) NOT NULL,
    "longitude" DECIMAL(65,30) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "gynecologists_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "irregularities_gynecologists" (
    "id" SERIAL NOT NULL,
    "irregularity_id" INTEGER NOT NULL,
    "gynecologist_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "irregularities_gynecologists_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "irregularities_gynecologists" ADD CONSTRAINT "irregularities_gynecologists_irregularity_id_fkey" FOREIGN KEY ("irregularity_id") REFERENCES "irregularities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "irregularities_gynecologists" ADD CONSTRAINT "irregularities_gynecologists_gynecologist_id_fkey" FOREIGN KEY ("gynecologist_id") REFERENCES "gynecologists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
