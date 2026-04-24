#!/usr/bin/env python3
"""
OpenAI-first resume analysis engine.
Uses OpenAI embeddings for semantic similarity and GPT structured outputs for
skill extraction, scoring rationale, and candidate summaries.
"""

import os
import json
import sys
import math
from typing import Dict, List, Optional
from dotenv import load_dotenv

load_dotenv()

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    print("Warning: OpenAI package not installed. Install with: pip install openai", file=sys.stderr)


class OpenAIAnalyzer:
    """Handles OpenAI-based resume scoring and extraction."""

    def __init__(self, api_key: Optional[str] = None):
        self.api_key = api_key or os.getenv('OPENAI_API_KEY')
        self.chat_model = os.getenv('OPENAI_MODEL', 'gpt-4o-mini')
        self.embedding_model = os.getenv('OPENAI_EMBEDDING_MODEL', 'text-embedding-3-small')
        self.client = None
        self.enabled = False

        if OPENAI_AVAILABLE and self.api_key and self.api_key.startswith('sk-'):
            try:
                self.client = OpenAI(api_key=self.api_key)
                self.enabled = True
                print("OpenAI analyzer initialized", file=sys.stderr)
            except Exception as e:
                print(f"OpenAI initialization failed: {e}", file=sys.stderr)
                self.enabled = False
        else:
            print("OpenAI not configured", file=sys.stderr)

    def is_enabled(self) -> bool:
        return self.enabled

    def _clamp_score(self, value, default=0):
        try:
            parsed = float(value)
            if not math.isfinite(parsed):
                return int(default)
            return max(0, min(100, int(round(parsed))))
        except Exception:
            return int(default)

    def _normalize_classification(self, value: str, score: int) -> str:
        normalized = str(value or '').strip().lower()
        if 'partial' in normalized:
            return 'Partially Suitable'
        if 'not' in normalized:
            return 'Not Suitable'
        if 'suitable' in normalized:
            return 'Suitable'
        if score >= 75:
            return 'Suitable'
        if score >= 55:
            return 'Partially Suitable'
        return 'Not Suitable'

    def _clean_json_text(self, content: str) -> str:
        text = (content or '').strip()
        if text.startswith('```'):
            text = text.replace('```json', '').replace('```', '').strip()
        return text

    def _safe_json_load(self, content: str) -> Dict:
        try:
            return json.loads(self._clean_json_text(content))
        except Exception:
            return {}

    def _cosine_similarity(self, vec_a: List[float], vec_b: List[float]) -> float:
        if not vec_a or not vec_b or len(vec_a) != len(vec_b):
            return 0.0

        dot = sum(a * b for a, b in zip(vec_a, vec_b))
        norm_a = math.sqrt(sum(a * a for a in vec_a))
        norm_b = math.sqrt(sum(b * b for b in vec_b))
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot / (norm_a * norm_b)

    def semantic_similarity_embeddings(self, resume_text: str, job_description: str, job_title: str = '') -> int:
        """Compute semantic similarity using OpenAI embeddings (0-100)."""
        if not self.enabled:
            return 0

        jd_text = (job_description or '').strip()
        if not jd_text:
            jd_text = f"Role: {job_title or 'General position'}"

        try:
            response = self.client.embeddings.create(
                model=self.embedding_model,
                input=[jd_text[:6000], (resume_text or '')[:6000]]
            )
            vec_jd = response.data[0].embedding
            vec_resume = response.data[1].embedding
            similarity = self._cosine_similarity(vec_jd, vec_resume)
            return self._clamp_score(similarity * 100, default=0)
        except Exception as e:
            print(f"Embedding similarity failed: {e}", file=sys.stderr)
            return 0

    def evaluate_resume_structured(self, job_title: str, job_description: str, resume_text: str) -> Dict:
        """Use GPT to return structured extraction and evaluation details."""
        if not self.enabled:
            return {'error': 'OpenAI not available'}

        effective_jd = (job_description or '').strip() or f"Role: {job_title or 'General position'}"

        prompt = f"""You are an expert technical recruiter.
Analyze the resume against the job and return STRICT JSON only.

JOB TITLE:
{job_title or 'N/A'}

JOB DESCRIPTION:
{effective_jd[:3500]}

RESUME:
{(resume_text or '')[:4500]}

Return JSON with this exact shape:
{{
  "relevance_score": 0,
  "classification": "Suitable | Partially Suitable | Not Suitable",
  "reasoning": "short explanation",
  "candidate_profile": {{
    "skills": ["..."],
    "tools": ["..."],
    "experience_level": "Entry | Mid | Senior | Lead",
    "years_of_experience": 0,
    "qualifications": ["..."]
  }},
  "skills_matched": ["..."],
  "skills_missing": ["..."],
  "strengths": ["..."],
  "weaknesses": ["..."],
  "summary": "2-4 sentence analytical summary"
}}

Rules:
- Be strict and realistic on scores.
- Penalize missing required skills.
- Keep output valid JSON.
"""

        try:
            response = self.client.chat.completions.create(
                model=self.chat_model,
                temperature=0.2,
                response_format={"type": "json_object"},
                messages=[
                    {"role": "system", "content": "Return only valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1400
            )

            content = response.choices[0].message.content
            return self._safe_json_load(content)
        except Exception as e:
            print(f"Structured GPT evaluation failed: {e}", file=sys.stderr)
            return {'error': str(e)}

    def score_resume_with_gpt(self, job_title: str, job_description: str, resume_text: str, candidate_name: str) -> Dict:
        """Primary scoring method with embeddings + GPT structured evaluation."""
        if not self.enabled:
            return {'error': 'OpenAI not available', 'score': 0}

        structured = self.evaluate_resume_structured(job_title, job_description, resume_text)
        if 'error' in structured:
            return {
                'error': structured['error'],
                'score': 0,
                'classification': 'Error',
                'summary': 'Analysis failed'
            }

        embedding_score = self.semantic_similarity_embeddings(resume_text, job_description, job_title)
        gpt_score = self._clamp_score(structured.get('relevance_score', 0), default=0)

        # Blend GPT evaluation with embedding-based semantic similarity.
        final_score = self._clamp_score((gpt_score * 0.7) + (embedding_score * 0.3), default=gpt_score)
        classification = self._normalize_classification(structured.get('classification', ''), final_score)

        candidate_profile = structured.get('candidate_profile', {}) or {}
        matched_skills = structured.get('skills_matched', []) or []
        missing_skills = structured.get('skills_missing', []) or []

        skill_match_pct = 0
        total_skills = len(matched_skills) + len(missing_skills)
        if total_skills > 0:
            skill_match_pct = self._clamp_score((len(matched_skills) / total_skills) * 100)

        years_of_experience = candidate_profile.get('years_of_experience', 0)
        experience_match = candidate_profile.get('experience_level', 'Mid')

        response = {
            'candidate_name': candidate_name,
            'score': final_score,
            'overall_score': final_score,
            'classification': classification,
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'experience_match': experience_match,
            'years_experience': years_of_experience,
            'skills_match': f"{skill_match_pct}%",
            'qualifications_match': f"{embedding_score}%",
            'semantic_similarity': embedding_score,
            'overall_fit': f"{final_score}%",
            'summary': structured.get('summary', 'OpenAI analysis completed.'),
            'reason_for_score': structured.get('reasoning', ''),
            'key_strengths': structured.get('strengths', []),
            'key_weaknesses': structured.get('weaknesses', []),
            'candidate_profile': {
                'skills': candidate_profile.get('skills', []),
                'tools': candidate_profile.get('tools', []),
                'experience_level': candidate_profile.get('experience_level', ''),
                'years_of_experience': years_of_experience,
                'qualifications': candidate_profile.get('qualifications', [])
            },
            'ai_method': 'openai_embeddings_plus_gpt'
        }

        return response


def main():
    analyzer = OpenAIAnalyzer()
    print(f"OpenAI Analyzer Status: {'Enabled' if analyzer.is_enabled() else 'Disabled'}")


if __name__ == '__main__':
    main()
