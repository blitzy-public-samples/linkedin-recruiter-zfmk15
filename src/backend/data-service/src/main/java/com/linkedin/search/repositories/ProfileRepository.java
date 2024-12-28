package com.linkedin.search.repositories;

import com.linkedin.search.entities.Profile;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for managing LinkedIn Profile entities with comprehensive data access methods.
 * Provides support for pagination, case-insensitive search, and efficient querying patterns.
 * 
 * @version 1.0
 * @since 2024-01
 */
@Repository
public interface ProfileRepository extends JpaRepository<Profile, UUID> {

    /**
     * Finds a profile by its LinkedIn URL.
     * Uses the idx_linkedin_url index for efficient querying.
     *
     * @param linkedinUrl the LinkedIn profile URL to search for
     * @return Optional containing the profile if found, empty otherwise
     */
    Optional<Profile> findByLinkedinUrl(String linkedinUrl);

    /**
     * Retrieves profiles with match scores greater than or equal to the specified threshold.
     * Supports pagination and sorting.
     *
     * @param minScore minimum match score threshold
     * @param pageable pagination and sorting parameters
     * @return Page of profiles meeting the score criteria
     */
    Page<Profile> findByMatchScoreGreaterThanEqualAndIsActiveTrue(Float minScore, Pageable pageable);

    /**
     * Performs case-insensitive full-text search across profile fields.
     * Searches through fullName, headline, and summary fields.
     * Uses database indexes for optimized performance.
     *
     * @param keywords search keywords
     * @param pageable pagination and sorting parameters
     * @return Page of matching profiles
     */
    @Query(value = """
            SELECT p FROM Profile p 
            WHERE p.isActive = true AND (
                LOWER(p.fullName) LIKE LOWER(CONCAT('%', :keywords, '%')) OR 
                LOWER(p.headline) LIKE LOWER(CONCAT('%', :keywords, '%')) OR 
                LOWER(p.summary) LIKE LOWER(CONCAT('%', :keywords, '%'))
            )
            """)
    Page<Profile> searchProfiles(@Param("keywords") String keywords, Pageable pageable);

    /**
     * Retrieves all active profiles with pagination support.
     * Filters out inactive profiles and supports sorting.
     *
     * @param pageable pagination and sorting parameters
     * @return Page of active profiles
     */
    @Query("SELECT p FROM Profile p WHERE p.isActive = true")
    Page<Profile> findActiveProfiles(Pageable pageable);

    /**
     * Finds profiles by location with case-insensitive matching.
     * Supports pagination and sorting.
     *
     * @param location the location to search for
     * @param pageable pagination and sorting parameters
     * @return Page of profiles in the specified location
     */
    @Query("SELECT p FROM Profile p WHERE p.isActive = true AND LOWER(p.location) LIKE LOWER(CONCAT('%', :location, '%'))")
    Page<Profile> findByLocation(@Param("location") String location, Pageable pageable);

    /**
     * Searches for profiles by skill with case-insensitive matching.
     * Queries the profile_skills collection table.
     *
     * @param skill the skill to search for
     * @param pageable pagination and sorting parameters
     * @return Page of profiles with the specified skill
     */
    @Query("""
            SELECT DISTINCT p FROM Profile p 
            JOIN p.skills s 
            WHERE p.isActive = true 
            AND LOWER(s) LIKE LOWER(CONCAT('%', :skill, '%'))
            """)
    Page<Profile> findBySkill(@Param("skill") String skill, Pageable pageable);

    /**
     * Finds profiles with match scores within a specified range.
     * Supports pagination and sorting.
     *
     * @param minScore minimum match score
     * @param maxScore maximum match score
     * @param pageable pagination and sorting parameters
     * @return Page of profiles within the score range
     */
    @Query("""
            SELECT p FROM Profile p 
            WHERE p.isActive = true 
            AND p.matchScore >= :minScore 
            AND p.matchScore <= :maxScore
            """)
    Page<Profile> findByMatchScoreRange(
            @Param("minScore") Float minScore,
            @Param("maxScore") Float maxScore,
            Pageable pageable
    );
}