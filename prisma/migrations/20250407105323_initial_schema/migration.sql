-- CreateEnum
CREATE TYPE "TagEnum" AS ENUM ('include', 'exclude', 'maybe');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT,
    "created_at" TIMESTAMPTZ(6),
    "last_login" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "search_requests" (
    "query_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "query" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "filters" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "search_title" TEXT,
    "is_saved" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "search_requests_pkey" PRIMARY KEY ("query_id")
);

-- CreateTable
CREATE TABLE "search_results" (
    "id" UUID NOT NULL,
    "query_id" UUID NOT NULL,
    "title" TEXT,
    "url" TEXT,
    "snippet" TEXT,
    "rank" INTEGER,
    "result_type" TEXT,
    "search_engine" TEXT,
    "device" TEXT,
    "location" TEXT,
    "language" TEXT,
    "total_results" INTEGER,
    "credits_used" INTEGER,
    "search_id" TEXT,
    "search_url" TEXT,
    "related_searches" JSONB,
    "similar_questions" JSONB,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "raw_response" JSONB,
    "deduped" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "search_results_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "duplicate_log" (
    "duplicate_id" UUID NOT NULL,
    "original_result_id" UUID,
    "duplicate_url" TEXT,
    "search_engine" TEXT,
    "reason" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "duplicate_log_pkey" PRIMARY KEY ("duplicate_id")
);

-- CreateTable
CREATE TABLE "review_tags" (
    "id" UUID NOT NULL,
    "result_id" UUID NOT NULL,
    "tag" "TagEnum",
    "exclusion_reason" TEXT,
    "notes" TEXT,
    "retrieved" BOOLEAN NOT NULL DEFAULT false,
    "reviewer_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "review_tags_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- AddForeignKey
ALTER TABLE "search_requests" ADD CONSTRAINT "search_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "search_results" ADD CONSTRAINT "search_results_query_id_fkey" FOREIGN KEY ("query_id") REFERENCES "search_requests"("query_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "duplicate_log" ADD CONSTRAINT "duplicate_log_original_result_id_fkey" FOREIGN KEY ("original_result_id") REFERENCES "search_results"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_tags" ADD CONSTRAINT "review_tags_result_id_fkey" FOREIGN KEY ("result_id") REFERENCES "search_results"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "review_tags" ADD CONSTRAINT "review_tags_reviewer_id_fkey" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
