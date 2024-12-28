package com.linkedin.search.controllers;

import com.linkedin.search.entities.Profile;
import com.linkedin.search.services.ProfileService;
import io.github.resilience4j.ratelimiter.annotation.RateLimiter;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

import javax.validation.Valid;
import javax.validation.constraints.Max;
import javax.validation.constraints.Min;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

/**
 * REST controller implementing secure profile management endpoints with comprehensive validation,
 * caching, rate limiting, and audit logging capabilities.
 *
 * @version 1.0
 * @since 2024-01
 */
@RestController
@RequestMapping("/api/v1/profiles")
@Slf4j
@Validated
@Tag(name = "Profile Management", description = "APIs for LinkedIn profile management")
@SecurityRequirement(name = "bearerAuth")
public class ProfileController {

    private final ProfileService profileService;
    private final CacheControl defaultCacheControl;

    /**
     * Constructs ProfileController with required dependencies and configurations.
     *
     * @param profileService service layer for profile operations
     */
    public ProfileController(ProfileService profileService) {
        this.profileService = profileService;
        this.defaultCacheControl = CacheControl.maxAge(10, TimeUnit.MINUTES)
            .noTransform()
            .mustRevalidate();
        log.info("ProfileController initialized successfully");
    }

    /**
     * Creates a new LinkedIn profile with validation.
     *
     * @param profile the profile to create
     * @return created profile with generated ID
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @Operation(summary = "Create new profile", description = "Creates a new LinkedIn profile with validation")
    @RateLimiter(name = "profileCreation")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<Profile> createProfile(@Valid @RequestBody Profile profile) {
        log.debug("Creating new profile: {}", profile.getLinkedinUrl());
        Profile createdProfile = profileService.createProfile(profile);
        log.info("Created profile with ID: {}", createdProfile.getId());
        return ResponseEntity.status(HttpStatus.CREATED).body(createdProfile);
    }

    /**
     * Retrieves a profile by LinkedIn URL.
     *
     * @param linkedinUrl the LinkedIn URL to search for
     * @return profile if found
     */
    @GetMapping("/url/{linkedinUrl}")
    @Operation(summary = "Get profile by LinkedIn URL")
    @PreAuthorize("hasAnyRole('RECRUITER', 'HIRING_MANAGER')")
    public ResponseEntity<Profile> getProfileByUrl(
            @PathVariable String linkedinUrl) {
        log.debug("Retrieving profile by URL: {}", linkedinUrl);
        return profileService.getProfileByUrl(linkedinUrl)
            .map(profile -> ResponseEntity.ok()
                .cacheControl(defaultCacheControl)
                .body(profile))
            .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Searches profiles using keywords with pagination.
     *
     * @param keywords search keywords
     * @param pageable pagination parameters
     * @return page of matching profiles
     */
    @GetMapping("/search")
    @Operation(summary = "Search profiles", description = "Search profiles using keywords with pagination")
    @RateLimiter(name = "profileSearch")
    @PreAuthorize("hasAnyRole('RECRUITER', 'HIRING_MANAGER')")
    public ResponseEntity<Page<Profile>> searchProfiles(
            @RequestParam String keywords,
            Pageable pageable) {
        log.debug("Searching profiles with keywords: {}", keywords);
        Page<Profile> results = profileService.searchProfiles(keywords, pageable);
        return ResponseEntity.ok()
            .cacheControl(defaultCacheControl)
            .body(results);
    }

    /**
     * Retrieves profiles by minimum match score.
     *
     * @param minScore minimum match score threshold
     * @param pageable pagination parameters
     * @return page of profiles meeting score criteria
     */
    @GetMapping("/score")
    @Operation(summary = "Get profiles by match score")
    @PreAuthorize("hasAnyRole('RECRUITER', 'HIRING_MANAGER')")
    public ResponseEntity<Page<Profile>> getProfilesByMinScore(
            @RequestParam @Min(0) @Max(100) Float minScore,
            @RequestParam(required = false) @Min(0) @Max(100) Float maxScore,
            Pageable pageable) {
        log.debug("Retrieving profiles with min score: {}", minScore);
        maxScore = maxScore != null ? maxScore : 100f;
        Page<Profile> results = profileService.getProfilesByMatchScore(minScore, maxScore, pageable);
        return ResponseEntity.ok()
            .cacheControl(defaultCacheControl)
            .body(results);
    }

    /**
     * Updates an existing profile.
     *
     * @param profileId ID of the profile to update
     * @param profile updated profile data
     * @return updated profile
     */
    @PutMapping("/{profileId}")
    @Operation(summary = "Update profile")
    @RateLimiter(name = "profileUpdate")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<Profile> updateProfile(
            @PathVariable UUID profileId,
            @Valid @RequestBody Profile profile) {
        log.debug("Updating profile: {}", profileId);
        profile.setId(profileId);
        Profile updatedProfile = profileService.updateProfile(profile);
        return ResponseEntity.ok(updatedProfile);
    }

    /**
     * Deactivates a profile (soft delete).
     *
     * @param profileId ID of the profile to deactivate
     * @return no content on success
     */
    @DeleteMapping("/{profileId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @Operation(summary = "Deactivate profile")
    @PreAuthorize("hasRole('RECRUITER')")
    public ResponseEntity<Void> deactivateProfile(@PathVariable UUID profileId) {
        log.debug("Deactivating profile: {}", profileId);
        profileService.deleteProfile(profileId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Exception handler for validation errors.
     *
     * @param ex validation exception
     * @return error response with details
     */
    @ExceptionHandler(javax.validation.ValidationException.class)
    @ResponseStatus(HttpStatus.BAD_REQUEST)
    public ResponseEntity<String> handleValidationException(javax.validation.ValidationException ex) {
        log.warn("Validation error: {}", ex.getMessage());
        return ResponseEntity.badRequest().body(ex.getMessage());
    }
}