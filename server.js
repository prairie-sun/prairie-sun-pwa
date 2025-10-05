// --- Imports ---
const express = require('express');
const fs = require('fs');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const { Octokit } = require("@octokit/rest");

// --- App setup ---
const app = express();
const PORT = process.env.PORT || 3000;

// --- GitHub integration ---
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });
const owner = "prairie-sun";      // GitHub username/org
const repo = "prairie-sun-pwa";   // Repo name
const branch = "main";            // Branch to update

// --- Middleware ---
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- Health check endpoint ---
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// --- Load taplist.json ---
let taplist;
try {
  taplist = JSON.parse(fs.readFileSync(path.join(__dirname, 'public', 'taplist.json')));
} catch (err) {
  console.error("Failed to load taplist.json:", err);
  taplist = { meta: { venue: "Prairie Sun Brewery", last_updated: new Date().toISOString() }, beers: [] };
}

// --- Function to update taplist.json on GitHub ---
async function updateTaplistOnGitHub(content) {
  try {
    const { data: fileData } = await octokit.repos.getContent({
      owner,
      repo,
      path: "public/taplist.json",
      ref: branch
    });

    await octokit.repos.createOrUpdateFileContents({
      owner,
      repo,
      path: "public/taplist.json",
      message: `Update taplist — ${new Date().toISOString()}`,
      content: Buffer.from(JSON.stringify(content, null, 2)).toString("base64"),
      sha: fileData.sha,
      branch
    });

    console.log("✅ taplist.json updated on GitHub");
  } catch (err) {
    console.error("❌ Failed to update taplist.json on GitHub:", err);
  }
}

// --- Express endpoints ---
app.post('/update-beer-status', async (req, res) => {
  const { beerId, onTap } = req.body;
  const beer = taplist.beers.find(b => b.id === beerId);
  if (!beer) return res.status(404).json({ success: false, message: 'Beer not found' });

  beer.on_tap = onTap;
  taplist.meta.last_updated = new Date().toISOString();

  fs.writeFileSync(path.join(__dirname, 'public', 'taplist.json'), JSON.stringify(taplist, null, 2));

  // Broadcast update
  const wss = app.get('wss');
  if (wss) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'taplist-update', taplist }));
      }
    });
  }

  await updateTaplistOnGitHub(taplist);

  res.json({ success: true });
});

app.post('/save-taplist', async (req, res) => {
  const { updates } = req.body;
  if (!updates || typeof updates !== 'object')
    return res.status(400).json({ success: false, message: 'Invalid request' });

  Object.entries(updates).forEach(([beerId, onTap]) => {
    const beer = taplist.beers.find(b => b.id === beerId);
    if (beer) beer.on_tap = onTap;
  });
  taplist.meta.last_updated = new Date().toISOString();

  fs.writeFileSync(path.join(__dirname, 'public', 'taplist.json'), JSON.stringify(taplist, null, 2));

  // Broadcast update
  const wss = app.get('wss');
  if (wss) {
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'taplist-update', taplist }));
      }
    });
  }

  await updateTaplistOnGitHub(taplist);

  res.json({ success: true });
});

// --- Start server (delayed startup for Render stability) ---
setTimeout(() => {
  const server = app.listen(PORT, () => {
    console.log(`✅ Server fully initialized on port ${PORT}`);
  });

  const wss = new WebSocket.Server({ server });

  wss.on('connection', (ws) => {
    console.log('🔗 New client connected');
    ws.send(JSON.stringify({ type: 'taplist-update', taplist }));

    ws.on('close', () => console.log('❌ Client disconnected'));
  });

  app.set('wss', wss);
  
  // --- Self-ping to keep Render awake ---
  const SELF_URL = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;

  setInterval(() => {
    fetch(`${SELF_URL}/health`)
      .then(res => console.log(`🌞 Self-ping OK: ${res.status}`))
      .catch(err => console.error("⚠️ Self-ping failed:", err.message));
  }, 12 * 60 * 1000); // every 12 minutes


}, 500);
