const fs = require('fs');
const path = require('path');

const dataDir = path.join(__dirname, '../data');
const dataFile = path.join(dataDir, 'store.json');

const defaultData = {
  users: [],
  analyses: []
};

function ensureStore() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(dataFile)) {
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf-8');
  }
}

function readStore() {
  ensureStore();
  const raw = fs.readFileSync(dataFile, 'utf-8');

  try {
    const parsed = JSON.parse(raw);
    return {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      analyses: Array.isArray(parsed.analyses) ? parsed.analyses : []
    };
  } catch {
    fs.writeFileSync(dataFile, JSON.stringify(defaultData, null, 2), 'utf-8');
    return { ...defaultData };
  }
}

function writeStore(data) {
  ensureStore();
  fs.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf-8');
}

function findUserByEmail(email) {
  const store = readStore();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  return store.users.find((user) => user.email.toLowerCase() === normalizedEmail) || null;
}

function createUser(user) {
  const store = readStore();
  store.users.push(user);
  writeStore(store);
  return user;
}

function saveAnalysis(analysis) {
  const store = readStore();
  store.analyses.push(analysis);
  writeStore(store);
  return analysis;
}

function getAnalysesByRecruiter(recruiterId, limit = 20) {
  const store = readStore();
  const recruiterAnalyses = store.analyses
    .filter((item) => item.recruiter_id === recruiterId)
    .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  return recruiterAnalyses.slice(0, limit);
}

function getUserAnalyses(userId) {
  const store = readStore();
  return store.analyses
    .filter((analysis) => analysis.userId === userId || analysis.recruiter_id === userId)
    .sort((a, b) => {
      const dateA = new Date(a.createdAt || a.timestamp || 0).getTime();
      const dateB = new Date(b.createdAt || b.timestamp || 0).getTime();
      return dateB - dateA;
    });
}

function getAnalysisById(id) {
  const store = readStore();
  return store.analyses.find(analysis => analysis.id === id) || null;
}

function getAnalysesByBatchId(batchId) {
  const store = readStore();
  return store.analyses
    .filter((analysis) => analysis.batch_id === batchId)
    .sort((a, b) => {
      const dateA = new Date(a.timestamp || a.createdAt || 0).getTime();
      const dateB = new Date(b.timestamp || b.createdAt || 0).getTime();
      return dateA - dateB;
    });
}

module.exports = {
  findUserByEmail,
  createUser,
  saveAnalysis,
  getAnalysesByRecruiter,
  getUserAnalyses,
  getAnalysisById,
  getAnalysesByBatchId
};
