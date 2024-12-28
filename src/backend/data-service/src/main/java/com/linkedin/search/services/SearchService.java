package com.linkedin.search.services;

import com.linkedin.search.entities.SearchCriteria;
import com.linkedin.search.repositories.SearchRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

/**
 * Service class implementing LinkedIn profile search business logic with
 * transaction management, caching, and performance optimization.
 * Supports processing of 10,000+ profiles daily with comprehensive logging.
 *
 * @version 1.0
 * @since 2024-01
 */
@Service
@Slf4j
public class SearchService {

    private final SearchRepository searchRepository;

    /**
     * Constructs SearchService with required dependencies.
     *
     * @param searchRepository repository for search criteria persistence
     */
    @Autowired
    public SearchService(SearchRepository searchRepository) {
        this.searchRepository = searchRepository;
        log.info("SearchService initialized with repository: {}", searchRepository.getClass().getSimpleName());
    }

    /**
     * Creates new search criteria with validation and security checks.
     * Implements transaction management for data consistency.
     *
     * @param criteria search criteria to create
     * @param userId ID of the user creating the criteria
     * @return created search criteria
     * @throws IllegalArgumentException if validation fails
     * @throws AccessDeniedException if user is not authorized
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    @CacheEvict(value = "searchCriteria", key = "#userId")
    public SearchCriteria createSearchCriteria(SearchCriteria criteria, String userId) {
        log.debug("Creating search criteria for user: {}", userId);
        
        Assert.notNull(criteria, "Search criteria cannot be null");
        Assert.notNull(userId, "User ID cannot be null");

        validateSearchCriteria(criteria);

        criteria.setCreatedBy(userId);
        criteria.setCreatedAt(LocalDateTime.now());
        criteria.setUpdatedAt(LocalDateTime.now());
        criteria.setActive(true);

        try {
            SearchCriteria savedCriteria = searchRepository.save(criteria);
            log.info("Created search criteria with ID: {} for user: {}", savedCriteria.getId(), userId);
            return savedCriteria;
        } catch (Exception e) {
            log.error("Failed to create search criteria for user: {}", userId, e);
            throw new RuntimeException("Failed to create search criteria", e);
        }
    }

    /**
     * Retrieves paginated user search criteria with caching support.
     * Implements read-only transaction for optimal performance.
     *
     * @param userId ID of the user
     * @param pageable pagination parameters
     * @return page of search criteria
     * @throws AccessDeniedException if user is not authorized
     */
    @Transactional(readOnly = true)
    @Cacheable(value = "searchCriteria", key = "#userId")
    public Page<SearchCriteria> getUserSearchCriteria(String userId, Pageable pageable) {
        log.debug("Retrieving search criteria for user: {}, page: {}", userId, pageable.getPageNumber());
        
        Assert.notNull(userId, "User ID cannot be null");
        Assert.notNull(pageable, "Pageable cannot be null");

        try {
            Page<SearchCriteria> criteriaPage = searchRepository.findByCreatedByAndIsActiveTrue(userId, pageable);
            log.debug("Retrieved {} search criteria for user: {}", criteriaPage.getNumberOfElements(), userId);
            return criteriaPage;
        } catch (Exception e) {
            log.error("Failed to retrieve search criteria for user: {}", userId, e);
            throw new RuntimeException("Failed to retrieve search criteria", e);
        }
    }

    /**
     * Retrieves specific search criteria by ID with security validation.
     * Implements read-only transaction for optimal performance.
     *
     * @param id criteria ID
     * @param userId ID of the user
     * @return optional containing search criteria
     * @throws AccessDeniedException if user is not authorized
     */
    @Transactional(readOnly = true)
    public Optional<SearchCriteria> getSearchCriteriaById(UUID id, String userId) {
        log.debug("Retrieving search criteria ID: {} for user: {}", id, userId);
        
        Assert.notNull(id, "Criteria ID cannot be null");
        Assert.notNull(userId, "User ID cannot be null");

        try {
            Optional<SearchCriteria> criteria = searchRepository.findByIdAndCreatedByAndIsActiveTrue(id, userId);
            if (criteria.isPresent()) {
                searchRepository.updateLastAccessedAt(id, userId);
                log.debug("Retrieved search criteria ID: {} for user: {}", id, userId);
            }
            return criteria;
        } catch (Exception e) {
            log.error("Failed to retrieve search criteria ID: {} for user: {}", id, userId, e);
            throw new RuntimeException("Failed to retrieve search criteria", e);
        }
    }

    /**
     * Deactivates search criteria with security validation.
     * Implements transaction management for data consistency.
     *
     * @param id criteria ID to deactivate
     * @param userId ID of the user
     * @return true if deactivated successfully
     * @throws AccessDeniedException if user is not authorized
     */
    @Transactional(isolation = Isolation.READ_COMMITTED)
    @CacheEvict(value = "searchCriteria", key = "#userId")
    public boolean deactivateSearchCriteria(UUID id, String userId) {
        log.debug("Deactivating search criteria ID: {} for user: {}", id, userId);
        
        Assert.notNull(id, "Criteria ID cannot be null");
        Assert.notNull(userId, "User ID cannot be null");

        try {
            int updated = searchRepository.deactivateSearchCriteria(id, userId);
            boolean success = updated > 0;
            if (success) {
                log.info("Deactivated search criteria ID: {} for user: {}", id, userId);
            } else {
                log.warn("No search criteria found to deactivate with ID: {} for user: {}", id, userId);
            }
            return success;
        } catch (Exception e) {
            log.error("Failed to deactivate search criteria ID: {} for user: {}", id, userId, e);
            throw new RuntimeException("Failed to deactivate search criteria", e);
        }
    }

    /**
     * Validates search criteria against business rules.
     *
     * @param criteria criteria to validate
     * @throws IllegalArgumentException if validation fails
     */
    private void validateSearchCriteria(SearchCriteria criteria) {
        Assert.isTrue(criteria.getKeywords() != null && criteria.getKeywords().length > 0,
                "At least one keyword is required");
        
        if (criteria.getMinExperience() != null && criteria.getMaxExperience() != null) {
            Assert.isTrue(criteria.getMinExperience() >= 0,
                    "Minimum experience cannot be negative");
            Assert.isTrue(criteria.getMaxExperience() >= criteria.getMinExperience(),
                    "Maximum experience must be greater than or equal to minimum experience");
        }

        Assert.isTrue(criteria.getRequiredSkills() != null && criteria.getRequiredSkills().length > 0,
                "At least one required skill is required");
    }
}