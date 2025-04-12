-- CreateEnum
CREATE TYPE "SearchResultStatus" AS ENUM ('raw', 'processed', 'duplicate');

-- AlterTable
ALTER TABLE "search_results" 
ADD COLUMN "status" "SearchResultStatus" NOT NULL DEFAULT 'raw',
ADD COLUMN "duplicate_of_id" UUID,
ADD COLUMN "processing_metadata" JSONB,
ADD CONSTRAINT "search_results_duplicate_of_id_fkey" FOREIGN KEY ("duplicate_of_id") REFERENCES "search_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "raw_search_results" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "search_request_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "raw_search_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_relationships" (
    "id" UUID NOT NULL DEFAULT uuid_generate_v4(),
    "original_result_id" UUID NOT NULL,
    "duplicate_result_id" UUID NOT NULL,
    "confidence_score" DOUBLE PRECISION,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_relationships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "raw_search_results_search_request_id_idx" ON "raw_search_results"("search_request_id");

-- CreateIndex
CREATE INDEX "duplicate_relationships_original_result_id_idx" ON "duplicate_relationships"("original_result_id");

-- CreateIndex
CREATE INDEX "duplicate_relationships_duplicate_result_id_idx" ON "duplicate_relationships"("duplicate_result_id");

-- AddForeignKey
ALTER TABLE "raw_search_results" ADD CONSTRAINT "raw_search_results_search_request_id_fkey" FOREIGN KEY ("search_request_id") REFERENCES "search_requests"("query_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_relationships" ADD CONSTRAINT "duplicate_relationships_original_result_id_fkey" FOREIGN KEY ("original_result_id") REFERENCES "search_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_relationships" ADD CONSTRAINT "duplicate_relationships_duplicate_result_id_fkey" FOREIGN KEY ("duplicate_result_id") REFERENCES "search_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;
