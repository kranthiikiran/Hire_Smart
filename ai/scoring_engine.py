#!/usr/bin/env python3
"""
Advanced Weighted Scoring Engine for Resume Matching
Implements multi-criteria scoring with explainability
"""

import json
import numpy as np
from typing import Dict, List, Tuple, Any


class ScoringEngine:
    def __init__(self, weights: Dict[str, float] = None):
        """
        Initialize scoring engine with configurable weights
        """
        self.default_weights = {
            'semantic': 0.35,
            'skills': 0.30,
            'experience': 0.20,
            'education': 0.10,
            'cultural_fit': 0.05
        }

        self.weights = weights or self.default_weights

        # Validate weights sum to 1.0
        weight_sum = sum(self.weights.values())
        if not np.isclose(weight_sum, 1.0):
            raise ValueError(f"Weights must sum to 1.0, got {weight_sum}")

    def calculate_semantic_score(self,
                                similarity_values: List[float],
                                method: str = 'weighted_avg') -> float:
        """
        Calculate semantic similarity score
        """
        if not similarity_values:
            return 0.0

        similarities = np.array(similarity_values)

        if method == 'max':
            return float(np.max(similarities))
        elif method == 'avg':
            return float(np.mean(similarities))
        elif method == 'weighted_avg':
            n = len(similarities)
            weights = np.array([i + 1 for i in range(n)])
            weights = weights / weights.sum()
            return float(np.average(similarities, weights=weights))
        else:
            return float(np.mean(similarities))

    def calculate_skills_score(self,
                              matched_skills: List[str],
                              required_skills: List[str]) -> float:
        """
        Calculate skills match score
        """
        if not required_skills:
            return 1.0

        matched_count = len(matched_skills)
        required_count = len(required_skills)

        score = matched_count / required_count if required_count > 0 else 0
        return min(1.0, score)

    def calculate_experience_score(self,
                                  resume_data: Dict[str, Any],
                                  job_requirements: Dict[str, Any]) -> float:
        """
        Calculate experience alignment score
        """
        scores = []

        req_years = job_requirements.get('experience_required_years', 0)
        cand_years = resume_data.get('total_years', 0)

        if req_years > 0:
            years_match = min(cand_years / req_years, 1.0)
            scores.append(years_match)

        if resume_data.get('industry_continuous'):
            scores.append(1.0)
        else:
            scores.append(0.7)

        if resume_data.get('recent_tech_match'):
            scores.append(0.9)
        else:
            scores.append(0.6)

        return np.mean(scores) if scores else 0.5

    def calculate_education_score(self,
                                 resume_data: Dict[str, Any],
                                 job_requirements: Dict[str, Any]) -> float:
        """
        Calculate education alignment score
        """
        scores = []

        req_degree = job_requirements.get('education_required', 'Bachelor')
        cand_degree = resume_data.get('highest_degree', 'Bachelor')

        degree_hierarchy = {'High School': 1, 'Bachelor': 2, 'Master': 3, 'PhD': 4}

        cand_level = degree_hierarchy.get(cand_degree, 0)
        req_level = degree_hierarchy.get(req_degree, 0)

        if cand_level >= req_level:
            scores.append(1.0)
        else:
            scores.append(max(0.0, cand_level / req_level if req_level > 0 else 0))

        return np.mean(scores) if scores else 0.6

    def calculate_cultural_fit_score(self,
                                   resume_text: str,
                                   job_culture_keywords: List[str]) -> float:
        """
        Calculate cultural fit score based on keyword matching
        """
        if not job_culture_keywords:
            return 0.5

        resume_text_lower = resume_text.lower()

        matched_keywords = sum(
            1 for keyword in job_culture_keywords
            if keyword.lower() in resume_text_lower
        )

        return matched_keywords / len(job_culture_keywords) if job_culture_keywords else 0.5

    def compute_final_score(self,
                          component_scores: Dict[str, float]) -> Dict[str, Any]:
        """
        Compute weighted final score and classification
        """
        final_score = sum(
            self.weights.get(component, 0) * component_scores.get(component, 0)
            for component in self.weights.keys()
        )

        final_score = final_score * 100

        if final_score >= 75:
            classification = 'SUITABLE'
        elif final_score >= 50:
            classification = 'PARTIALLY_SUITABLE'
        else:
            classification = 'NOT_SUITABLE'

        variance = np.var(list(component_scores.values()))
        confidence = 1.0 - (variance / 2.0)
        confidence = max(0.5, min(1.0, confidence))

        return {
            'match_score': round(final_score, 1),
            'classification': classification,
            'confidence_score': round(confidence, 2),
            'component_scores': component_scores,
            'weights_used': self.weights
        }


def score_resume(component_scores: Dict[str, float],
                weights: Dict[str, float] = None) -> Dict[str, Any]:
    """
    Utility function to score a resume
    """
    engine = ScoringEngine(weights)
    return engine.compute_final_score(component_scores)
