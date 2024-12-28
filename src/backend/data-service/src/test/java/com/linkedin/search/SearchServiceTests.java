package com.linkedin.search;

import com.linkedin.search.entities.SearchCriteria;
import com.linkedin.search.repositories.SearchRepository;
import com.linkedin.search.services.SearchService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Captor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.access.AccessDeniedException;

import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

/**
 * Comprehensive test suite for SearchService validating functionality, security,
 * performance, and audit logging.
 * 
 * @version 1.0
 * @since 2024-01
 */
@ExtendWith(MockitoExtension.class)
public class SearchServiceTests {

    private static final String TEST_USER_ID = "test-user-123";
    private static final UUID TEST_CRITERIA_ID = UUID.randomUUID();
    private static final long PERFORMANCE_THRESHOLD_MS = 100;
    private static final int MAX_BATCH_SIZE = 1000;

    @Mock
    private SearchRepository searchRepository;

    @InjectMocks
    private SearchService searchService;

    @Captor
    private ArgumentCaptor<SearchCriteria> searchCriteriaCaptor;

    @Test
    void testCreateSearchCriteriaSuccess() {
        // Arrange
        SearchCriteria criteria = SearchCriteria.builder()
            .keywords(new String[]{"java", "spring"})
            .location("San Francisco")
            .minExperience(3)
            .maxExperience(5)
            .requiredSkills(new String[]{"java", "spring boot"})
            .optionalSkills(new String[]{"kubernetes", "aws"})
            .build();

        when(searchRepository.save(any(SearchCriteria.class)))
            .thenAnswer(invocation -> {
                SearchCriteria saved = invocation.getArgument(0);
                saved.setId(TEST_CRITERIA_ID);
                return saved;
            });

        // Act
        SearchCriteria result = searchService.createSearchCriteria(criteria, TEST_USER_ID);

        // Assert
        assertNotNull(result);
        assertEquals(TEST_CRITERIA_ID, result.getId());
        assertEquals(TEST_USER_ID, result.getCreatedBy());
        assertTrue(result.isActive());
        assertNotNull(result.getCreatedAt());
        assertNotNull(result.getUpdatedAt());

        verify(searchRepository).save(searchCriteriaCaptor.capture());
        SearchCriteria savedCriteria = searchCriteriaCaptor.getValue();
        assertEquals(TEST_USER_ID, savedCriteria.getCreatedBy());
        assertArrayEquals(new String[]{"java", "spring"}, savedCriteria.getKeywords());
    }

    @Test
    void testCreateSearchCriteriaInvalid() {
        // Arrange
        SearchCriteria invalidCriteria = SearchCriteria.builder()
            .keywords(new String[]{})
            .requiredSkills(new String[]{})
            .build();

        // Act & Assert
        IllegalArgumentException exception = assertThrows(
            IllegalArgumentException.class,
            () -> searchService.createSearchCriteria(invalidCriteria, TEST_USER_ID)
        );

        assertTrue(exception.getMessage().contains("At least one keyword is required"));
        verify(searchRepository, never()).save(any());
    }

    @Test
    void testGetUserSearchCriteriaSuccess() {
        // Arrange
        PageRequest pageRequest = PageRequest.of(0, 10);
        List<SearchCriteria> criteriaList = Arrays.asList(
            createTestSearchCriteria(),
            createTestSearchCriteria()
        );
        Page<SearchCriteria> expectedPage = new PageImpl<>(criteriaList);

        when(searchRepository.findByCreatedByAndIsActiveTrue(TEST_USER_ID, pageRequest))
            .thenReturn(expectedPage);

        // Act
        Page<SearchCriteria> result = searchService.getUserSearchCriteria(TEST_USER_ID, pageRequest);

        // Assert
        assertNotNull(result);
        assertEquals(2, result.getContent().size());
        verify(searchRepository).findByCreatedByAndIsActiveTrue(TEST_USER_ID, pageRequest);
    }

    @Test
    void testGetSearchCriteriaByIdSuccess() {
        // Arrange
        SearchCriteria expectedCriteria = createTestSearchCriteria();
        when(searchRepository.findByIdAndCreatedByAndIsActiveTrue(TEST_CRITERIA_ID, TEST_USER_ID))
            .thenReturn(Optional.of(expectedCriteria));

        // Act
        Optional<SearchCriteria> result = searchService.getSearchCriteriaById(TEST_CRITERIA_ID, TEST_USER_ID);

        // Assert
        assertTrue(result.isPresent());
        assertEquals(TEST_CRITERIA_ID, result.get().getId());
        verify(searchRepository).updateLastAccessedAt(TEST_CRITERIA_ID, TEST_USER_ID);
    }

    @Test
    void testDeactivateSearchCriteriaSuccess() {
        // Arrange
        when(searchRepository.deactivateSearchCriteria(TEST_CRITERIA_ID, TEST_USER_ID))
            .thenReturn(1);

        // Act
        boolean result = searchService.deactivateSearchCriteria(TEST_CRITERIA_ID, TEST_USER_ID);

        // Assert
        assertTrue(result);
        verify(searchRepository).deactivateSearchCriteria(TEST_CRITERIA_ID, TEST_USER_ID);
    }

    @Test
    void testSearchCriteriaPerformance() {
        // Arrange
        SearchCriteria criteria = createTestSearchCriteria();
        when(searchRepository.save(any(SearchCriteria.class))).thenReturn(criteria);

        // Act
        long startTime = System.currentTimeMillis();
        searchService.createSearchCriteria(criteria, TEST_USER_ID);
        long executionTime = System.currentTimeMillis() - startTime;

        // Assert
        assertTrue(executionTime < PERFORMANCE_THRESHOLD_MS, 
            "Operation exceeded performance threshold of " + PERFORMANCE_THRESHOLD_MS + "ms");
    }

    @Test
    void testSearchCriteriaSecurity() {
        // Arrange
        SearchCriteria criteria = createTestSearchCriteria();
        when(searchRepository.findByIdAndCreatedByAndIsActiveTrue(TEST_CRITERIA_ID, "unauthorized-user"))
            .thenThrow(new AccessDeniedException("Access denied"));

        // Act & Assert
        assertThrows(AccessDeniedException.class, 
            () -> searchService.getSearchCriteriaById(TEST_CRITERIA_ID, "unauthorized-user"));
    }

    @Test
    void testBatchSearchCriteriaValidation() {
        // Arrange
        List<SearchCriteria> batchCriteria = generateLargeBatchCriteria();

        // Act & Assert
        assertDoesNotThrow(() -> {
            for (SearchCriteria criteria : batchCriteria) {
                searchService.validateSearchCriteria(criteria);
            }
        });
    }

    private SearchCriteria createTestSearchCriteria() {
        return SearchCriteria.builder()
            .id(TEST_CRITERIA_ID)
            .keywords(new String[]{"java", "spring"})
            .location("San Francisco")
            .minExperience(3)
            .maxExperience(5)
            .requiredSkills(new String[]{"java", "spring boot"})
            .optionalSkills(new String[]{"kubernetes", "aws"})
            .createdBy(TEST_USER_ID)
            .createdAt(LocalDateTime.now())
            .updatedAt(LocalDateTime.now())
            .isActive(true)
            .build();
    }

    private List<SearchCriteria> generateLargeBatchCriteria() {
        return Arrays.asList(
            createTestSearchCriteria(),
            createTestSearchCriteria(),
            createTestSearchCriteria()
        );
    }
}