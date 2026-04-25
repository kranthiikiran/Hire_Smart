# HireSmart Release Checklist

Use this checklist before creating a release tag or sharing the repository publicly.

## 1. Code and Branch Hygiene

- [ ] All intended changes are committed on `main`.
- [ ] `git status` is clean.
- [ ] No merge conflict markers remain (`<<<<<<<`, `=======`, `>>>>>>>`).
- [ ] Repository remote points to the correct URL.

## 2. Secrets and Safety

- [ ] No `.env` files are tracked.
- [ ] Only template environment files are present (for example, `backend/.env.example`).
- [ ] API keys, tokens, and passwords are removed from docs and code.
- [ ] `.gitignore` excludes `node_modules`, logs, uploads, and build artifacts.

## 3. Backend Validation

- [ ] Install dependencies in `backend`:
  - `npm install`
- [ ] Backend starts successfully:
  - `npm start`
- [ ] Health endpoint responds:
  - `GET http://localhost:5500/api/health`
- [ ] Auth flow verified:
  - Register and login work.
  - Wrong credentials return clear error messages.

## 4. Frontend Validation

- [ ] Install dependencies in `frontend-react`:
  - `npm install`
- [ ] Frontend runs in dev mode:
  - `npm run dev`
- [ ] Frontend build succeeds:
  - `npm run build`
- [ ] Core flows verified:
  - Login
  - Upload
  - Analyze
  - Results
  - Shortlist
  - Report export

## 5. End-to-End Functional Checks

- [ ] Resume analysis works for sample inputs.
- [ ] Match score and classification render correctly.
- [ ] Add-to-shortlist works and panel updates.
- [ ] AI assistant opens and responds.
- [ ] Download report works.

## 6. Documentation Quality

- [ ] `README.md` is up to date and accurate.
- [ ] Startup instructions are tested exactly as written.
- [ ] Architecture and diagram docs are present.
- [ ] Project report/supporting docs are included as needed.

## 7. Release Metadata

- [ ] Version updated (if versioning is used).
- [ ] Changelog/changes summary updated.
- [ ] Release notes drafted (high-level features and fixes).

## 8. GitHub Publication

- [ ] Push latest `main` branch.
- [ ] Verify repository files on GitHub.
- [ ] Add repository description and topics.
- [ ] Add screenshots/demo links in README.
- [ ] Create a release tag (optional):
  - `git tag -a v1.0.0 -m "Initial stable release"`
  - `git push origin v1.0.0`

## 9. Optional Quality Gates

- [ ] Run backend tests.
- [ ] Run linting and formatting checks.
- [ ] Verify Docker compose setup if distributing containerized deployment.

---

## Recommended Release Command Sequence

```powershell
cd "c:\Documents\SDC PROJECT\HireSmart_Project"
git status
git add .
git commit -m "Prepare release"
git push origin main
# Optional tagging
# git tag -a v1.0.0 -m "Initial stable release"
# git push origin v1.0.0
```
