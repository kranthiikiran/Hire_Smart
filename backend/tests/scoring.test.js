const { ScoringEngine } = require('../../ai/scoring_engine');

describe('Scoring Engine', () => {
  let engine;

  beforeEach(() => {
    engine = new ScoringEngine();
  });

  describe('calculate_skills_score', () => {
    it('should calculate perfect score when all skills match', () => {
      const requiredSkills = ['Python', 'JavaScript', 'MongoDB'];
      const resumeSkills = ['Python', 'JavaScript', 'MongoDB', 'React'];
      
      const score = engine.calculate_skills_score(requiredSkills, resumeSkills);
      
      expect(score).toBe(100);
    });

    it('should calculate partial score for partial matches', () => {
      const requiredSkills = ['Python', 'JavaScript', 'MongoDB'];
      const resumeSkills = ['Python', 'JavaScript'];
      
      const score = engine.calculate_skills_score(requiredSkills, resumeSkills);
      
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(100);
    });

    it('should return 0 for no matching skills', () => {
      const requiredSkills = ['Python', 'JavaScript', 'MongoDB'];
      const resumeSkills = ['Java', 'C++', 'PostgreSQL'];
      
      const score = engine.calculate_skills_score(requiredSkills, resumeSkills);
      
      expect(score).toBe(0);
    });

    it('should handle case-insensitive matching', () => {
      const requiredSkills = ['python', 'javascript'];
      const resumeSkills = ['Python', 'JavaScript'];
      
      const score = engine.calculate_skills_score(requiredSkills, resumeSkills);
      
      expect(score).toBe(100);
    });

    it('should handle empty skill lists', () => {
      const score1 = engine.calculate_skills_score([], []);
      const score2 = engine.calculate_skills_score(['Python'], []);
      
      expect(score1).toBe(0);
      expect(score2).toBe(0);
    });
  });

  describe('calculate_experience_score', () => {
    it('should give high score when experience matches requirements', () => {
      const requiredYears = 5;
      const candidateYears = 7;
      
      const score = engine.calculate_experience_score(requiredYears, candidateYears);
      
      expect(score).toBeGreaterThan(70);
    });

    it('should give lower score when experience is below requirement', () => {
      const requiredYears = 5;
      const candidateYears = 2;
      
      const score = engine.calculate_experience_score(requiredYears, candidateYears);
      
      expect(score).toBeLessThan(70);
    });

    it('should handle 0 years experience', () => {
      const score = engine.calculate_experience_score(5, 0);
      
      expect(score).toBeDefined();
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(100);
    });

    it('should give good score for over-qualified candidates', () => {
      const requiredYears = 3;
      const candidateYears = 10;
      
      const score = engine.calculate_experience_score(requiredYears, candidateYears);
      
      expect(score).toBeGreaterThan(70);
    });
  });

  describe('calculate_education_score', () => {
    it('should give high score for matching degree', () => {
      const requiredDegree = ['Bachelor', 'Master'];
      const candidateDegree = 'Bachelor in Computer Science';
      
      const score = engine.calculate_education_score(requiredDegree, candidateDegree);
      
      expect(score).toBeGreaterThan(50);
    });

    it('should handle missing education information', () => {
      const score = engine.calculate_education_score(['Bachelor'], '');
      
      expect(score).toBeDefined();
      expect(score).toBeGreaterThanOrEqual(0);
    });

    it('should give higher score for Master vs Bachelor requirement', () => {
      const score1 = engine.calculate_education_score(['Bachelor'], 'Master in Computer Science');
      const score2 = engine.calculate_education_score(['Master'], 'Bachelor in Computer Science');
      
      expect(score1).toBeGreaterThan(score2);
    });
  });

  describe('compute_final_score', () => {
    it('should return score between 0 and 100', () => {
      const result = engine.compute_final_score({
        semantic_score: 80,
        skills_score: 75,
        experience_score: 85,
        education_score: 70,
        cultural_fit_score: 60
      });
      
      expect(result.score).toBeGreaterThanOrEqual(0);
      expect(result.score).toBeLessThanOrEqual(100);
    });

    it('should classify SUITABLE for high scores', () => {
      const result = engine.compute_final_score({
        semantic_score: 90,
        skills_score: 85,
        experience_score: 90,
        education_score: 85,
        cultural_fit_score: 80
      });
      
      expect(result.classification).toContain('SUITABLE');
    });

    it('should classify NOT_SUITABLE for low scores', () => {
      const result = engine.compute_final_score({
        semantic_score: 30,
        skills_score: 25,
        experience_score: 40,
        education_score: 35,
        cultural_fit_score: 20
      });
      
      expect(result.classification).toContain('NOT_SUITABLE');
    });

    it('should include confidence score', () => {
      const result = engine.compute_final_score({
        semantic_score: 75,
        skills_score: 70,
        experience_score: 80,
        education_score: 65,
        cultural_fit_score: 70
      });
      
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(100);
    });
  });

  describe('Weight configuration', () => {
    it('should use default weights', () => {
      expect(engine.weights.semantic).toBe(0.35);
      expect(engine.weights.skills).toBe(0.30);
      expect(engine.weights.experience).toBe(0.20);
      expect(engine.weights.education).toBe(0.10);
      expect(engine.weights.cultural_fit).toBe(0.05);
    });

    it('should allow custom weight configuration', () => {
      const customWeights = {
        semantic: 0.40,
        skills: 0.40,
        experience: 0.15,
        education: 0.03,
        cultural_fit: 0.02
      };
      
      const customEngine = new ScoringEngine(customWeights);
      
      expect(customEngine.weights.semantic).toBe(0.40);
      expect(customEngine.weights.skills).toBe(0.40);
    });
  });
});
