-- PostgreSQL 15+ Migration Script
-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- Create audit trail function
CREATE OR REPLACE FUNCTION update_audit_fields() 
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        NEW.created_at := CURRENT_TIMESTAMP;
        NEW.updated_at := CURRENT_TIMESTAMP;
        NEW.created_by := CURRENT_USER;
        NEW.updated_by := CURRENT_USER;
    ELSIF TG_OP = 'UPDATE' THEN
        NEW.updated_at := CURRENT_TIMESTAMP;
        NEW.updated_by := CURRENT_USER;
        -- Preserve created_at and created_by
        NEW.created_at := OLD.created_at;
        NEW.created_by := OLD.created_by;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create profiles table
CREATE TABLE profiles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    linkedin_url VARCHAR(255) NOT NULL UNIQUE,
    linkedin_data JSONB NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    current_title VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
    match_confidence DECIMAL(5,2),
    last_crawled_at TIMESTAMP,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    CONSTRAINT status_check CHECK (status IN ('ACTIVE', 'ARCHIVED', 'PENDING', 'ERROR')),
    CONSTRAINT match_confidence_check CHECK (match_confidence BETWEEN 0 AND 100)
);

-- Create search criteria table
CREATE TABLE search_criteria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    filters JSONB NOT NULL,
    priority INTEGER NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT true,
    valid_from TIMESTAMP NOT NULL,
    valid_until TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    CONSTRAINT priority_check CHECK (priority BETWEEN 0 AND 100)
);

-- Create search results table
CREATE TABLE search_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID NOT NULL REFERENCES profiles(id),
    criteria_id UUID NOT NULL REFERENCES search_criteria(id),
    match_score DECIMAL(5,2) NOT NULL,
    match_details JSONB NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'NEW',
    processed_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    CONSTRAINT match_score_check CHECK (match_score BETWEEN 0 AND 100),
    CONSTRAINT status_check CHECK (status IN ('NEW', 'PROCESSED', 'ARCHIVED', 'ERROR'))
);

-- Create profile skills table for optimized skill searching
CREATE TABLE profile_skills (
    profile_id UUID NOT NULL REFERENCES profiles(id),
    skill_name VARCHAR(255) NOT NULL,
    proficiency_level VARCHAR(50),
    years_of_experience INTEGER,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL,
    created_by VARCHAR(255) NOT NULL,
    updated_by VARCHAR(255) NOT NULL,
    PRIMARY KEY (profile_id, skill_name)
);

-- Create audit triggers
CREATE TRIGGER profiles_audit_trigger
    BEFORE INSERT OR UPDATE ON profiles
    FOR EACH ROW EXECUTE FUNCTION update_audit_fields();

CREATE TRIGGER search_criteria_audit_trigger
    BEFORE INSERT OR UPDATE ON search_criteria
    FOR EACH ROW EXECUTE FUNCTION update_audit_fields();

CREATE TRIGGER search_results_audit_trigger
    BEFORE INSERT OR UPDATE ON search_results
    FOR EACH ROW EXECUTE FUNCTION update_audit_fields();

CREATE TRIGGER profile_skills_audit_trigger
    BEFORE INSERT OR UPDATE ON profile_skills
    FOR EACH ROW EXECUTE FUNCTION update_audit_fields();

-- Create optimized indexes
CREATE INDEX CONCURRENTLY idx_profiles_linkedin_data ON profiles USING gin (linkedin_data);
CREATE INDEX CONCURRENTLY idx_profiles_full_name ON profiles (LOWER(full_name));
CREATE INDEX CONCURRENTLY idx_profiles_status ON profiles (status) WHERE status = 'ACTIVE';
CREATE INDEX CONCURRENTLY idx_search_criteria_filters ON search_criteria USING gin (filters);
CREATE INDEX CONCURRENTLY idx_search_results_scores ON search_results (match_score DESC);
CREATE INDEX CONCURRENTLY idx_profile_skills_name ON profile_skills (LOWER(skill_name));

-- Add row-level security policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_criteria ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_skills ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY profiles_access_policy ON profiles
    USING (created_by = CURRENT_USER OR 
           CURRENT_USER IN (SELECT unnest(regexp_split_to_array(current_setting('app.authorized_users'), ','))));

CREATE POLICY search_criteria_access_policy ON search_criteria
    USING (created_by = CURRENT_USER OR 
           CURRENT_USER IN (SELECT unnest(regexp_split_to_array(current_setting('app.authorized_users'), ','))));

CREATE POLICY search_results_access_policy ON search_results
    USING (created_by = CURRENT_USER OR 
           CURRENT_USER IN (SELECT unnest(regexp_split_to_array(current_setting('app.authorized_users'), ','))));

CREATE POLICY profile_skills_access_policy ON profile_skills
    USING (created_by = CURRENT_USER OR 
           CURRENT_USER IN (SELECT unnest(regexp_split_to_array(current_setting('app.authorized_users'), ','))));

-- Add comments for documentation
COMMENT ON TABLE profiles IS 'Stores LinkedIn profile data with versioning and audit trail';
COMMENT ON TABLE search_criteria IS 'Stores search templates and filters for profile matching';
COMMENT ON TABLE search_results IS 'Stores profile match results with detailed scoring';
COMMENT ON TABLE profile_skills IS 'Normalized skill data for efficient skill-based searching';