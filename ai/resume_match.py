#!/usr/bin/env python3
"""
HireSmart AI Resume Screening System
Advanced NLP-based resume analysis and matching system
Extracts skills, computes match scores, and classifies candidates
OpenAI-first scoring with traditional NLP compatibility fallback
"""

import json
import sys
import re
import os
from collections import Counter
from typing import Dict, List, Tuple, Any

try:
    from sklearn.feature_extraction.text import TfidfVectorizer
    from sklearn.metrics.pairwise import cosine_similarity
    SKLEARN_AVAILABLE = True
except ImportError:
    SKLEARN_AVAILABLE = False

# OpenAI Integration
try:
    from openai_analyzer import OpenAIAnalyzer
    OPENAI_INTEGRATION_AVAILABLE = True
except ImportError:
    OPENAI_INTEGRATION_AVAILABLE = False
    OpenAIAnalyzer = None

# Modern 2026 Comprehensive Skill Database
TECHNICAL_SKILLS = {
    'programming': [
        'python', 'java', 'javascript', 'typescript', 'c++', 'c#', 'go', 'rust',
        'php', 'ruby', 'swift', 'kotlin', 'scala', 'r', 'matlab', 'perl', 'dart',
        'elixir', 'haskell', 'julia', 'zig', 'carbon', 'mojo'
    ],
    'modern_frameworks': [
        'react', 'next.js', 'nextjs', 'vue', 'vue.js', 'nuxt', 'svelte', 'sveltekit',
        'angular', 'solid.js', 'remix', 'astro', 'qwik', 'fresh', 'htmx'
    ],
    'backend_frameworks': [
        'nodejs', 'node.js', 'express', 'fastify', 'nestjs', 'django', 'flask',
        'fastapi', 'spring', 'spring boot', 'springboot', 'laravel', 'rails',
        'asp.net', 'asp net', '.net', 'dotnet', 'gin', 'fiber', 'echo', 'actix'
    ],
    'web_technologies': [
        'html', 'css', 'html5', 'css3', 'sass', 'scss', 'tailwind', 'tailwindcss',
        'bootstrap', 'material-ui', 'mui', 'chakra ui', 'shadcn', 'daisyui',
        'rest', 'restful', 'graphql', 'grpc', 'websockets', 'web api', 'trpc',
        'webassembly', 'wasm', 'pwa', 'web components'
    ],
    'databases': [
        'sql', 'mysql', 'postgresql', 'postgres', 'oracle', 'mongodb', 'nosql',
        'redis', 'cassandra', 'dynamodb', 'elasticsearch', 'firebase', 'firestore',
        'sqlite', 'mariadb', 'cockroachdb', 'neo4j', 'supabase', 'planetscale',
        'prisma', 'typeorm', 'sequelize', 'mongoose', 'drizzle'
    ],
    'cloud_platforms': [
        'aws', 'azure', 'gcp', 'google cloud', 'heroku', 'digitalocean', 'vercel',
        'netlify', 'cloudflare', 'railway', 'render', 'fly.io', 'supabase',
        'docker', 'kubernetes', 'k8s', 'lambda', 's3', 'ec2', 'ecs', 'eks',
        'cloud run', 'cloud functions', 'azure functions', 'serverless'
    ],
    'ai_ml': [
        'machine learning', 'deep learning', 'nlp', 'llm', 'gpt', 'generative ai',
        'artificial intelligence', 'ai', 'ml', 'neural networks', 'transformers',
        'tensorflow', 'pytorch', 'keras', 'scikit-learn', 'hugging face', 'langchain',
        'llamaindex', 'openai', 'claude', 'gemini', 'stable diffusion', 'diffusion models',
        'pandas', 'numpy', 'matplotlib', 'seaborn', 'plotly', 'jupyter',
        'computer vision', 'cv', 'opencv', 'yolo', 'rag', 'vector database',
        'pinecone', 'weaviate', 'chromadb', 'embedding', 'fine-tuning', 'prompt engineering'
    ],
    'devops_cloud': [
        'docker', 'kubernetes', 'k8s', 'jenkins', 'github actions', 'gitlab ci',
        'ci/cd', 'cicd', 'devops', 'terraform', 'ansible', 'puppet', 'chef',
        'nginx', 'apache', 'prometheus', 'grafana', 'datadog', 'new relic',
        'cloudformation', 'pulumi', 'helm', 'argocd', 'flux', 'istio', 'service mesh'
    ],
    'mobile_development': [
        'react native', 'flutter', 'swift', 'swiftui', 'kotlin', 'java android',
        'android', 'ios', 'mobile', 'expo', 'cordova', 'ionic', 'xamarin'
    ],
    'testing_quality': [
        'jest', 'mocha', 'chai', 'cypress', 'playwright', 'selenium', 'pytest',
        'junit', 'testing', 'unit testing', 'integration testing', 'e2e',
        'tdd', 'test driven development', 'qa', 'quality assurance'
    ],
    'modern_tools': [
        'git', 'github', 'gitlab', 'bitbucket', 'vscode', 'intellij', 'vim',
        'webpack', 'vite', 'rollup', 'esbuild', 'turbopack', 'parcel',
        'npm', 'yarn', 'pnpm', 'bun', 'deno', 'eslint', 'prettier', 'biome'
    ],
    'data_tools': [
        'spark', 'hadoop', 'kafka', 'airflow', 'dbt', 'snowflake', 'databricks',
        'power bi', 'tableau', 'looker', 'metabase', 'redshift', 'bigquery',
        'data warehouse', 'etl', 'data pipeline', 'streaming', 'batch processing'
    ],
    'security': [
        'cybersecurity', 'security', 'penetration testing', 'owasp', 'oauth',
        'jwt', 'sso', 'authentication', 'authorization', 'encryption', 'ssl', 'tls',
        'vulnerability', 'compliance', 'gdpr', 'soc2', 'iso27001'
    ],
    'blockchain_web3': [
        'blockchain', 'ethereum', 'solidity', 'web3', 'smart contracts', 'defi',
        'nft', 'cryptocurrency', 'bitcoin', 'solana', 'polygon', 'hardhat', 'truffle'
    ],
    'design_tools': [
        'figma', 'sketch', 'adobe xd', 'photoshop', 'illustrator', 'canva',
        'ui design', 'ux design', 'wireframing', 'prototyping', 'user research',
        'usability testing', 'design systems', 'accessibility', 'a11y'
    ],
    'marketing_analytics': [
        'seo', 'sem', 'google analytics', 'google ads', 'facebook ads', 'social media',
        'content marketing', 'email marketing', 'marketing automation', 'crm',
        'salesforce', 'hubspot', 'mailchimp', 'hootsuite', 'analytics'
    ],
    'business_skills': [
        'agile', 'scrum', 'kanban', 'jira', 'confluence', 'project management',
        'product management', 'roadmap', 'stakeholder management', 'requirements',
        'business analysis', 'data analysis', 'excel', 'spreadsheet', 'presentation'
    ],
    'soft_skills': [
        'communication', 'teamwork', 'leadership', 'problem solving', 'collaboration',
        'time management', 'analytical', 'critical thinking', 'creativity',
        'adaptability', 'mentoring', 'remote work', 'cross-functional', 'ownership'
    ]
}

# Job title to skills mapping for when no job description is provided
JOB_TITLE_REQUIREMENTS = {
    'software engineer': 'programming languages python java javascript problem solving algorithms data structures git api design testing debugging agile software development code review',
    'senior software engineer': 'advanced programming python java javascript system design architecture leadership mentoring code review cloud aws azure docker kubernetes microservices apis scalability',
    'full stack developer': 'react nodejs javascript typescript html css mongodb postgresql rest api frontend backend full stack git docker',
    'frontend developer': 'react vue angular javascript typescript html css sass tailwind responsive design ui ux webpack git browser apis',
    'backend developer': 'nodejs python java api design rest graphql databases sql mongodb redis docker authentication authorization microservices',
    'data scientist': 'python r machine learning deep learning statistics pandas numpy tensorflow pytorch sql data analysis visualization jupyter scikit-learn',
    'data analyst': 'sql python excel tableau power bi data visualization statistics analytics reporting data analysis dashboard',
    'machine learning engineer': 'python tensorflow pytorch machine learning deep learning neural networks nlp computer vision scikit-learn model deployment mlops',
    'devops engineer': 'docker kubernetes jenkins ci cd terraform ansible aws azure cloud linux shell scripting monitoring logging automation infrastructure',
    'cloud engineer': 'aws azure gcp kubernetes docker terraform cloud architecture serverless lambda s3 ec2 networking security iam',
    'product manager': 'product management roadmap agile scrum jira requirements stakeholder management user stories analytics data-driven prioritization strategy',
    'project manager': 'project management agile scrum kanban jira stakeholder management risk management budget planning communication leadership coordination',
    'business analyst': 'requirements gathering business analysis data analysis sql excel documentation stakeholder communication process improvement reporting analytics',
    'ui/ux designer': 'figma sketch adobe xd ui design ux design wireframing prototyping user research usability testing design systems accessibility html css',
    'graphic designer': 'adobe photoshop illustrator indesign figma branding typography layout design creative visual design canva',
    'marketing manager': 'marketing strategy digital marketing seo sem social media content marketing analytics google analytics campaign management team leadership',
    'digital marketing specialist': 'seo sem google analytics google ads facebook ads social media content marketing email marketing marketing automation analytics',
    'content writer': 'content writing copywriting seo content strategy blogging editing proofreading research wordpress social media communication',
    'sales manager': 'sales management b2b sales crm salesforce team leadership pipeline management negotiation forecasting strategy customer relationship',
    'account executive': 'sales b2b crm salesforce prospecting lead generation negotiation customer relationship closing deals presentation',
    'customer success manager': 'customer success account management crm relationship building problem solving communication analytics retention onboarding',
    'hr manager': 'human resources recruitment employee relations performance management hr policies compliance training development team management',
    'recruiter': 'recruitment sourcing interviewing candidate screening applicant tracking linkedin talent acquisition hiring negotiation',
    'financial analyst': 'financial analysis excel financial modeling forecasting budgeting accounting financial reporting data analysis presentation',
    'accountant': 'accounting bookkeeping quickbooks excel financial reporting tax preparation gaap reconciliation audit compliance',
    'quality assurance engineer': 'testing qa automation selenium cypress playwright junit pytest test cases bug tracking jira regression testing',
    'systems administrator': 'linux windows server administration networking bash powershell Active Directory monitoring backup security troubleshooting',
    'network engineer': 'networking cisco tcp/ip routing switching firewall vpn network security troubleshooting wan lan infrastructure',
    'cybersecurity analyst': 'cybersecurity security analysis penetration testing vulnerability assessment firewall ids ips incident response compliance siem',
    'operations manager': 'operations management process improvement team leadership project management budgeting resource planning efficiency metrics analytics'
}

# ===== SKILL NORMALIZATION MAP FOR ACCURACY =====
# Normalizes skill variations to canonical forms (e.g., "Node.js", "NodeJS", "Node" -> "nodejs")
SKILL_NORMALIZATION = {
    'nodejs': ['node', 'node.js', 'nodejs', 'node js', 'node-js'],
    'typescript': ['ts', 'tsx', 'typescript', 'type script', 'type-script'],
    'javascript': ['js', 'javascript', 'java script', 'java-script'],
    'python': ['python', 'py', 'python3', 'python 3', 'python2', 'python 2'],
    'react': ['react', 'reactjs', 'react.js', 'react js', 'react-js'],
    'kubernetes': ['k8s', 'kubernetes', 'k8', 'kube'],
    'docker': ['docker', 'dockerization', 'docker container', 'containerization'],
    'csharp': ['c#', 'c sharp', 'csharp', 'cs', 'c-sharp'],
    'cpp': ['c++', 'cpp', 'c plus plus', 'c++plus'],
    'sql': ['sql', 'sql database', 'structured query language', 'sqlserver'],
    'postgresql': ['postgres', 'postgresql', 'postgre', 'psql'],
    'mongodb': ['mongo', 'mongodb', 'mongo db', 'mongo-db'],
    'rest': ['rest', 'restful', 'rest api', 'rest apis', 'rest-api'],
    'graphql': ['graphql', 'graph ql'],
    'aws': ['amazon web services', 'aws', 'amazon aws'],
    'gcp': ['google cloud', 'gcp', 'google cloud platform', 'google-cloud'],
    'azure': ['microsoft azure', 'azure', 'ms azure'],
    'jenkins': ['jenkins', 'jenkins ci', 'jenkins-ci'],
    'github': ['github', 'git hub'],
    'gitlab': ['gitlab', 'git lab'],
    'git': ['git', 'version control git'],
    'agile': ['agile', 'agile development', 'agile methodology'],
    'scrum': ['scrum', 'scrum framework', 'scrummaster'],
    'html': ['html', 'html5', 'html 5', 'hypertext markup language'],
    'css': ['css', 'css3', 'css 3', 'cascading style sheets'],
    'sass': ['sass', 'scss', 'syntactically awesome stylesheets'],
    'linux': ['linux', 'gnu/linux', 'ubuntu', 'centos', 'debian'],
    'windows': ['windows', 'windows server'],
    'machine learning': ['machine learning', 'ml', 'machine-learning'],
    'deep learning': ['deep learning', 'deep-learning', 'neural networks', 'neural network'],
    'tensorflow': ['tensorflow', 'tf', 'tensor flow'],
    'pytorch': ['pytorch', 'torch', 'py torch'],
    'api': ['api', 'apis', 'application programming interface'],
    'microservices': ['microservices', 'micro-services', 'microservice architecture'],
}

# Create reverse mapping for quick lookup
SKILL_CANONICAL = {v: k for k, variations in SKILL_NORMALIZATION.items() for v in variations}

# ===== PROFICIENCY LEVEL INDICATORS =====
PROFICIENCY_LEVELS = {
    'expert': ['expert', 'proficient', 'mastered', 'expertise', 'deep expertise', 
               'master', 'specialized', 'specialist', 'authority'],
    'advanced': ['advanced', 'skilled in', 'highly skilled', '7+', '8+', '9+', '10+', '15+', '20+',
                 'extensive', 'comprehensive', 'deep knowledge', 'proven track record'],
    'intermediate': ['intermediate', 'competent', 'comfortable with', 'good experience',
                    '3-5', '4-6', '5-7', '5+ years', '6+ years'],
    'basic': ['basic', 'beginner', 'junior', 'learning', 'familiar with', 'introduction',
              '1-2', '1-3', 'newly', 'entry-level', 'entry level', 'fresher'],
}

class ResumeAnalyzer:
    """Analyzes resumes against job descriptions using NLP techniques"""

    def __init__(self):
        self.technical_skills = TECHNICAL_SKILLS
        # Use fixed random_state for deterministic results across runs
        self.vectorizer = TfidfVectorizer(analyzer='char', ngram_range=(2, 3), random_state=42) if SKLEARN_AVAILABLE else None
        self.skill_normalization = SKILL_NORMALIZATION
        self.skill_canonical = SKILL_CANONICAL

    def preprocess_text(self, text: str) -> str:
        """Preprocess text for analysis"""
        text = text.lower()
        text = re.sub(r'[^\w\s+#-]', ' ', text)
        text = re.sub(r'\s+', ' ', text)
        return text.strip()

    def normalize_skill(self, skill: str) -> str:
        """Normalize skill to canonical form for better matching"""
        skill_lower = skill.lower().strip()
        # Check if exists in canonical map
        if skill_lower in self.skill_canonical:
            return self.skill_canonical[skill_lower]
        return skill_lower

    def extract_skills_with_confidence(self, text: str) -> List[Tuple[str, float]]:
        """Extract skills with confidence scores based on context"""
        processed_text = self.preprocess_text(text)
        skills_with_confidence = []
        
        # Context clues that increase confidence (STRICTER REQUIREMENTS)
        positive_signals = [
            'experience in', 'experience with', 'proficiency in', 'expertise in', 'skilled in',
            'expert in', 'advanced', 'fluent in', 'proficient in', 
            'worked with', 'used', 'built', 'developed', 'implemented', 'created',
            'responsible for', 'role: ', 'position:', 'tech stack', 'technologies:',
            'certification', 'certified', 'badge', 'competency',
            'core skill', 'key skill', 'primary skill', 'required skill',
            'years of', 'year of', 'project', 'application', 'system'
        ]
        
        for category, skills in self.technical_skills.items():
            for skill in skills:
                pattern = r'\b' + re.escape(skill) + r'\b'
                matches = list(re.finditer(pattern, processed_text))
                
                if matches:
                    for match in matches:
                        # Get context around match (200 chars before and after for better analysis)
                        start = max(0, match.start() - 200)
                        end = min(len(processed_text), match.end() + 200)
                        context = processed_text[start:end]
                        
                        # Calculate confidence based on context signals (STRICTER BASELINE)
                        confidence = 0.40  # Lower base confidence (was 0.60)
                        
                        # Count positive signals in context
                        signal_count = sum(1 for signal in positive_signals if signal in context)
                        confidence += (signal_count * 0.08)  # Each signal adds 8% (was 6%)
                        
                        # REQUIRE at least one positive signal for technical skills
                        if signal_count == 0 and category in ['programming', 'modern_frameworks', 'backend_frameworks', 'databases', 'cloud_platforms']:
                            confidence = 0.30  # Very low confidence without context, 'function', 'class'],
                            'modern_frameworks': ['component', 'ui', 'frontend', 'build', 'render', 'hooks', 'state', 'props'],
                            'backend_frameworks': ['server', 'backend', 'api', 'database', 'route', 'endpoint', 'middleware'],
                            'databases': ['database', 'table', 'query', 'orm', 'schema', 'data model', 'migration', 'index'],
                            'cloud_platforms': ['cloud', 'deployment', 'infrastructure', 'instance', 'scaling', 'container', 'service'],
                            'devops_cloud': ['ci/cd', 'pipeline', 'automation', 'container', 'orchestration', 'deploy', 'build'],
                        }
                        
                        if category in category_keywords:
                            category_boost_count = sum(1 for kw in category_keywords[category] if kw in context)
                            confidence += (category_boost_count * 0.05)  # Each category keyword adds 5%
                        
                        # Penalty for skill mentioned in generic lists without context
                        generic_list_indicators = ['skills:', 'technologies:', 'tools:', 'languages:']
                        in_generic_list = any(indicator in context[:100] for indicator in generic_list_indicators)
                        if in_generic_list and signal_count == 0:
                            confidence *= 0.70  # 30% penalty for being in generic list without evidence
                        
                        confidence = min(1.0, confidence)  # Cap at 100%
                        
                        # STRICTER THRESHOLD: Only skills with 60%+ confidence (was 55%)
                        if confidence >= 0.60:
                        
                        confidence = min(1.0, confidence)  # Cap at 100%
                        
                        if confidence >= 0.55:  # Only skills with 55%+ confidence
                            skill_name = skill.replace('.', ' ').title()
                            skills_with_confidence.append((skill_name, confidence))
        
        return skills_with_confidence

    def extract_skills(self, text: str) -> List[str]:
        """Extract skills from resume text - updated to use confidence scoring"""
        skills_with_confidence = self.extract_skills_with_confidence(text)
        # Return only skill names (confidence filtering already done)
        return sorted(list(set([skill for skill, _ in skills_with_confidence])))


    def extract_experience_level(self, text: str) -> str:
        """Extract and calculate experience level from resume with year extraction"""
        processed_text = self.preprocess_text(text)
        
        # Extract numeric years mentioned in resume
        year_pattern = r'(\d{1,2})\s*\+?\s*years?'
        years_found = []
        
        for match in re.finditer(year_pattern, text, re.IGNORECASE):
            try:
                years = int(match.group(1))
                years_found.append(years)
            except:
                pass
        
        # Determine experience level from extracted years
        if years_found:
            avg_years = sum(years_found) / len(years_found)
            max_years = max(years_found)
            
            if max_years >= 10:
                return f'Senior ({max_years}+ years)'
            elif max_years >= 5:
                return f'Mid-level ({max_years}-{max_years+2} years)'
            elif max_years >= 2:
                return f'Junior-Mid ({max_years}-3 years)'
            else:
                return f'Junior ({max_years}-2 years)'
        
        # Fallback to keyword matching if no explicit years found
        senior_keywords = ['senior', 'lead', 'principal', 'staff', 'architect', 'director', 'manager']
        mid_keywords = ['mid-level', 'mid level', 'intermediate']
        junior_keywords = ['junior', 'entry', 'graduate', 'intern', 'fresher', 'entry-level']

        senior_count = sum(1 for kw in senior_keywords if kw in processed_text)
        mid_count = sum(1 for kw in mid_keywords if kw in processed_text)
        junior_count = sum(1 for kw in junior_keywords if kw in processed_text)

        if senior_count > mid_count and senior_count > junior_count:
            return 'Senior (8+ years estimated)'
        elif mid_count > junior_count:
            return 'Mid-level (4-7 years estimated)'
        elif junior_count > 0:
            return 'Junior (0-3 years)'
        else:
            return 'Experience level not clearly specified'

    def extract_jd_skills(self, job_description: str) -> List[str]:
        """Extract required skills from job description"""
        return self.extract_skills(job_description)

    def extract_resume_name(self, resume_text: str) -> str:
        """
        Intelligently extract the candidate's name from resume header.
        Names typically appear in the first 3-5 lines, are standalone, and follow name patterns.
        """
        if not resume_text or len(resume_text.strip()) < 5:
            return ""
        
        lines = resume_text.split('\n')
        
        # Check first 8 lines for the name (typically in header)
        for i, line in enumerate(lines[:8]):
            line = line.strip()
            
            # Skip if line is too short or too long
            if not line or len(line) < 2 or len(line) > 80:
                continue
            
            # Skip lines with common non-name patterns
            if any(skip in line.lower() for skip in [
                '@', 'http', '.com', 'phone', 'email', 'mobile', 'address', 
                'linkedin', 'github', 'portfolio', '+1', '(', 'pdf', 'resume',
                'cv', 'year', 'date', '202', '19', '|', '—', '+'
            ]):
                continue
            
            # Skip if line starts with numbers or special chars
            if re.match(r'^[\d\s\W]', line):
                continue
            
            # Check if line matches name pattern: letters, spaces, hyphens, apostrophes only
            if re.match(r'^[A-Za-z\s\-\'\/.]*$', line):
                words = [w for w in line.split() if len(w) > 1 and re.match(r'^[A-Za-z\-\']+$', w)]
                
                # Valid names typically have 1-4 words
                if 1 <= len(words) <= 4:
                    # Additional check: at least one word should be more than 2 chars
                    if any(len(w) > 2 for w in words):
                        name = ' '.join(words)
                        # Extra validation: reject all-caps names like "RESUME" or "OBJECTIVE"
                        if name.upper() not in ['SUMMARY', 'OBJECTIVE', 'SKILLS', 'EDUCATION', 'EXPERIENCE', 'CERTIFICATIONS', 'RESUME', 'CV']:
                            return name
        
        return ""

    def normalize_name_for_comparison(self, name: str) -> tuple:
        """
        Normalize name and return both full normalized and parts for strict matching.
        Returns (normalized_full, parts_list)
        """
        if not name:
            return "", []
        
        # Remove leading/trailing whitespace
        name = name.strip()
        # Convert to lowercase
        name = name.lower()
        # Remove common suffixes
        name = re.sub(r'\s*(jr|sr|ii|iii|iv|v|phd|mba|esq)$', '', name)
        # Remove accents/diacritics
        name = re.sub(r'[\.\']', '', name)
        # Normalize multiple spaces
        name = re.sub(r'\s+', ' ', name)
        
        parts = [p.strip() for p in name.split() if p.strip()]
        return name, parts

    def check_candidate_name_match(self, candidate_name: str, resume_text: str) -> Tuple[bool, str]:
        """
        Strict validation: Extract name from resume and ensure it clearly matches.
        This is the primary quality gate - mismatched names indicate wrong resume uploaded.
        """
        if not candidate_name or not resume_text or len(resume_text.strip()) < 20:
            return False, "Resume content is insufficient or name is missing"

        # Extract the actual name from resume header
        extracted_name = self.extract_resume_name(resume_text)
        
        if not extracted_name or len(extracted_name.strip()) < 2:
            return False, "Could not identify a valid name in resume header. Ensure name appears in first few lines."

        # Normalize both names for comparison
        normalized_entered, entered_parts = self.normalize_name_for_comparison(candidate_name)
        normalized_extracted, extracted_parts = self.normalize_name_for_comparison(extracted_name)

        # STRICT VALIDATION LEVEL 1: Exact name match
        if normalized_entered == normalized_extracted:
            return True, ""
        
        # STRICT VALIDATION LEVEL 2: First + Last name must match (for multi-word names)
        if len(entered_parts) >= 2 and len(extracted_parts) >= 2:
            # First name and last name must match
            if entered_parts[0] == extracted_parts[0] and entered_parts[-1] == extracted_parts[-1]:
                return True, ""
            
            # Middle names can be different, but first and last must match
            if entered_parts[0] == extracted_parts[0]:
                # First names match but last names differ - REJECT
                if entered_parts[-1] != extracted_parts[-1]:
                    return False, f"Name mismatch: Entered '{candidate_name}' but resume shows '{extracted_name}'. Last names must match."
        
        # STRICT VALIDATION LEVEL 3: If entered name is single word, extracted must contain it as first or last
        if len(entered_parts) == 1 and len(extracted_parts) >= 1:
            single_name = entered_parts[0]
            # Must be first or last name in extracted
            if single_name not in [extracted_parts[0], extracted_parts[-1]]:
                return False, f"Name mismatch: '{candidate_name}' not found in resume name '{extracted_name}'"
        
        # REJECT: Names don't match sufficiently
        return False, f"Name mismatch: Entered '{candidate_name}' but resume shows '{extracted_name}'. Names must match clearly."

    def calculate_skill_match(self, resume_skills: List[str], jd_skills: List[str]) -> Tuple[List[str], List[str], float]:
        """Calculate skill match with weighted scoring and exact matching"""
        resume_skills_lower = [s.lower() for s in resume_skills]
        jd_skills_lower = [s.lower() for s in jd_skills]

        resume_skills_norm = {self.normalize_skill(s) for s in resume_skills_lower}

        matched = []
        missing = []

        # Define skill importance weights (critical, important, nice-to-have)
        critical_keywords = {'python', 'java', 'javascript', 'go', 'rust', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes'}
        important_keywords = {'typescript', 'django', 'fastapi', 'mongodb', 'redis', 'gcp', 'azure', 'git', 'api', 'rest'}

        matched_score = 0
        total_score = 0

        for jd_skill in jd_skills:
            jd_skill_lower = jd_skill.lower()
            jd_skill_norm = self.normalize_skill(jd_skill_lower)

            # Determine skill weight
            weight = 1.0  # Default weight
            if any(keyword in jd_skill_lower for keyword in critical_keywords):
                weight = 1.5  # 50% bonus for critical skills
            elif any(keyword in jd_skill_lower for keyword in important_keywords):
                weight = 1.2  # 20% bonus for important skills

            total_score += weight

            # Exact match only (normalized)
            if jd_skill_norm in resume_skills_norm:
                matched.append(jd_skill)
                matched_score += weight
            else:
                missing.append(jd_skill)

        # Weighted match score - round to 1 decimal for deterministic results
        if total_score == 0:
            match_score = 100.0
        else:
            match_score = round((matched_score / total_score) * 100, 1)

        match_score = round(min(100, max(0, match_score)), 1)

        return matched, missing, match_score
    
    def skill_similarity_match(self, jd_skill: str, resume_skills: List[str]) -> bool:
        """Check if skill has similar/related match in resume skills"""
        # Similarity rules for common skill variations
        similarity_map = {
            'nodejs': ['node', 'node.js', 'nodejs'],
            'node.js': ['node', 'node.js', 'nodejs'],
            'node': ['node.js', 'nodejs'],
            'typescript': ['ts', 'tsx', 'typescript'],
            'javascript': ['js', 'javascript'],
            'python': ['python', 'py'],
            'csharp': ['c#', 'csharp', 'c sharp'],
            'cpp': ['c++', 'cpp'],
            'sql': ['mysql', 'postgresql', 'sql server', 'sqlite'],
            'rest': ['restful', 'rest api'],
            'docker': ['docker', 'containerization'],
            'kubernetes': ['k8s', 'kubernetes'],
            'git': ['github', 'gitlab', 'git', 'bitbucket'],
            'angular': ['angularjs', 'angular'],
            'react': ['react', 'reactjs'],
            'vue': ['vue', 'vue.js', 'vuejs'],
        }
        
        # Check against similarity map
        for similar_skills in similarity_map.values():
            if jd_skill in similar_skills:
                for similar_skill in similar_skills:
                    if similar_skill in resume_skills:
                        return True
        
        # Fuzzy matching - check if skill is contained or contains
        for resume_skill in resume_skills:
            if len(jd_skill) > 3 and jd_skill in resume_skill[:len(jd_skill) + 5]:
                return True
            if len(resume_skill) > 3 and resume_skill in jd_skill[:len(resume_skill) + 5]:
                return True
        
        return False

        return matched, missing, match_score

    def calculate_semantic_similarity(self, text1: str, text2: str) -> float:
        """Calculate semantic similarity between texts using TF-IDF with improved weighting"""
        if not text1 or not text2:
            return 0.0
            
        if not SKLEARN_AVAILABLE or self.vectorizer is None:
            # Fallback: advanced word overlap with keyword weighting
            words1 = self.preprocess_text(text1).split()
            words2 = self.preprocess_text(text2).split()
            
            if len(words1) == 0 or len(words2) == 0:
                return 0.0
            
            # Weight longer words more heavily (they're more meaningful)
            set1 = set()
            set2 = set()
            
            for word in words1:
                weight = max(1, len(word) / 10)  # Longer words = higher weight
                for _ in range(int(weight)):
                    set1.add(word)
            
            for word in words2:
                weight = max(1, len(word) / 10)
                for _ in range(int(weight)):
                    set2.add(word)
            
            intersection = len(set1.intersection(set2))
            union = len(set1.union(set2))
            return (intersection / union) * 100 if union > 0 else 0.0

        try:
            tfidf_matrix = self.vectorizer.fit_transform([text1, text2])
            similarity = cosine_similarity(tfidf_matrix[0:1], tfidf_matrix[1:2])[0][0]
            similarity_percent = float(similarity * 100)
            
            # Round to 1 decimal place to eliminate floating-point precision artifacts
            similarity_percent = round(similarity_percent, 1)
            
            # Boost similarity slightly for relevant matches (prevent underscoring)
            if similarity_percent > 15:  # Some meaningful overlap
                similarity_percent = round(similarity_percent * 1.1, 1)  # 10% boost for alignment
            
            return max(0, min(100, similarity_percent))
        except:
            return 0.0

    def is_resume_relevant(self, job_title: str, resume_text: str, resume_skills: List[str], job_description: str = "") -> Tuple[bool, str]:
        """
        Check if resume is relevant to the job title.
        Returns (is_relevant, reason)
        """
        job_title_lower = job_title.lower().strip()
        resume_lower = resume_text.lower()

        # Build analysis text from job description or known title requirements
        if job_description and job_description.strip():
            analysis_text = job_description
        else:
            if job_title_lower in JOB_TITLE_REQUIREMENTS:
                analysis_text = JOB_TITLE_REQUIREMENTS[job_title_lower]
            else:
                matched_key = None
                for key in JOB_TITLE_REQUIREMENTS.keys():
                    if key in job_title_lower or job_title_lower in key:
                        matched_key = key
                        break
                analysis_text = JOB_TITLE_REQUIREMENTS[matched_key] if matched_key else job_title

        jd_skills = self.extract_jd_skills(analysis_text)
        resume_skills_lower = {s.lower() for s in resume_skills}
        jd_skills_lower = [s.lower() for s in jd_skills]
        matched_jd_skills = [s for s in jd_skills_lower if s in resume_skills_lower]

        # Require minimal alignment with job requirements when skills are known
        skill_alignment_ok = False
        if len(jd_skills_lower) >= 4:
            skill_alignment_ok = len(matched_jd_skills) >= 2
        elif 1 <= len(jd_skills_lower) <= 3:
            skill_alignment_ok = len(matched_jd_skills) >= 1

        if len(jd_skills_lower) > 0 and not skill_alignment_ok:
            return False, f"Resume lacks required skills for {job_title}"
        
        # Define job categories and their key indicators
        job_categories = {
            'technical': {
                'keywords': ['engineer', 'developer', 'programmer', 'software', 'devops', 'data scientist', 'machine learning'],
                'required_indicators': ['programming', 'technical', 'software', 'code', 'development', 'computer', 'technology', 'systems', 'python', 'java', 'javascript']
            },
            'design': {
                'keywords': ['designer', 'ui', 'ux', 'graphic', 'creative'],
                'required_indicators': ['design', 'creative', 'visual', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'wireframe', 'prototype']
            },
            'management': {
                'keywords': ['manager', 'director', 'lead', 'head'],
                'required_indicators': ['management', 'leadership', 'team', 'project', 'strategy', 'planning', 'operations']
            },
            'marketing': {
                'keywords': ['marketing', 'seo', 'social media', 'content'],
                'required_indicators': ['marketing', 'campaign', 'social', 'content', 'digital', 'analytics', 'brand']
            },
            'sales': {
                'keywords': ['sales', 'account executive', 'business development'],
                'required_indicators': ['sales', 'revenue', 'client', 'customer', 'deal', 'negotiation', 'pipeline', 'crm']
            },
            'finance': {
                'keywords': ['analyst', 'accountant', 'finance', 'financial'],
                'required_indicators': ['financial', 'accounting', 'excel', 'budget', 'analysis', 'reporting', 'audit']
            },
            'hr': {
                'keywords': ['hr', 'recruiter', 'human resources'],
                'required_indicators': ['recruitment', 'hiring', 'hr', 'employee', 'talent', 'interviewing', 'onboarding']
            }
        }
        
        # Determine job category
        detected_category = None
        for category, config in job_categories.items():
            if any(kw in job_title_lower for kw in config['keywords']):
                detected_category = category
                break
        
        # If no specific category detected, be more lenient
        if not detected_category:
            # Check if resume has at least some professional content
            professional_indicators = ['experience', 'skills', 'education', 'work', 'project', 'responsibility']
            has_professional_content = sum(1 for indicator in professional_indicators if indicator in resume_lower) >= 2
            
            if not has_professional_content:
                return False, "Resume does not contain recognizable professional content"
            
            # If resume has minimal skills, it's likely irrelevant
            if len(resume_skills) < 2:
                return False, "Resume lacks relevant professional skills"
            
            return True, ""
        
        # Check for category-specific indicators
        required_indicators = job_categories[detected_category]['required_indicators']
        matching_indicators = sum(1 for indicator in required_indicators if indicator in resume_lower)

        # Resume must match at least 2 indicators for the job category when skills do not already align
        if matching_indicators < 2 and not skill_alignment_ok:
            return False, f"Resume does not match the requirements for {job_title}. This appears to be a resume from a different field."
        
        # Check if resume has completely opposite field indicators
        if detected_category == 'technical':
            non_tech_only_indicators = ['retail', 'cashier', 'waiter', 'waitress', 'driver', 'delivery', 'warehouse', 'cleaning', 'security guard']
            if any(indicator in resume_lower for indicator in non_tech_only_indicators) and matching_indicators < 3:
                return False, f"Resume appears to be from a non-technical background, not suitable for {job_title}"
        
        # If resume has very few or no relevant skills
        if len(resume_skills) < 2 and matching_indicators < 3:
            return False, f"Resume lacks relevant skills and experience for {job_title}"
        
        return True, ""

    def apply_accuracy_validation_gates(self, analysis: Dict) -> Dict:
        """Apply multi-level validation gates to reduce false positives/negatives"""
        matched_skills = analysis.get('matched_skills', [])
        missing_skills = analysis.get('missing_skills', [])
        experience = analysis.get('experience', '')
        score = analysis.get('score', 0)
        resume_text = analysis.get('resume_text', '')
        
        failed_gates = []
        passed_count = 0
        
        # Gate 1: Skill credibility - catches inflated skill claims
        skill_ratio = len(matched_skills) / max(len(matched_skills) + len(missing_skills), 1)
        experience_level = 'senior' if 'senior' in experience.lower() else 'junior' if 'junior' in experience.lower() else 'mid'
        
        # Junior candidates claiming 30+ skills is suspicious
        if experience_level == 'junior' and len(matched_skills) > 25:
            failed_gates.append("⚠️ Skill Credibility: Claims too many skills for experience level")
        else:
            passed_count += 1
        
        # Gate 2: Experience consistency - ensures experience makes sense
        years_match = re.search(r'(\d+)\+?\s*years?', experience, re.I)
        if years_match:
            years = int(years_match.group(1))
            # 20+ years experience but no senior keywords = suspicious
            if years >= 10 and 'senior' not in experience.lower() and 'lead' not in experience.lower():
                failed_gates.append("⚠️ Experience Consistency: Years claimed don't match experience level")
            else:
                passed_count += 1
        else:
            passed_count += 1
        
        # Gate 3: Job relevance - missing critical skills
        if skill_ratio < 0.20 and score < 40:
            failed_gates.append("⚠️ Job Relevance: Very limited skill alignment with position")
        else:
            passed_count += 1
        
        # Gate 4: Content quality - resume has actual content
        if len(resume_text.strip()) < 200:
            failed_gates.append("⚠️ Content Quality: Resume content is too minimal")
        else:
            passed_count += 1
        
        # Gate 5: Professional indicators
        professional_indicators = ['experience', 'skills', 'education', 'project', 'responsibility', 'achievement']
        has_indicators = sum(1 for ind in professional_indicators if ind in resume_text.lower())
        if has_indicators < 2:
            failed_gates.append("⚠️ Professional Content: Resume lacks standard professional sections")
        else:
            passed_count += 1
        
        return {
            'passed': passed_count >= 3,  # Must pass at least 3 of 5 gates
            'gates_passed': passed_count,
            'gates_total': 5,
            'failed_gates': failed_gates,
            'reliability_score': (passed_count / 5) * 100
        }

    def generate_detailed_explanation(self, analysis: Dict) -> Dict:
        """Generate comprehensive explanation of the match decision"""
        score = analysis.get('score', 0)
        classification = analysis.get('classification', '')
        matched_skills = analysis.get('matched_skills', [])
        missing_skills = analysis.get('missing_skills', [])
        experience = analysis.get('experience', '')
        candidate_name = analysis.get('candidate_name', 'Candidate')
        job_title = analysis.get('job_title', 'Position')
        
        explanation = {
            'summary': f"Score: {score}% - {classification}",
            'key_reasons': [],
            'strengths': [],
            'weaknesses': [],
            'interview_questions': [],
            'recommendation': ''
        }
        
        # Calculate skill coverage percentage
        total_skills = len(matched_skills) + len(missing_skills)
        skill_coverage = (len(matched_skills) / total_skills * 100) if total_skills > 0 else 0
        
        # === KEY REASONS ===
        if score >= 85:
            explanation['key_reasons'].append(
                f"✅ Excellent skill match: {len(matched_skills)}/{total_skills} required skills "
                f"({int(skill_coverage)}%)"
            )
            explanation['key_reasons'].append(f"✅ Strong experience alignment: {experience}")
        elif score >= 70:
            explanation['key_reasons'].append(
                f"✅ Strong skill match: {len(matched_skills)}/{total_skills} required skills"
            )
            explanation['key_reasons'].append(f"✅ Good experience: {experience}")
        elif score >= 50:
            explanation['key_reasons'].append(
                f"⚠️  Partial skill match: {len(matched_skills)}/{total_skills} skills matched"
            )
            critical_gaps = missing_skills[:3]
            if critical_gaps:
                explanation['key_reasons'].append(
                    f"⚠️  Missing key skills: {', '.join(critical_gaps)}"
                )
        else:
            explanation['key_reasons'].append(
                f"❌ Low skill alignment: only {len(matched_skills)}/{total_skills} skills match"
            )
            explanation['key_reasons'].append(
                f"❌ Significant gaps: {len(missing_skills)} required skills missing"
            )
        
        # === STRENGTHS ===
        if matched_skills:
            top_skills = matched_skills[:5]
            explanation['strengths'].append(
                f"Demonstrates proficiency in: {', '.join(top_skills)}"
            )
        
        if 'strong' in experience.lower() or 'senior' in experience.lower() or '8+' in experience:
            explanation['strengths'].append(f"Solid background: {experience}")
        
        if len(matched_skills) >= len(missing_skills) and len(matched_skills) > 0:
            explanation['strengths'].append(
                f"More matched skills ({len(matched_skills)}) than gaps ({len(missing_skills)})"
            )
        
        # === WEAKNESSES ===
        if missing_skills:
            critical_missing = missing_skills[:3]
            explanation['weaknesses'].append(
                f"Missing critical skills: {', '.join(critical_missing)}"
            )
            if len(missing_skills) > 3:
                explanation['weaknesses'].append(
                    f"Additional gaps: {len(missing_skills)-3} other required skills not listed"
                )
        
        if score < 60:
            explanation['weaknesses'].append("Significant skill gaps would require substantial training")
        
        if score < 50:
            explanation['weaknesses'].append("Limited alignment with core position requirements")
        
        # === INTERVIEW QUESTIONS ===
        if score >= 70:
            explanation['interview_questions'].append(
                f"Tell us about your experience with {matched_skills[0] if matched_skills else 'your key skills'}"
            )
            if missing_skills:
                explanation['interview_questions'].append(
                    f"How quickly do you learn new technologies like {missing_skills[0]}?"
                )
            explanation['interview_questions'].append("What's your most significant project accomplishment?")
        elif 50 <= score < 70:
            if missing_skills:
                explanation['interview_questions'].append(
                    f"We noticed you don't have {missing_skills[0]} experience. Are you open to learning it?"
                )
            explanation['interview_questions'].append("Describe a time you had to learn a new skill quickly")
            explanation['interview_questions'].append("What attracts you to this role?")
        else:
            explanation['interview_questions'].append(
                "What relevant experience do you have for this specific position?"
            )
            if missing_skills:
                explanation['interview_questions'].append(
                    f"We require {missing_skills[0] if missing_skills else 'specific skills'}. Do you have any background in this?"
                )
        
        # === RECOMMENDATION ===
        if score >= 85:
            explanation['recommendation'] = (
                f"🏆 STRONGLY RECOMMEND: {candidate_name} is an exceptional match. "
                f"Proceed with fast-track interview. High probability of successful hire."
            )
        elif score >= 75:
            explanation['recommendation'] = (
                f"✅ RECOMMEND: {candidate_name} is a strong candidate. "
                f"Suitable for standard interview process. Good probability of success."
            )
        elif score >= 60:
            explanation['recommendation'] = (
                f"→ CONSIDER: {candidate_name} has foundational skills and potential. "
                f"Interview recommended with focus on learning capability and training needs."
            )
        elif score >= 45:
            explanation['recommendation'] = (
                f"⚠️  CAREFUL CONSIDERATION: {candidate_name} has some relevant skills but notable gaps. "
                f"Only proceed if role includes training budget and mentorship. Use interview to assess attitude toward learning."
            )
        else:
            explanation['recommendation'] = (
                f"❌ NOT RECOMMENDED: {candidate_name} has limited alignment with {job_title}. "
                f"Recommend seeking candidates with stronger skill match. Consider for different roles if available."
            )
        
        return explanation

    def analyze_resume(self, job_title: str, job_description: str, resume_text: str, candidate_name: str) -> Dict[str, Any]:
        """Comprehensive resume analysis"""

        # First, extract basic information
        resume_skills = self.extract_skills(resume_text)

        # If candidate_name is not provided, extract it from the resume
        if not candidate_name:
            candidate_name = self.extract_resume_name(resume_text) or "Candidate"

        # CHECK: Validate candidate name matches resume content
        name_match, name_reason = self.check_candidate_name_match(candidate_name, resume_text)
        if not name_match:
            return {
                'score': 0,
                'classification': 'Invalid - Not Relevant',
                'matched_skills': [],
                'missing_skills': [],
                'experience_match': 'Not Applicable',
                'skills_match': '0%',
                'qualifications_match': '0%',
                'overall_fit': '0%',
                'summary': f"❌ Invalid Resume: {name_reason}",
                'candidate_name': candidate_name,
                'job_title': job_title,
                'is_valid': False,
                'rejection_reason': name_reason
            }
        
        # CHECK: Validate if resume is relevant to the job title
        is_relevant, rejection_reason = self.is_resume_relevant(job_title, resume_text, resume_skills, job_description)
        
        if not is_relevant:
            return {
                'score': 0,
                'classification': 'Invalid - Not Relevant',
                'matched_skills': [],
                'missing_skills': [],
                'experience_match': 'Not Applicable',
                'skills_match': '0%',
                'qualifications_match': '0%',
                'overall_fit': '0%',
                'summary': f"❌ Invalid Resume: {rejection_reason}",
                'candidate_name': candidate_name,
                'job_title': job_title,
                'is_valid': False,
                'rejection_reason': rejection_reason
            }

        # If no job description provided, use predefined requirements for the job title
        if not job_description or not job_description.strip():
            # Normalize job title to match our database
            job_title_normalized = job_title.lower().strip()
            
            # Try to find exact match or partial match in our job title database
            if job_title_normalized in JOB_TITLE_REQUIREMENTS:
                analysis_text = JOB_TITLE_REQUIREMENTS[job_title_normalized]
            else:
                # Try partial matching (e.g., "junior software engineer" matches "software engineer")
                matched_key = None
                for key in JOB_TITLE_REQUIREMENTS.keys():
                    if key in job_title_normalized or job_title_normalized in key:
                        matched_key = key
                        break
                
                if matched_key:
                    analysis_text = JOB_TITLE_REQUIREMENTS[matched_key]
                else:
                    # Fallback to job title itself
                    analysis_text = job_title
        else:
            analysis_text = job_description

        # Extract required skills from job
        jd_skills = self.extract_jd_skills(analysis_text)

        # Calculate skill match
        matched_skills, missing_skills, skills_match = self.calculate_skill_match(resume_skills, jd_skills)

        # Extract experience level
        experience_level = self.extract_experience_level(resume_text)
        
        # Calculate experience match score (0-40 points max)
        experience_score = 0
        if 'senior' in experience_level.lower() or '8+' in experience_level or '10+' in experience_level:
            experience_score = 40  # Senior: full points
        elif 'mid' in experience_level.lower() or ('5' in experience_level and 'years' in experience_level):
            experience_score = 28  # Mid-level: 70% of points
        elif 'junior' in experience_level.lower() or '3' in experience_level:
            experience_score = 18  # Junior: 45% of points
        else:
            experience_score = 10  # Unknown: minimal points

        # Calculate semantic similarity (content matching)
        content_match = self.calculate_semantic_similarity(analysis_text, resume_text)
        
        # Calculate coverage ratio (matched skills / total required skills)
        if len(jd_skills) > 0:
            coverage_ratio = len(matched_skills) / len(jd_skills)
        else:
            coverage_ratio = 1.0
        
        # ===== IMPROVED SCORING FORMULA (STRICT AND REALISTIC) =====
        # Total: 100 points distributed as:
        # - Skills Match: 75 points (most critical - increased weight)
        # - Experience Level: 25 points (supporting factor)

        # Round to 1 decimal to eliminate floating-point artifacts
        skills_match = round(skills_match, 1)
        content_match = round(content_match, 1)

        skills_score = round(min(75, (skills_match / 100.0) * 75), 1)  # Convert 0-100 to 0-75
        experience_matched = round(min(25, (experience_score / 40.0) * 25), 1)  # Convert 0-40 to 0-25

        overall_score = skills_score + experience_matched
        overall_score = round(min(100, max(0, overall_score)), 1)

        # ===== PENALTY FOR MISSING CRITICAL SKILLS =====
        critical_skill_keywords = {'python', 'java', 'javascript', 'typescript', 'react', 'node', 'sql', 'aws', 'docker', 'kubernetes'}
        missing_critical_count = sum(1 for skill in missing_skills if any(crit in skill.lower() for crit in critical_skill_keywords))
        
        if missing_critical_count >= 3:
            overall_score = round(overall_score * 0.75, 1)  # 25% penalty for missing 3+ critical skills
        elif missing_critical_count == 2:
            overall_score = round(overall_score * 0.85, 1)  # 15% penalty for missing 2 critical skills
        elif missing_critical_count == 1:
            overall_score = round(overall_score * 0.92, 1)  # 8% penalty for missing 1 critical skill

        # ===== PENALTY FOR LOW SKILL COVERAGE =====
        if len(jd_skills) > 0:
            skill_coverage_ratio = len(matched_skills) / len(jd_skills)
            if skill_coverage_ratio < 0.30:  # Less than 30% skills matched
                overall_score = round(overall_score * 0.70, 1)  # 30% penalty for very low coverage
            elif skill_coverage_ratio < 0.50:  # Less than 50% skills matched
                overall_score = round(overall_score * 0.85, 1)  # 15% penalty for low coverage

        overall_score = round(max(0, min(100, overall_score)), 1)

        # ===== STRICTER CLASSIFICATION THRESHOLDS (MORE REALISTIC) =====
        exact_skill_match = len(jd_skills) > 0 and len(missing_skills) == 0
        
        if exact_skill_match and overall_score >= 90:
            classification = 'Highly Suitable'
            recommendation = f"{candidate_name} is an EXCEPTIONAL match with 100% skill alignment. Highly recommended for immediate interview."
        elif overall_score >= 75 and len(matched_skills) >= len(jd_skills) * 0.75:
            classification = 'Suitable'
            recommendation = f"{candidate_name} is a STRONG candidate with {len(matched_skills)}/{len(jd_skills)} required skills. Solid experience alignment. Recommended for interview."
        elif overall_score >= 55 and len(matched_skills) >= len(jd_skills) * 0.50:
            classification = 'Partially Suitable'
            recommendation = f"{candidate_name} shows POTENTIAL with {len(matched_skills)}/{len(jd_skills)} matched skills. Has gaps in: {', '.join(missing_skills[:3])}. Consider if trainable."
        else:
            classification = 'Not Suitable'
            recommendation = f"{candidate_name} has LIMITED alignment ({len(matched_skills)}/{len(jd_skills)} skills). Missing critical requirements. Better suited for other roles."

        # ===== ACCURACY VALIDATION GATES (to reduce false positives/negatives) =====
        validation_gates = self.apply_accuracy_validation_gates({
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'experience': experience_level,
            'score': overall_score,
            'resume_text': resume_text
        })

        # If validation failed at critical gates, reduce score significantly
        if not validation_gates['passed']:
            overall_score = round(max(0, overall_score - 25), 1)  # Reduce by 25 points if validation fails
            critical_gate_failed = validation_gates['failed_gates'][0] if validation_gates['failed_gates'] else 'unknown'
            recommendation = f"⚠️  ACCURACY WARNING: {critical_gate_failed}. {recommendation}"

        # ===== GENERATE DETAILED EXPLANATION =====
        detailed_explanation = self.generate_detailed_explanation({
            'score': int(round(overall_score)),
            'classification': classification,
            'matched_skills': matched_skills,
            'missing_skills': missing_skills,
            'experience': experience_level,
            'candidate_name': candidate_name,
            'job_title': job_title
        })

        return {
            'score': int(round(overall_score)),
            'classification': classification,
            'matched_skills': matched_skills[:20],  # Top 20 matched skills
            'missing_skills': missing_skills[:12],  # Top 12 missing skills
            'experience_match': experience_level,
            'skills_match': f"{int(round(skills_match))}%",
            'qualifications_match': f"{int(round(content_match))}%",
            'overall_fit': f"{int(round(overall_score))}%",
            'summary': recommendation,
            'candidate_name': candidate_name,
            'job_title': job_title,
            'is_valid': True,
            # ===== NEW ACCURACY ENHANCEMENTS =====
            'detailed_explanation': {
                'key_reasons': detailed_explanation['key_reasons'],
                'strengths': detailed_explanation['strengths'],
                'weaknesses': detailed_explanation['weaknesses'],
                'interview_questions': detailed_explanation['interview_questions'],
                'recommendation': detailed_explanation['recommendation']
            },
            'validation': {
                'gates_passed': validation_gates['gates_passed'],
                'gates_total': validation_gates['gates_total'],
                'reliability_score': f"{validation_gates['reliability_score']:.1f}%",
                'warnings': validation_gates['failed_gates']
            },
            'accuracy_metrics': {
                'skill_coverage': f"{int((len(matched_skills) / max(len(matched_skills) + len(missing_skills), 1)) * 100)}%",
                'matched_skills_count': len(matched_skills),
                'missing_skills_count': len(missing_skills),
                'total_required_skills': len(jd_skills),
                'experience_alignment': 'Exceeds' if experience_score >= 35 else 'Meets' if experience_score >= 25 else 'Below',
                'exact_skill_match': exact_skill_match
            }
        }


def main():
    """Main entry point - OpenAI-only scorer."""
    try:
        # Read input from stdin
        input_data = json.load(sys.stdin)

        job_title = input_data.get('job_title', '')
        job_description = input_data.get('job_description', '')
        resume_text = input_data.get('resume_text', '')
        candidate_name = input_data.get('candidate_name', 'Candidate')

        # Validate inputs
        if not resume_text:
            raise ValueError('Resume text is required')
        
        # Job description is optional - will use job title as fallback if empty

        if not OPENAI_INTEGRATION_AVAILABLE or not OpenAIAnalyzer:
            raise ValueError('OpenAI integration module is unavailable')

        openai_analyzer = OpenAIAnalyzer()
        if not openai_analyzer.is_enabled():
            raise ValueError('OpenAI is not configured. Set OPENAI_API_KEY to run scoring')

        print("→ Using OpenAI GPT scorer...", file=sys.stderr)
        result = openai_analyzer.score_resume_with_gpt(
            job_title=job_title,
            job_description=job_description,
            resume_text=resume_text,
            candidate_name=candidate_name
        )
        used_engine = 'openai_gpt'
        print(f"✓ OpenAI GPT scoring completed ({used_engine})", file=sys.stderr)

        # Add metadata about which engine was used
        result['scoring_engine'] = used_engine
        result['engine_details'] = {
            'primary': 'OpenAI GPT (semantic understanding, structured scoring)',
            'fallback': 'Handled by backend service if Python scoring is unavailable',
            'used': used_engine
        }

        # Output result as JSON
        print(json.dumps(result))

    except Exception as e:
        error_response = {
            'error': str(e),
            'score': 0,
            'classification': 'Error',
            'matched_skills': [],
            'missing_skills': [],
            'experience_match': '-',
            'skills_match': '0%',
            'qualifications_match': '0%',
            'overall_fit': '0%',
            'summary': f'Analysis failed: {str(e)}',
            'scoring_engine': 'error'
        }
        print(json.dumps(error_response))
        sys.exit(1)


if __name__ == '__main__':
    main()