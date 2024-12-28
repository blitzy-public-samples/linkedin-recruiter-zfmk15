import React, { useEffect, useMemo, useCallback } from 'react';
import { useTheme } from '@mui/material/styles';
import {
  Box,
  Typography,
  CircularProgress,
  Button,
  Divider,
  Grid,
  Skeleton
} from '@mui/material';
import { AnalysisResult, SkillAnalysis, ExperienceAnalysis, AnalysisStatus } from '../../../types/analysis.types';
import useProfile from '../../../hooks/useProfile';
import Chart from '../../common/Chart/Chart';

interface ProfileAnalysisProps {
  profileId: string;
  className?: string;
  onAnalysisComplete?: (result: AnalysisResult) => void;
}

const ProfileAnalysis = React.memo(({ 
  profileId, 
  className,
  onAnalysisComplete 
}: ProfileAnalysisProps) => {
  const theme = useTheme();
  const { profile, analysisInProgress, triggerAnalysis, analysisError } = useProfile(profileId);

  // Trigger analysis completion callback
  useEffect(() => {
    if (profile?.lastAnalyzedAt && onAnalysisComplete) {
      onAnalysisComplete(profile.analysis);
    }
  }, [profile?.lastAnalyzedAt, onAnalysisComplete]);

  // Format skill data for radar chart
  const skillChartData = useMemo(() => {
    if (!profile?.analysis?.skillAnalysis) return [];
    return profile.analysis.skillAnalysis.map(skill => ({
      skill: skill.skillName,
      score: skill.proficiencyScore,
      experience: skill.yearsOfExperience
    }));
  }, [profile?.analysis?.skillAnalysis]);

  // Format experience data for bar chart
  const experienceChartData = useMemo(() => {
    if (!profile?.analysis?.experienceAnalysis) return [];
    return profile.analysis.experienceAnalysis.map(exp => ({
      role: exp.roleTitle,
      relevance: exp.roleRelevanceScore,
      impact: exp.projectImpactScore
    }));
  }, [profile?.analysis?.experienceAnalysis]);

  // Handle retry analysis
  const handleRetryAnalysis = useCallback(async () => {
    try {
      await triggerAnalysis();
    } catch (error) {
      console.error('Failed to retry analysis:', error);
    }
  }, [triggerAnalysis]);

  // Render skill analysis section
  const renderSkillAnalysis = (skillAnalysis: SkillAnalysis[]) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Skill Analysis
      </Typography>
      <Box sx={{ height: 300, mb: 2 }}>
        <Chart
          type="radar"
          data={skillChartData}
          xKey="skill"
          yKey="score"
          accessibilityLabel="Skill proficiency radar chart"
          tooltipConfig={{
            formatter: (value) => `${value}% proficiency`
          }}
        />
      </Box>
      <Grid container spacing={2}>
        {skillAnalysis.map((skill) => (
          <Grid item xs={12} sm={6} md={4} key={skill.skillName}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle1">{skill.skillName}</Typography>
              <Typography variant="body2" color="text.secondary">
                {skill.yearsOfExperience} years experience
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Last used: {skill.lastUsed ? new Date(skill.lastUsed).toLocaleDateString() : 'N/A'}
              </Typography>
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render experience analysis section
  const renderExperienceAnalysis = (experienceAnalysis: ExperienceAnalysis[]) => (
    <Box sx={{ mb: 4 }}>
      <Typography variant="h6" gutterBottom>
        Experience Analysis
      </Typography>
      <Box sx={{ height: 300, mb: 2 }}>
        <Chart
          type="bar"
          data={experienceChartData}
          xKey="role"
          yKey="relevance"
          accessibilityLabel="Role relevance bar chart"
          tooltipConfig={{
            formatter: (value) => `${value}% relevant`
          }}
        />
      </Box>
      <Grid container spacing={2}>
        {experienceAnalysis.map((exp, index) => (
          <Grid item xs={12} key={index}>
            <Box sx={{ p: 2, bgcolor: 'background.paper', borderRadius: 1 }}>
              <Typography variant="subtitle1">
                Role Match: {exp.roleRelevanceScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Industry Match: {exp.industryMatchScore}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Impact Score: {exp.projectImpactScore}%
              </Typography>
              {exp.keyAchievements.length > 0 && (
                <Box sx={{ mt: 1 }}>
                  <Typography variant="body2" fontWeight="medium">
                    Key Achievements:
                  </Typography>
                  <ul>
                    {exp.keyAchievements.map((achievement, i) => (
                      <li key={i}>
                        <Typography variant="body2">{achievement}</Typography>
                      </li>
                    ))}
                  </ul>
                </Box>
              )}
            </Box>
          </Grid>
        ))}
      </Grid>
    </Box>
  );

  // Render loading state
  if (analysisInProgress) {
    return (
      <Box 
        sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center',
          p: 4 
        }}
        className={className}
      >
        <CircularProgress size={48} />
        <Typography variant="body1" sx={{ mt: 2 }}>
          Analyzing profile...
        </Typography>
      </Box>
    );
  }

  // Render error state
  if (analysisError) {
    return (
      <Box 
        sx={{ 
          textAlign: 'center',
          p: 4 
        }}
        className={className}
      >
        <Typography variant="h6" color="error" gutterBottom>
          Analysis Failed
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          {analysisError.message}
        </Typography>
        <Button 
          variant="contained" 
          onClick={handleRetryAnalysis}
          aria-label="Retry analysis"
        >
          Retry Analysis
        </Button>
      </Box>
    );
  }

  // Render analysis results
  if (profile?.analysis) {
    const { skillAnalysis, experienceAnalysis, overallMatchScore } = profile.analysis;

    return (
      <Box className={className}>
        <Box sx={{ mb: 4, textAlign: 'center' }}>
          <Typography variant="h5" gutterBottom>
            Profile Analysis Results
          </Typography>
          <Typography variant="h3" color="primary">
            {overallMatchScore}%
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Overall Match Score
          </Typography>
        </Box>

        <Divider sx={{ my: 4 }} />
        
        {skillAnalysis && renderSkillAnalysis(skillAnalysis)}
        
        <Divider sx={{ my: 4 }} />
        
        {experienceAnalysis && renderExperienceAnalysis(experienceAnalysis)}
      </Box>
    );
  }

  // Render empty state
  return (
    <Box 
      sx={{ 
        textAlign: 'center',
        p: 4 
      }}
      className={className}
    >
      <Typography variant="body1" paragraph>
        No analysis available for this profile.
      </Typography>
      <Button 
        variant="contained" 
        onClick={handleRetryAnalysis}
        aria-label="Start analysis"
      >
        Start Analysis
      </Button>
    </Box>
  );
});

ProfileAnalysis.displayName = 'ProfileAnalysis';

export default ProfileAnalysis;