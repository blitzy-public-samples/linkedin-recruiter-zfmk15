package com.linkedin.search.entities;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import javax.persistence.*;
import javax.validation.constraints.Size;
import javax.validation.constraints.URL;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

/**
 * Entity class representing a LinkedIn profile with comprehensive data management and security features.
 * Implements time-based partitioning and secure data handling for profile information.
 * 
 * @version 1.0
 * @since 2024-01
 */
@Entity
@Table(name = "profiles", 
    indexes = {
        @Index(name = "idx_linkedin_url", columnList = "linkedin_url"),
        @Index(name = "idx_full_name", columnList = "full_name")
    }
)
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Profile {

    @Id
    @GeneratedValue(strategy = GenerationType.AUTO)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @URL(message = "Must be a valid LinkedIn URL")
    @Column(name = "linkedin_url", unique = true, nullable = false, length = 500)
    private String linkedinUrl;

    @Size(max = 255, message = "Full name must not exceed 255 characters")
    @Column(name = "full_name", nullable = false)
    private String fullName;

    @Size(max = 500, message = "Headline must not exceed 500 characters")
    @Column(name = "headline")
    private String headline;

    @Size(max = 255, message = "Location must not exceed 255 characters")
    @Column(name = "location")
    private String location;

    @Column(name = "summary", columnDefinition = "TEXT")
    private String summary;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "profile_skills",
        joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "skill")
    private List<String> skills = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "profile_experiences",
        joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "experience", columnDefinition = "TEXT")
    private List<String> experiences = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "profile_education",
        joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "education", columnDefinition = "TEXT")
    private List<String> education = new ArrayList<>();

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(
        name = "profile_certifications",
        joinColumns = @JoinColumn(name = "profile_id")
    )
    @Column(name = "certification", columnDefinition = "TEXT")
    private List<String> certifications = new ArrayList<>();

    @Column(name = "match_score")
    private Float matchScore;

    @Column(name = "is_active", nullable = false)
    private Boolean isActive;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false, nullable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Column(name = "last_analyzed_at")
    private LocalDateTime lastAnalyzedAt;

    @Version
    @Column(name = "version")
    private Long version;

    /**
     * JPA lifecycle callback executed before entity persistence.
     * Initializes default values and validates required fields.
     */
    @PrePersist
    protected void prePersist() {
        if (isActive == null) {
            isActive = true;
        }
        
        if (skills == null) skills = new ArrayList<>();
        if (experiences == null) experiences = new ArrayList<>();
        if (education == null) education = new ArrayList<>();
        if (certifications == null) certifications = new ArrayList<>();
        
        validateRequiredFields();
    }

    /**
     * JPA lifecycle callback executed before entity update.
     * Updates timestamps and validates fields.
     */
    @PreUpdate
    protected void preUpdate() {
        validateRequiredFields();
    }

    /**
     * Validates required fields before persistence or update.
     * @throws IllegalStateException if validation fails
     */
    private void validateRequiredFields() {
        if (linkedinUrl == null || linkedinUrl.trim().isEmpty()) {
            throw new IllegalStateException("LinkedIn URL is required");
        }
        if (fullName == null || fullName.trim().isEmpty()) {
            throw new IllegalStateException("Full name is required");
        }
    }
}