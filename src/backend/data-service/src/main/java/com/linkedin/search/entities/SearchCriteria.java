package com.linkedin.search.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.Column;
import jakarta.persistence.Convert;
import jakarta.persistence.Version;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Index;
import jakarta.persistence.GenerationType;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;
import java.util.Arrays;
import java.util.Objects;

/**
 * Entity class representing search criteria for LinkedIn profile searches.
 * Implements comprehensive validation, auditing, and security features.
 * 
 * @version 1.0
 * @since 2024-01
 */
@Entity
@Table(name = "searches", indexes = {
    @Index(name = "idx_search_created_by", columnList = "created_by"),
    @Index(name = "idx_search_created_at", columnList = "created_at")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchCriteria {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @Column(name = "keywords", columnDefinition = "text[]")
    @Convert(converter = StringArrayConverter.class)
    private String[] keywords;

    @Column(name = "location", length = 255)
    private String location;

    @Column(name = "min_experience")
    private Integer minExperience;

    @Column(name = "max_experience")
    private Integer maxExperience;

    @Column(name = "required_skills", columnDefinition = "text[]")
    @Convert(converter = StringArrayConverter.class)
    private String[] requiredSkills;

    @Column(name = "optional_skills", columnDefinition = "text[]")
    @Convert(converter = StringArrayConverter.class)
    private String[] optionalSkills;

    @Column(name = "created_by", nullable = false, length = 255)
    private String createdBy;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "is_active", nullable = false)
    private boolean isActive;

    /**
     * Validates and initializes entity fields before persistence.
     * Ensures data integrity and applies business rules.
     */
    @PrePersist
    protected void prePersist() {
        validateExperienceRange();
        
        LocalDateTime now = LocalDateTime.now();
        this.createdAt = now;
        this.updatedAt = now;
        this.isActive = true;

        // Initialize arrays if null
        if (this.keywords == null) {
            this.keywords = new String[0];
        }
        if (this.requiredSkills == null) {
            this.requiredSkills = new String[0];
        }
        if (this.optionalSkills == null) {
            this.optionalSkills = new String[0];
        }

        normalizeArrays();
        validateArrays();
    }

    /**
     * Validates and updates entity fields before update.
     * Ensures data integrity and applies business rules.
     */
    @PreUpdate
    protected void preUpdate() {
        validateExperienceRange();
        this.updatedAt = LocalDateTime.now();
        normalizeArrays();
        validateArrays();
    }

    /**
     * Validates the experience range values.
     * Throws IllegalArgumentException if validation fails.
     */
    private void validateExperienceRange() {
        if (minExperience != null && maxExperience != null) {
            if (minExperience < 0) {
                throw new IllegalArgumentException("Minimum experience cannot be negative");
            }
            if (maxExperience < minExperience) {
                throw new IllegalArgumentException("Maximum experience cannot be less than minimum experience");
            }
        }
    }

    /**
     * Normalizes array values by trimming and converting to lowercase.
     * Removes duplicates and null values.
     */
    private void normalizeArrays() {
        this.keywords = normalizeArray(this.keywords);
        this.requiredSkills = normalizeArray(this.requiredSkills);
        this.optionalSkills = normalizeArray(this.optionalSkills);
    }

    /**
     * Normalizes a string array by trimming, converting to lowercase,
     * and removing duplicates and null values.
     *
     * @param array The array to normalize
     * @return Normalized array
     */
    private String[] normalizeArray(String[] array) {
        if (array == null) {
            return new String[0];
        }
        return Arrays.stream(array)
            .filter(Objects::nonNull)
            .map(String::trim)
            .map(String::toLowerCase)
            .distinct()
            .toArray(String[]::new);
    }

    /**
     * Validates arrays for maximum length and content.
     * Throws IllegalArgumentException if validation fails.
     */
    private void validateArrays() {
        final int MAX_ARRAY_LENGTH = 50;
        final int MAX_STRING_LENGTH = 255;

        validateArrayConstraints(keywords, "Keywords", MAX_ARRAY_LENGTH, MAX_STRING_LENGTH);
        validateArrayConstraints(requiredSkills, "Required skills", MAX_ARRAY_LENGTH, MAX_STRING_LENGTH);
        validateArrayConstraints(optionalSkills, "Optional skills", MAX_ARRAY_LENGTH, MAX_STRING_LENGTH);
    }

    /**
     * Validates array constraints for maximum length and content.
     *
     * @param array The array to validate
     * @param arrayName Name of the array for error messages
     * @param maxArrayLength Maximum allowed array length
     * @param maxStringLength Maximum allowed string length
     */
    private void validateArrayConstraints(String[] array, String arrayName, int maxArrayLength, int maxStringLength) {
        if (array.length > maxArrayLength) {
            throw new IllegalArgumentException(arrayName + " array exceeds maximum length of " + maxArrayLength);
        }

        for (String item : array) {
            if (item != null && item.length() > maxStringLength) {
                throw new IllegalArgumentException(arrayName + " item exceeds maximum length of " + maxStringLength);
            }
        }
    }
}