const express = require('express');
const fs = require('fs');
const path = require('path');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const { Octokit } = require('@octokit/rest');

const app = express();
const PORT = process.env.PORT || 3000;

// GitHub setup
const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const REPO_OWNER = 'prairie-sun';
const REPO_NAME = 'prairie-sun-pwa';
const BRANCH = 'main';
const FILE_PATH = 'public/taplist.json';

const octokit = new Octokit({ auth: GITHUB_TOKEN });

// Middleware
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// Load taplist.json
let taplist;
try {
  taplist = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'taplist.json')));
} catch (err) {
  console.error("Failed to load taplist.json:", err);
  taplist = { meta: { venue: "Prairie Sun Brewery", last_updated: new Date().toISOString() }, beers: [] };
}

// --- Update beer status endpoint ---
app.post('/update-beer-status', async (req, res) => {
  const { beerId, onTap } = req.body;
  const beer = taplist.beers.find(b => b.id === beerId);
  if (!beer) return res.status(404).json({ success: false, message: 'Beer not found' });

  beer.on_tap = onTap;
  taplist.meta.last_updated = new Date().toISOString();

  // Save locally
  const taplistString = JSON.stringify(taplist, null, 2);
  fs.writeFileSync(path.join(__dirname, FILE_PATH), taplistString);

  // Broadcast to WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'taplist-update', taplist }));
    }
  });

  // Commit to GitHub
  try {
    // Get current file SHA
    const { data: fileData } = await octokit.repos.getContent({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      ref: BRANCH,
    });

    await octokit.repos.createOrUpdateFileContents({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      path: FILE_PATH,
      message: `Update taplist — ${beer.name} ${onTap ? 'on tap' : 'off tap'}`,
      content: Buffer.from(taplistString).toString('base64'),
      sha: fileData.sha,
      branch: BRANCH,
    });
    console.log('GitHub updated successfully');
  } catch (err) {
    console.error('Failed to commit to GitHub:', err);
  }

  res.json({ success: true });
});

// --- Start server ---
const server = app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

// --- WebSocket setup ---
const wss = new WebSocket.Server({ server });

wss.on('connection', (ws) => {
  console.log('New client connected');
  ws.send(JSON.stringify({ type: 'taplist-update', taplist }));
  ws.on('close', () => console.log('Client disconnected'));
});
