import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3001;
const LOG_FILE = path.join(__dirname, 'activity-log.json');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function readLog() {
  try {
    return JSON.parse(fs.readFileSync(LOG_FILE, 'utf8'));
  } catch {
    return { version: 1, entries: [] };
  }
}

function writeLog(data) {
  fs.writeFileSync(LOG_FILE, JSON.stringify(data, null, 2));
}

// GET all entries (optionally filter by project)
app.get('/api/activity', (req, res) => {
  const { project, limit = 100 } = req.query;
  const log = readLog();
  let entries = log.entries.slice().reverse(); // newest first
  if (project && project !== 'all') {
    entries = entries.filter(e => e.project === project);
  }
  entries = entries.slice(0, parseInt(limit));
  
  const projects = [...new Set(log.entries.map(e => e.project).filter(Boolean))];
  
  // Per-project counts
  const projectCounts = {};
  log.entries.forEach(e => {
    if (e.project) projectCounts[e.project] = (projectCounts[e.project] || 0) + 1;
  });

  res.json({ entries, projects, projectCounts, total: log.entries.length });
});

// POST new entry (used by Mike to log activity)
app.post('/api/activity', (req, res) => {
  const log = readLog();
  const entry = {
    id: String(log.entries.length + 1).padStart(3, '0'),
    timestamp: new Date().toISOString(),
    ...req.body
  };
  log.entries.push(entry);
  writeLog(log);
  res.json({ ok: true, entry });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`📊 Mike Activity Dashboard op http://localhost:${PORT}`);
});
