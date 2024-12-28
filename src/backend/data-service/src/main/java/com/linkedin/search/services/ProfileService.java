package com.linkedin.search.services;

import com.linkedin.search.entities.Profile;
import com.linkedin.search.repositories.ProfileRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

import javax.validation.ValidationException;
import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Pattern;

/**
 * Service class implementing comprehensive business logic for LinkedIn profile management.
 * Provides secure data handling, validation, and optimized search capabilities.
 *
 * @version 1.0
 * @since 2024-01
 */
@Service
@Slf4j
@Transactional(isolation = Isolation.READ_COMMITTED)
public class ProfileService {

    private static final Pattern LINKEDIN_URL_PATTERN = 
        Pattern.compile("^https?://([a-z]{2,3}\\.)?linkedin\\.com/.*$", Pattern.CASE_INSENSITIVE);
    
    private static final float MIN_MATCH_SCORE = 0.0f;
    private static final float MAX_MATCH_SCORE = 100.0f;

    private final ProfileRepository profileRepository;

    /**
     * Constructs ProfileService with required dependencies.
     *
     * @param profileRepository repository for profile data access
     * @throws IllegalArgumentException if repository is null
     */
    public ProfileService(ProfileRepository profileRepository) {
        Assert.notNull(profileRepository, "ProfileRepository must not be null");
        this.profileRepository = profileRepository;
        log.info("ProfileService initialized successfully");
    }

    /**
     * Creates a new LinkedIn profile with comprehensive validation.
     *
     * @param profile the profile to create
     * @return created profile with generated ID and version
     * @throws ValidationException if profile validation fails
     */
    @Transactional
    public Profile createProfile(Profile profile) {
        log.debug("Creating new profile: {}", profile.getLinkedinUrl());
        
        validateProfile(profile);
        checkDuplicateProfile(profile.getLinkedinUrl());
        
        profile.setId(UUID.randomUUID());
        profile.setVersion(0L);
        profile.setIsActive(true);
        profile.setCreatedAt(LocalDateTime.now());
        profile.setUpdatedAt(LocalDateTime.now());

        Profile savedProfile = profileRepository.save(profile);
        log.info("Created new profile with ID: {}", savedProfile.getId());
        
        return savedProfile;
    }

    /**
     * Updates an existing profile with optimistic locking.
     *
     * @param profile the profile to update
     * @return updated profile
     * @throws ValidationException if profile validation fails
     * @throws javax.persistence.OptimisticLockException if version conflict occurs
     */
    @Transactional
    public Profile updateProfile(Profile profile) {
        log.debug("Updating profile: {}", profile.getId());
        
        Assert.notNull(profile.getId(), "Profile ID must not be null");
        validateProfile(profile);
        
        Profile existingProfile = profileRepository.findById(profile.getId())
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
            
        if (!existingProfile.getLinkedinUrl().equals(profile.getLinkedinUrl())) {
            checkDuplicateProfile(profile.getLinkedinUrl());
        }

        profile.setUpdatedAt(LocalDateTime.now());
        Profile updatedProfile = profileRepository.save(profile);
        log.info("Updated profile with ID: {}", updatedProfile.getId());
        
        return updatedProfile;
    }

    /**
     * Searches profiles using keywords with optimized pagination.
     *
     * @param keywords search keywords
     * @param pageable pagination parameters
     * @return page of matching profiles
     */
    @Transactional(readOnly = true)
    public Page<Profile> searchProfiles(String keywords, Pageable pageable) {
        log.debug("Searching profiles with keywords: {}", keywords);
        
        Assert.hasText(keywords, "Search keywords must not be empty");
        String sanitizedKeywords = sanitizeSearchInput(keywords);
        
        Page<Profile> results = profileRepository.searchProfiles(sanitizedKeywords, pageable);
        log.info("Found {} profiles matching search criteria", results.getTotalElements());
        
        return results;
    }

    /**
     * Retrieves profiles by match score range with pagination.
     *
     * @param minScore minimum match score
     * @param maxScore maximum match score
     * @param pageable pagination parameters
     * @return page of profiles within score range
     */
    @Transactional(readOnly = true)
    public Page<Profile> getProfilesByMatchScore(Float minScore, Float maxScore, Pageable pageable) {
        log.debug("Retrieving profiles with match score between {} and {}", minScore, maxScore);
        
        validateMatchScoreRange(minScore, maxScore);
        return profileRepository.findByMatchScoreRange(minScore, maxScore, pageable);
    }

    /**
     * Soft deletes a profile by setting isActive to false.
     *
     * @param profileId ID of the profile to delete
     */
    @Transactional
    public void deleteProfile(UUID profileId) {
        log.debug("Soft deleting profile: {}", profileId);
        
        Profile profile = profileRepository.findById(profileId)
            .orElseThrow(() -> new IllegalArgumentException("Profile not found"));
            
        profile.setIsActive(false);
        profile.setUpdatedAt(LocalDateTime.now());
        profileRepository.save(profile);
        
        log.info("Soft deleted profile with ID: {}", profileId);
    }

    /**
     * Validates profile data according to business rules.
     *
     * @param profile profile to validate
     * @throws ValidationException if validation fails
     */
    private void validateProfile(Profile profile) {
        Assert.notNull(profile, "Profile must not be null");
        Assert.hasText(profile.getLinkedinUrl(), "LinkedIn URL must not be empty");
        Assert.hasText(profile.getFullName(), "Full name must not be empty");

        if (!LINKEDIN_URL_PATTERN.matcher(profile.getLinkedinUrl()).matches()) {
            throw new ValidationException("Invalid LinkedIn URL format");
        }

        if (profile.getMatchScore() != null) {
            validateMatchScoreRange(profile.getMatchScore(), profile.getMatchScore());
        }
    }

    /**
     * Checks for existing profile with the same LinkedIn URL.
     *
     * @param linkedinUrl LinkedIn URL to check
     * @throws ValidationException if duplicate URL found
     */
    private void checkDuplicateProfile(String linkedinUrl) {
        Optional<Profile> existingProfile = profileRepository.findByLinkedinUrl(linkedinUrl);
        if (existingProfile.isPresent()) {
            throw new ValidationException("Profile with this LinkedIn URL already exists");
        }
    }

    /**
     * Validates match score range.
     *
     * @param minScore minimum score
     * @param maxScore maximum score
     * @throws ValidationException if range is invalid
     */
    private void validateMatchScoreRange(Float minScore, Float maxScore) {
        if (minScore < MIN_MATCH_SCORE || maxScore > MAX_MATCH_SCORE || minScore > maxScore) {
            throw new ValidationException(
                String.format("Match score must be between %.1f and %.1f", MIN_MATCH_SCORE, MAX_MATCH_SCORE)
            );
        }
    }

    /**
     * Sanitizes search input to prevent SQL injection and invalid patterns.
     *
     * @param input search input to sanitize
     * @return sanitized input
     */
    private String sanitizeSearchInput(String input) {
        return input.replaceAll("[%_]", "\\\\$0");
    }
}