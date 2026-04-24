# OpenAI Integration - Quick Install Commands

# ============================================================
# AFTER ENSURING PYTHON IS IN PATH, RUN THESE COMMANDS:
# ============================================================

# Navigate to AI directory
cd "C:\Documents\SDC PROJECT\HireSmart_Project\ai"

# Install OpenAI package (use one of these):
python -m pip install openai python-dotenv --upgrade
# OR if pip is in PATH:
pip install openai python-dotenv

# Verify installation
python -c "import openai; print('OpenAI installed:', openai.__version__)"

# ============================================================
# CONFIGURE YOUR API KEY
# ============================================================

# 1. Get API key from: https://platform.openai.com/api-keys
# 2. Open: C:\Documents\SDC PROJECT\HireSmart_Project\backend\.env
# 3. Set: OPENAI_API_KEY=sk-your-key-here

# ============================================================
# TEST INTEGRATION
# ============================================================

cd "C:\Documents\SDC PROJECT\HireSmart_Project\ai"

# Test with sample data
$testData = @{
    resume_text = "Senior Full Stack Developer with 5 years experience in React, Node.js, Python, MongoDB. Led team of 4 developers."
    job_description = "Looking for experienced React developer with Node.js backend skills"
    job_title = "Senior React Developer"
} | ConvertTo-Json

echo $testData | python resume_match.py

# Expected: Should see "ai_enhancement": "enabled" in output

# ============================================================
# VERIFY BACKEND INTEGRATION
# ============================================================

# Restart backend server
cd "C:\Documents\SDC PROJECT\HireSmart_Project\backend"
node server.js

# Upload resumes through UI
# Check console logs for: "✓ OpenAI enhancement applied"
