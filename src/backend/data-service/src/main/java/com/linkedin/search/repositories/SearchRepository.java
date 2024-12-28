package com.linkedin.search.repositories;

import com.linkedin.search.entities.SearchCriteria;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.lang.NonNull;

import java.util.Optional;
import java.util.UUID;

/**
 * Repository interface for managing SearchCriteria entities with enhanced security,
 * audit logging, and performance optimizations.
 * 
 * @version 1.0
 * @since 2024-01
 */
@Repository
public interface SearchRepository extends JpaRepository<SearchCriteria, UUID> {

    /**
     * Finds active search criteria by creator with pagination support.
     * Implements security validation to ensure users can only access their own data.
     *
     * @param createdBy username of the creator
     * @param pageable pagination parameters
     * @return Page of active search criteria
     */
    @PreAuthorize("#createdBy == authentication.name")
    @NonNull
    Page<SearchCriteria> findByCreatedByAndIsActiveTrue(@NonNull String createdBy, @NonNull Pageable pageable);

    /**
     * Finds a specific active search criteria by ID and creator.
     * Implements security validation to ensure users can only access their own data.
     *
     * @param id unique identifier of the search criteria
     * @param createdBy username of the creator
     * @return Optional containing the search criteria if found
     */
    @PreAuthorize("#createdBy == authentication.name")
    @NonNull
    Optional<SearchCriteria> findByIdAndCreatedByAndIsActiveTrue(@NonNull UUID id, @NonNull String createdBy);

    /**
     * Deactivates search criteria by ID and creator.
     * Implements security validation and audit logging.
     *
     * @param id unique identifier of the search criteria
     * @param createdBy username of the creator
     * @return number of records updated
     */
    @Query("UPDATE SearchCriteria s SET s.isActive = false, s.updatedAt = CURRENT_TIMESTAMP " +
           "WHERE s.id = :id AND s.createdBy = :createdBy")
    @Modifying
    @Transactional
    @PreAuthorize("#createdBy == authentication.name")
    @NonNull
    int deactivateSearchCriteria(@NonNull UUID id, @NonNull String createdBy);

    /**
     * Counts active search criteria by creator.
     * Implements security validation for metrics tracking.
     *
     * @param createdBy username of the creator
     * @return count of active search criteria
     */
    @PreAuthorize("#createdBy == authentication.name")
    @NonNull
    long countByCreatedByAndIsActiveTrue(@NonNull String createdBy);

    /**
     * Updates the last accessed timestamp for audit tracking.
     * Implements security validation and audit logging.
     *
     * @param id unique identifier of the search criteria
     * @param createdBy username of the creator
     * @return number of records updated
     */
    @Query("UPDATE SearchCriteria s SET s.lastAccessedAt = CURRENT_TIMESTAMP " +
           "WHERE s.id = :id AND s.createdBy = :createdBy")
    @Modifying
    @Transactional
    @PreAuthorize("#createdBy == authentication.name")
    @NonNull
    int updateLastAccessedAt(@NonNull UUID id, @NonNull String createdBy);
}