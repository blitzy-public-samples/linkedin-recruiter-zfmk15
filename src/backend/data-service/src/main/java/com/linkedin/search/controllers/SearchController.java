package com.linkedin.search.controllers;

import com.linkedin.search.entities.SearchCriteria;
import com.linkedin.search.services.SearchService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import java.util.Optional;
import java.util.UUID;

/**
 * REST controller for managing LinkedIn profile search operations.
 * Implements enterprise-grade security, caching, and monitoring features.
 * Supports high-volume processing of 10,000+ profiles daily.
 *
 * @version 1.0
 * @since 2024-01
 */
@RestController
@RequestMapping("/api/v1/search")
@Slf4j
@Validated
public class SearchController {

    private final SearchService searchService;

    /**
     * Constructs SearchController with required dependencies.
     *
     * @param searchService service layer for search operations
     */
    @Autowired
    public SearchController(SearchService searchService) {
        this.searchService = searchService;
        log.info("SearchController initialized with service: {}", searchService.getClass().getSimpleName());
    }

    /**
     * Creates new search criteria for the authenticated user.
     * Implements request validation, rate limiting, and security controls.
     *
     * @param criteria search criteria to create
     * @param userId ID of the authenticated user
     * @return ResponseEntity containing created search criteria
     */
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    @RateLimiter(name = "searchAPI")
    public ResponseEntity<SearchCriteria> createSearchCriteria(
            @Valid @RequestBody SearchCriteria criteria,
            @RequestHeader("X-User-ID") String userId) {
        
        log.debug("Creating search criteria for user: {}", userId);
        
        SearchCriteria createdCriteria = searchService.createSearchCriteria(criteria, userId);
        
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Resource-ID", createdCriteria.getId().toString());
        
        log.info("Created search criteria with ID: {} for user: {}", 
                createdCriteria.getId(), userId);
        
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .headers(headers)
                .body(createdCriteria);
    }

    /**
     * Retrieves paginated list of user's active search criteria.
     * Implements caching, rate limiting, and security controls.
     *
     * @param userId ID of the authenticated user
     * @param pageable pagination parameters
     * @return ResponseEntity containing page of search criteria
     */
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    @RateLimiter(name = "searchAPI")
    @Cacheable(value = "searchCriteria", key = "#userId + #pageable")
    public ResponseEntity<Page<SearchCriteria>> getUserSearchCriteria(
            @RequestHeader("X-User-ID") String userId,
            Pageable pageable) {
        
        log.debug("Retrieving search criteria for user: {}, page: {}", 
                userId, pageable.getPageNumber());
        
        Page<SearchCriteria> criteriaPage = searchService.getUserSearchCriteria(userId, pageable);
        
        HttpHeaders headers = new HttpHeaders();
        headers.add("X-Total-Count", String.valueOf(criteriaPage.getTotalElements()));
        headers.add("X-Total-Pages", String.valueOf(criteriaPage.getTotalPages()));
        
        log.debug("Retrieved {} search criteria for user: {}", 
                criteriaPage.getNumberOfElements(), userId);
        
        return ResponseEntity.ok()
                .headers(headers)
                .body(criteriaPage);
    }

    /**
     * Retrieves specific search criteria by ID.
     * Implements security validation and rate limiting.
     *
     * @param id criteria ID to retrieve
     * @param userId ID of the authenticated user
     * @return ResponseEntity containing search criteria if found
     */
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @RateLimiter(name = "searchAPI")
    public ResponseEntity<SearchCriteria> getSearchCriteriaById(
            @PathVariable UUID id,
            @RequestHeader("X-User-ID") String userId) {
        
        log.debug("Retrieving search criteria ID: {} for user: {}", id, userId);
        
        Optional<SearchCriteria> criteria = searchService.getSearchCriteriaById(id, userId);
        
        return criteria.map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.notFound().build());
    }

    /**
     * Deactivates search criteria by ID.
     * Implements security validation and rate limiting.
     *
     * @param id criteria ID to deactivate
     * @param userId ID of the authenticated user
     * @return ResponseEntity with operation status
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    @RateLimiter(name = "searchAPI")
    public ResponseEntity<Void> deactivateSearchCriteria(
            @PathVariable UUID id,
            @RequestHeader("X-User-ID") String userId) {
        
        log.debug("Deactivating search criteria ID: {} for user: {}", id, userId);
        
        boolean deactivated = searchService.deactivateSearchCriteria(id, userId);
        
        if (deactivated) {
            log.info("Deactivated search criteria ID: {} for user: {}", id, userId);
            return ResponseEntity.noContent().build();
        } else {
            log.warn("Search criteria ID: {} not found for user: {}", id, userId);
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * Exception handler for validation errors.
     * Provides detailed error responses for client debugging.
     *
     * @param ex validation exception
     * @return ResponseEntity containing error details
     */
    @ExceptionHandler(javax.validation.ValidationException.class)
    public ResponseEntity<String> handleValidationException(javax.validation.ValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return ResponseEntity
                .status(HttpStatus.BAD_REQUEST)
                .body("Validation error: " + ex.getMessage());
    }
}