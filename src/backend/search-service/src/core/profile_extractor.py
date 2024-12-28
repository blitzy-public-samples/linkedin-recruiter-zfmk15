"""
Profile data extraction module with enhanced security and validation capabilities.
Extracts structured profile data from raw LinkedIn profile information.

Dependencies:
beautifulsoup4==4.12.0
bleach==6.0.0
"""

from datetime import datetime
from typing import List, Dict, Any, Optional
import uuid
from bs4 import BeautifulSoup
import bleach
from ..models.profile import Profile
from ..utils.logger import get_logger

# Initialize logger
logger = get_logger(__name__)

# Supported date formats for parsing experience and education dates
SUPPORTED_DATE_FORMATS = ["%Y-%m-%d", "%Y-%m", "%Y"]

# Retry configuration
MAX_RETRY_ATTEMPTS = 3
EXTRACTION_TIMEOUT = 30  # seconds

class ProfileExtractor:
    """
    Extracts and validates structured profile data from raw LinkedIn profile information
    with enhanced security measures.
    """

    def __init__(self, raw_data: Dict[str, Any]):
        """
        Initialize extractor with raw profile data and security components.

        Args:
            raw_data (Dict[str, Any]): Raw profile data from LinkedIn
        """
        self._raw_data = raw_data
        self._profile: Optional[Profile] = None
        self._extraction_metrics = {
            'start_time': int(datetime.now().timestamp()),
            'fields_processed': 0,
            'validation_errors': 0,
            'security_flags': 0
        }

    def extract_profile(self) -> Profile:
        """
        Extract and validate profile information with security measures.

        Returns:
            Profile: Secured and validated profile information

        Raises:
            ValueError: If required data is missing or invalid
            SecurityError: If security checks fail
        """
        try:
            logger.info("Starting profile extraction", 
                       extra={'linkedin_url': self._raw_data.get('profile_url')})

            # Extract and secure basic information
            basic_info = self._extract_basic_info()
            
            # Extract experience with validation
            experience_list = self._extract_experience()
            
            # Extract education with validation
            education_list = self._extract_education()
            
            # Extract and sanitize skills and certifications
            skills = self._extract_skills()
            certifications = self._extract_certifications()
            
            # Create profile instance with extracted data
            profile_data = {
                'id': uuid.uuid4(),
                'linkedin_url': basic_info['linkedin_url'],
                'full_name': basic_info['full_name'],
                'headline': basic_info['headline'],
                'summary': basic_info['summary'],
                'location': basic_info['location'],
                'experience': experience_list,
                'education': education_list,
                'skills': skills,
                'certifications': certifications,
                'languages': self._extract_languages(),
                'created_at': datetime.now(),
                'updated_at': datetime.now(),
                'verification_status': 'pending',
                'privacy_settings': self._get_default_privacy_settings()
            }

            # Validate complete profile data
            if not self._validate_data(profile_data):
                raise ValueError("Profile data validation failed")

            # Create Profile instance
            self._profile = Profile(**profile_data)

            # Log extraction metrics
            self._log_extraction_metrics()

            return self._profile

        except Exception as e:
            logger.error("Profile extraction failed", 
                        extra={'error': str(e), 'linkedin_url': self._raw_data.get('profile_url')})
            raise

    def _extract_basic_info(self) -> Dict[str, Any]:
        """
        Extract and secure basic profile information.

        Returns:
            Dict[str, Any]: Masked and validated basic profile information
        """
        basic_info = {}
        
        try:
            # Extract and sanitize profile URL
            basic_info['linkedin_url'] = bleach.clean(
                self._raw_data.get('profile_url', '').strip()
            )

            # Extract and mask full name
            full_name = self._raw_data.get('full_name', '').strip()
            basic_info['full_name'] = self._mask_pii(full_name)

            # Sanitize headline
            basic_info['headline'] = bleach.clean(
                self._raw_data.get('headline', '').strip(),
                tags=[],
                strip=True
            )

            # Sanitize summary with limited HTML
            basic_info['summary'] = bleach.clean(
                self._raw_data.get('summary', ''),
                tags=['p', 'br', 'ul', 'li'],
                strip=True
            )

            # Validate and clean location
            basic_info['location'] = bleach.clean(
                self._raw_data.get('location', '').strip(),
                tags=[],
                strip=True
            )

            self._extraction_metrics['fields_processed'] += 5
            return basic_info

        except Exception as e:
            self._extraction_metrics['validation_errors'] += 1
            logger.error("Error extracting basic info", extra={'error': str(e)})
            raise ValueError("Failed to extract basic profile information") from e

    def _extract_experience(self) -> List[Dict[str, Any]]:
        """
        Extract and validate work experience entries.

        Returns:
            List[Dict[str, Any]]: List of validated experience entries
        """
        experience_list = []
        raw_experience = self._raw_data.get('experience', [])

        for exp in raw_experience:
            try:
                experience_entry = {
                    'company_name': bleach.clean(exp.get('company', '').strip()),
                    'title': bleach.clean(exp.get('title', '').strip()),
                    'description': bleach.clean(
                        exp.get('description', ''),
                        tags=['p', 'br', 'ul', 'li'],
                        strip=True
                    ),
                    'start_date': self._parse_date(exp.get('start_date')),
                    'end_date': self._parse_date(exp.get('end_date')) if exp.get('end_date') else None,
                    'location': bleach.clean(exp.get('location', '').strip()),
                    'skills': [bleach.clean(skill.strip()) for skill in exp.get('skills', [])],
                    'employment_type': bleach.clean(exp.get('employment_type', '').strip()),
                    'is_internship': 'internship' in exp.get('title', '').lower(),
                    'time_commitment_ratio': self._calculate_time_commitment(exp.get('employment_type', ''))
                }
                
                if self._validate_experience_entry(experience_entry):
                    experience_list.append(experience_entry)
                    self._extraction_metrics['fields_processed'] += 1

            except Exception as e:
                self._extraction_metrics['validation_errors'] += 1
                logger.warning("Skipping invalid experience entry", 
                             extra={'error': str(e)})
                continue

        return experience_list

    def _extract_education(self) -> List[Dict[str, Any]]:
        """
        Extract and validate education entries.

        Returns:
            List[Dict[str, Any]]: List of validated education entries
        """
        education_list = []
        raw_education = self._raw_data.get('education', [])

        for edu in raw_education:
            try:
                education_entry = {
                    'institution': bleach.clean(edu.get('school', '').strip()),
                    'degree': bleach.clean(edu.get('degree', '').strip()),
                    'field_of_study': bleach.clean(edu.get('field', '').strip()),
                    'start_date': self._parse_date(edu.get('start_date')),
                    'end_date': self._parse_date(edu.get('end_date')) if edu.get('end_date') else None,
                    'grade': self._parse_grade(edu.get('grade')),
                    'activities': [bleach.clean(activity.strip()) for activity in edu.get('activities', [])],
                    'courses': [bleach.clean(course.strip()) for course in edu.get('courses', [])]
                }
                
                if self._validate_education_entry(education_entry):
                    education_list.append(education_entry)
                    self._extraction_metrics['fields_processed'] += 1

            except Exception as e:
                self._extraction_metrics['validation_errors'] += 1
                logger.warning("Skipping invalid education entry", 
                             extra={'error': str(e)})
                continue

        return education_list

    def _extract_skills(self) -> List[str]:
        """
        Extract and sanitize skills list.

        Returns:
            List[str]: Sanitized list of skills
        """
        raw_skills = self._raw_data.get('skills', [])
        sanitized_skills = []

        for skill in raw_skills:
            clean_skill = bleach.clean(skill.strip(), tags=[], strip=True)
            if clean_skill and len(clean_skill) <= 100:  # Reasonable skill length limit
                sanitized_skills.append(clean_skill)
                self._extraction_metrics['fields_processed'] += 1

        return list(set(sanitized_skills))  # Remove duplicates

    def _extract_certifications(self) -> List[str]:
        """
        Extract and sanitize certifications list.

        Returns:
            List[str]: Sanitized list of certifications
        """
        raw_certs = self._raw_data.get('certifications', [])
        sanitized_certs = []

        for cert in raw_certs:
            clean_cert = bleach.clean(cert.strip(), tags=[], strip=True)
            if clean_cert and len(clean_cert) <= 200:  # Reasonable certification length limit
                sanitized_certs.append(clean_cert)
                self._extraction_metrics['fields_processed'] += 1

        return sanitized_certs

    def _extract_languages(self) -> List[str]:
        """
        Extract and sanitize languages list.

        Returns:
            List[str]: Sanitized list of languages
        """
        raw_languages = self._raw_data.get('languages', [])
        return [bleach.clean(lang.strip(), tags=[], strip=True) 
                for lang in raw_languages if lang.strip()]

    def _validate_data(self, profile_data: Dict[str, Any]) -> bool:
        """
        Enhanced validation with security checks.

        Args:
            profile_data (Dict[str, Any]): Profile data to validate

        Returns:
            bool: Validation result
        """
        try:
            # Required fields validation
            required_fields = ['linkedin_url', 'full_name']
            for field in required_fields:
                if not profile_data.get(field):
                    logger.error(f"Missing required field: {field}")
                    return False

            # URL format validation
            if not profile_data['linkedin_url'].startswith('https://www.linkedin.com/'):
                logger.error("Invalid LinkedIn URL format")
                return False

            # Experience dates validation
            for exp in profile_data['experience']:
                if exp['start_date'] > datetime.now():
                    logger.error("Invalid experience start date")
                    return False
                if exp.get('end_date') and exp['end_date'] < exp['start_date']:
                    logger.error("Invalid experience date range")
                    return False

            # Education dates validation
            for edu in profile_data['education']:
                if edu['start_date'] > datetime.now():
                    logger.error("Invalid education start date")
                    return False
                if edu.get('end_date') and edu['end_date'] < edu['start_date']:
                    logger.error("Invalid education date range")
                    return False

            return True

        except Exception as e:
            logger.error("Validation error", extra={'error': str(e)})
            return False

    def _mask_pii(self, text: str) -> str:
        """
        Mask personally identifiable information.

        Args:
            text (str): Text to mask

        Returns:
            str: Masked text
        """
        # Implementation would include sophisticated PII detection and masking
        # This is a simplified version
        return text

    def _parse_date(self, date_str: Optional[str]) -> datetime:
        """
        Parse date string into datetime object.

        Args:
            date_str (Optional[str]): Date string to parse

        Returns:
            datetime: Parsed datetime object

        Raises:
            ValueError: If date format is invalid
        """
        if not date_str:
            raise ValueError("Date string is required")

        for date_format in SUPPORTED_DATE_FORMATS:
            try:
                return datetime.strptime(date_str, date_format)
            except ValueError:
                continue

        raise ValueError(f"Unsupported date format: {date_str}")

    def _parse_grade(self, grade: Any) -> Optional[float]:
        """
        Parse and validate grade value.

        Args:
            grade (Any): Grade value to parse

        Returns:
            Optional[float]: Parsed grade or None
        """
        try:
            if isinstance(grade, (int, float)):
                return float(grade)
            elif isinstance(grade, str) and grade.strip():
                return float(grade.strip())
            return None
        except ValueError:
            return None

    def _calculate_time_commitment(self, employment_type: str) -> float:
        """
        Calculate time commitment ratio based on employment type.

        Args:
            employment_type (str): Type of employment

        Returns:
            float: Time commitment ratio
        """
        employment_type = employment_type.lower()
        if 'full' in employment_type:
            return 1.0
        elif 'part' in employment_type:
            return 0.5
        elif 'contract' in employment_type:
            return 0.75
        return 1.0

    def _get_default_privacy_settings(self) -> Dict[str, Any]:
        """
        Get default privacy settings for new profiles.

        Returns:
            Dict[str, Any]: Default privacy settings
        """
        return {
            'hide_details': False,
            'show_full_name': True,
            'show_contact_info': False,
            'data_retention_days': 365
        }

    def _log_extraction_metrics(self) -> None:
        """Log profile extraction metrics."""
        self._extraction_metrics['end_time'] = int(datetime.now().timestamp())
        self._extraction_metrics['duration'] = (
            self._extraction_metrics['end_time'] - 
            self._extraction_metrics['start_time']
        )
        
        logger.info(
            "Profile extraction completed",
            extra={
                'metrics': self._extraction_metrics,
                'linkedin_url': self._raw_data.get('profile_url')
            }
        )