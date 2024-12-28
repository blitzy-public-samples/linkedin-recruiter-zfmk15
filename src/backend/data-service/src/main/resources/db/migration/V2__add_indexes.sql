-- PostgreSQL 15+
-- Migration: Add performance-optimized indexes for LinkedIn Profile Search system

-- Profile Indexes
-- B-tree indexes for exact matches, range queries and sorting
CREATE INDEX idx_profiles_linkedin_url ON profiles(linkedin_url);
CREATE INDEX idx_profiles_full_name ON profiles(full_name);
CREATE INDEX idx_profiles_location ON profiles(location);
CREATE INDEX idx_profiles_match_score ON profiles(match_score);
CREATE INDEX idx_profiles_is_active ON profiles(is_active);
CREATE INDEX idx_profiles_created_at ON profiles(created_at);
CREATE INDEX idx_profiles_updated_at ON profiles(updated_at);

-- GIN indexes with jsonb_path_ops for complex JSON data querying
CREATE INDEX idx_profiles_linkedin_data ON profiles USING gin(linkedin_data jsonb_path_ops);
CREATE INDEX idx_profiles_analysis_results ON profiles USING gin(analysis_results jsonb_path_ops);

-- Search Criteria Indexes
-- B-tree indexes for timestamp and boolean filters
CREATE INDEX idx_search_criteria_created_at ON search_criteria(created_at);
CREATE INDEX idx_search_criteria_is_active ON search_criteria(is_active);

-- GIN index for JSON search filters
CREATE INDEX idx_search_criteria_filters ON search_criteria USING gin(filters jsonb_path_ops);

-- Search Results Indexes
-- B-tree indexes for foreign keys, scoring and timestamps
CREATE INDEX idx_search_results_profile_id ON search_results(profile_id);
CREATE INDEX idx_search_results_search_id ON search_results(search_criteria_id);
CREATE INDEX idx_search_results_match_score ON search_results(match_score);
CREATE INDEX idx_search_results_created_at ON search_results(created_at);

-- GIN index for match details stored as JSONB
CREATE INDEX idx_search_results_match_details ON search_results USING gin(match_details jsonb_path_ops);

-- Note: These indexes are created non-concurrently to ensure data consistency during migration
-- Regular VACUUM ANALYZE operations are recommended to maintain index efficiency
-- Additional storage space will be required for these indexes
-- Write performance may be impacted due to index maintenance overhead