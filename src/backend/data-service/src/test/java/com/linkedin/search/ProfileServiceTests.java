package com.linkedin.search;

import com.linkedin.search.entities.Profile;
import com.linkedin.search.repositories.ProfileRepository;
import com.linkedin.search.services.ProfileService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import javax.persistence.OptimisticLockException;
import javax.validation.ValidationException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for ProfileService validating CRUD operations,
 * search functionality, security constraints, and concurrent modifications.
 *
 * @version 1.0
 * @since 2024-01
 */
@ExtendWith(MockitoExtension.class)
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
public class ProfileServiceTests {

    @Mock
    private ProfileRepository profileRepository;

    private ProfileService profileService;
    private Profile testProfile;
    private static final String VALID_LINKEDIN_URL = "https://linkedin.com/in/test-user";

    @BeforeEach
    void setUp() {
        profileService = new ProfileService(profileRepository);
        
        // Initialize test profile with complete data
        testProfile = Profile.builder()
            .id(UUID.randomUUID())
            .linkedinUrl(VALID_LINKEDIN_URL)
            .fullName("Test User")
            .headline("Senior Software Engineer")
            .location("San Francisco, CA")
            .matchScore(85.0f)
            .isActive(true)
            .version(0L)
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .build();
    }

    @Test
    void testCreateProfile_Success() {
        // Arrange
        when(profileRepository.findByLinkedinUrl(VALID_LINKEDIN_URL))
            .thenReturn(Optional.empty());
        when(profileRepository.save(any(Profile.class)))
            .thenReturn(testProfile);

        // Act
        Profile createdProfile = profileService.createProfile(testProfile);

        // Assert
        assertThat(createdProfile).isNotNull();
        assertThat(createdProfile.getId()).isNotNull();
        assertThat(createdProfile.getVersion()).isZero();
        assertThat(createdProfile.getIsActive()).isTrue();
        verify(profileRepository).findByLinkedinUrl(VALID_LINKEDIN_URL);
        verify(profileRepository).save(any(Profile.class));
    }

    @Test
    void testCreateProfile_DuplicateUrl() {
        // Arrange
        when(profileRepository.findByLinkedinUrl(VALID_LINKEDIN_URL))
            .thenReturn(Optional.of(testProfile));

        // Act & Assert
        assertThatThrownBy(() -> profileService.createProfile(testProfile))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("LinkedIn URL already exists");
    }

    @Test
    void testUpdateProfile_OptimisticLocking() {
        // Arrange
        Profile existingProfile = testProfile.toBuilder()
            .version(1L)
            .build();
        when(profileRepository.findById(testProfile.getId()))
            .thenReturn(Optional.of(existingProfile));
        when(profileRepository.save(any(Profile.class)))
            .thenThrow(OptimisticLockException.class);

        // Act & Assert
        assertThatThrownBy(() -> profileService.updateProfile(testProfile))
            .isInstanceOf(OptimisticLockException.class);
    }

    @Test
    void testSearchProfiles_WithPagination() {
        // Arrange
        String keywords = "software engineer";
        Pageable pageable = PageRequest.of(0, 10);
        List<Profile> profiles = new ArrayList<>();
        profiles.add(testProfile);
        Page<Profile> expectedPage = new PageImpl<>(profiles, pageable, 1);
        
        when(profileRepository.searchProfiles(anyString(), any(Pageable.class)))
            .thenReturn(expectedPage);

        // Act
        Page<Profile> results = profileService.searchProfiles(keywords, pageable);

        // Assert
        assertThat(results).isNotNull();
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getTotalElements()).isEqualTo(1);
        verify(profileRepository).searchProfiles(anyString(), any(Pageable.class));
    }

    @Test
    void testGetProfilesByMatchScore_ValidRange() {
        // Arrange
        Float minScore = 80.0f;
        Float maxScore = 90.0f;
        Pageable pageable = PageRequest.of(0, 10);
        List<Profile> profiles = new ArrayList<>();
        profiles.add(testProfile);
        Page<Profile> expectedPage = new PageImpl<>(profiles, pageable, 1);

        when(profileRepository.findByMatchScoreRange(minScore, maxScore, pageable))
            .thenReturn(expectedPage);

        // Act
        Page<Profile> results = profileService.getProfilesByMatchScore(minScore, maxScore, pageable);

        // Assert
        assertThat(results).isNotNull();
        assertThat(results.getContent()).hasSize(1);
        assertThat(results.getContent().get(0).getMatchScore())
            .isBetween(minScore, maxScore);
    }

    @Test
    void testGetProfilesByMatchScore_InvalidRange() {
        // Arrange
        Float minScore = 150.0f;
        Float maxScore = 200.0f;
        Pageable pageable = PageRequest.of(0, 10);

        // Act & Assert
        assertThatThrownBy(() -> 
            profileService.getProfilesByMatchScore(minScore, maxScore, pageable))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Match score must be between");
    }

    @Test
    void testDeleteProfile_SoftDelete() {
        // Arrange
        when(profileRepository.findById(testProfile.getId()))
            .thenReturn(Optional.of(testProfile));
        when(profileRepository.save(any(Profile.class)))
            .thenReturn(testProfile);

        // Act
        profileService.deleteProfile(testProfile.getId());

        // Assert
        verify(profileRepository).findById(testProfile.getId());
        verify(profileRepository).save(argThat(profile -> 
            !profile.getIsActive() && 
            profile.getUpdatedAt() != null
        ));
    }

    @Test
    void testCreateProfile_InvalidLinkedInUrl() {
        // Arrange
        Profile invalidProfile = testProfile.toBuilder()
            .linkedinUrl("invalid-url")
            .build();

        // Act & Assert
        assertThatThrownBy(() -> profileService.createProfile(invalidProfile))
            .isInstanceOf(ValidationException.class)
            .hasMessageContaining("Invalid LinkedIn URL format");
    }

    @Test
    void testSearchProfiles_EmptyKeywords() {
        // Arrange
        String emptyKeywords = "";
        Pageable pageable = PageRequest.of(0, 10);

        // Act & Assert
        assertThatThrownBy(() -> profileService.searchProfiles(emptyKeywords, pageable))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Search keywords must not be empty");
    }

    @Test
    void testUpdateProfile_ProfileNotFound() {
        // Arrange
        when(profileRepository.findById(testProfile.getId()))
            .thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> profileService.updateProfile(testProfile))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Profile not found");
    }

    @Test
    void testDeleteProfile_ProfileNotFound() {
        // Arrange
        when(profileRepository.findById(any(UUID.class)))
            .thenReturn(Optional.empty());

        // Act & Assert
        assertThatThrownBy(() -> profileService.deleteProfile(UUID.randomUUID()))
            .isInstanceOf(IllegalArgumentException.class)
            .hasMessageContaining("Profile not found");
    }
}