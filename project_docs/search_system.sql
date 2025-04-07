-- User accounts
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Search requests (query strings)
CREATE TABLE search_requests (
    query_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    source TEXT NOT NULL,
    filters JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    search_title TEXT,
    is_saved BOOLEAN DEFAULT FALSE
);

-- Search results (cleaned + deduplicated)
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    query_id UUID REFERENCES search_requests(query_id) ON DELETE CASCADE,
    title TEXT,
    url TEXT,
    snippet TEXT,
    rank INTEGER,
    result_type TEXT,
    search_engine TEXT,
    device TEXT,
    location TEXT,
    language TEXT,
    total_results INTEGER,
    credits_used INTEGER,
    search_id TEXT,
    search_url TEXT,
    related_searches JSONB,
    similar_questions JSONB,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    raw_response JSONB,
    deduped BOOLEAN DEFAULT TRUE
);

-- Deduplication log (optional)
CREATE TABLE duplicate_log (
    duplicate_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    original_result_id UUID REFERENCES search_results(id) ON DELETE SET NULL,
    duplicate_url TEXT,
    search_engine TEXT,
    reason TEXT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review tags and notes
CREATE TABLE review_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    result_id UUID REFERENCES search_results(id) ON DELETE CASCADE,
    tag TEXT CHECK (tag IN ('include', 'exclude', 'maybe')),
    exclusion_reason TEXT,
    notes TEXT,
    retrieved BOOLEAN DEFAULT FALSE,
    reviewer_id UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
