-- SEO Social MCP Toolkit - Initial Schema
-- Migration 001: Create core tables for post tracking and idempotency

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Table: post_requests
-- Stores all incoming publish requests with content and metadata
CREATE TABLE IF NOT EXISTS post_requests (
    request_id TEXT PRIMARY KEY,
    content_json JSONB NOT NULL,
    content_hash TEXT NOT NULL,
    targets_json JSONB NOT NULL,
    options_json JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for faster content_hash lookups (detect duplicates)
CREATE INDEX idx_post_requests_content_hash ON post_requests(content_hash);
CREATE INDEX idx_post_requests_created_at ON post_requests(created_at DESC);

-- Table: post_drafts
-- Stores generated drafts for each platform
CREATE TABLE IF NOT EXISTS post_drafts (
    id SERIAL PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES post_requests(request_id) ON DELETE CASCADE,
    drafts_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_drafts_request_id ON post_drafts(request_id);

-- Table: post_results
-- Stores per-target publish results
CREATE TABLE IF NOT EXISTS post_results (
    id SERIAL PRIMARY KEY,
    request_id TEXT NOT NULL REFERENCES post_requests(request_id) ON DELETE CASCADE,
    target TEXT NOT NULL,
    status TEXT NOT NULL,
    platform_id TEXT,
    platform_url TEXT,
    error_message TEXT,
    posted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_post_results_request_id ON post_results(request_id);
CREATE INDEX idx_post_results_target ON post_results(target);
CREATE INDEX idx_post_results_status ON post_results(status);
CREATE INDEX idx_post_results_created_at ON post_results(created_at DESC);

-- Composite index for idempotency checks
CREATE UNIQUE INDEX idx_post_results_unique_target ON post_results(request_id, target);

-- Comments for documentation
COMMENT ON TABLE post_requests IS 'Stores all publish requests with content and idempotency tracking';
COMMENT ON TABLE post_drafts IS 'Stores platform-specific drafted content';
COMMENT ON TABLE post_results IS 'Stores per-platform publish results for tracking and retry logic';

COMMENT ON COLUMN post_requests.request_id IS 'Client-provided unique request identifier for idempotency';
COMMENT ON COLUMN post_requests.content_hash IS 'SHA-256 hash of normalized content for duplicate detection';
COMMENT ON COLUMN post_requests.targets_json IS 'Array of target platforms (x, discord)';
COMMENT ON COLUMN post_results.status IS 'Result status: success, failed, skipped';
