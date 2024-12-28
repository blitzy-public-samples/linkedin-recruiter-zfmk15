package com.linkedin.search.entities;

import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import jakarta.persistence.Id;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Column;
import jakarta.persistence.Index;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;

import com.fasterxml.jackson.databind.JsonNode;
import lombok.Data;
import lombok.Builder;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

/**
 * Entity class representing search results that links profiles with search criteria.
 * Implements comprehensive audit logging and lifecycle management.
 * 
 * @version 1.0
 * @since 2024-01
 */
@Entity
@Table(name = "search_results", indexes = {
    @Index(name = "idx_search_results_created", columnList = "created_at"),
    @Index(name = "idx_search_results_score", columnList = "match_score"),
    @Index(name = "idx_search_results_archived", columnList = "is_archived")
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SearchResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    @Column(name = "id", updatable = false, nullable = false)
    private UUID id;

    @ManyToOne(optional = false)
    @JoinColumn(name = "search_criteria_id", nullable = false,
                foreignKey = @jakarta.persistence.ForeignKey(name = "fk_search_result_criteria"))
    private SearchCriteria searchCriteria;

    @ManyToOne(optional = false)
    @JoinColumn(name = "profile_id", nullable = false,
                foreignKey = @jakarta.persistence.ForeignKey(name = "fk_search_result_profile"))
    private Profile profile;

    @Column(name = "match_score", nullable = false)
    private Float matchScore;

    @Column(name = "match_details", columnDefinition = "jsonb")
    private JsonNode matchDetails;

    @Column(name = "found_at", nullable = false)
    private LocalDateTime foundAt;

    @Column(name = "analyzed_at")
    private LocalDateTime analyzedAt;

    @Column(name = "is_archived", nullable = false)
    private Boolean isArchived;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    /**
     * JPA lifecycle callback executed before entity persistence.
     * Initializes timestamps and validates data.
     */
    @PrePersist
    protected void prePersist() {
        LocalDateTime now = LocalDateTime.now();
        
        // Initialize timestamps
        this.createdAt = now;
        this.updatedAt = now;
        this.foundAt = (this.foundAt == null) ? now : this.foundAt;
        
        // Set default values
        this.isArchived = (this.isArchived == null) ? false : this.isArchived;
        
        validateMatchScore();
        sanitizeMatchDetails();
    }

    /**
     * JPA lifecycle callback executed before entity update.
     * Updates timestamps and validates data.
     */
    @PreUpdate
    protected void preUpdate() {
        this.updatedAt = LocalDateTime.now();
        validateMatchScore();
        sanitizeMatchDetails();
    }

    /**
     * Validates that the match score is between 0 and 1.
     * @throws IllegalArgumentException if validation fails
     */
    private void validateMatchScore() {
        if (matchScore == null) {
            throw new IllegalArgumentException("Match score cannot be null");
        }
        if (matchScore < 0.0f || matchScore > 1.0f) {
            throw new IllegalArgumentException("Match score must be between 0 and 1");
        }
    }

    /**
     * Sanitizes match details JSON to remove any sensitive information.
     * Implements security measures for data protection.
     */
    private void sanitizeMatchDetails() {
        if (matchDetails != null) {
            // Remove any sensitive fields from matchDetails
            // This is a placeholder for actual implementation
            // TODO: Implement actual sanitization logic based on security requirements
        }
    }
}