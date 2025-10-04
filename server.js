const express = require('express');
const fs = require('fs');
const WebSocket = require('ws');
const bodyParser = require('body-parser');
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

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
app.post('/update-beer-status', (req, res) => {
  const { beerId, onTap } = req.body;
  const beer = taplist.beers.find(b => b.id === beerId);
  if (!beer) return res.status(404).json({ success: false, message: 'Beer not found' });

  beer.on_tap = onTap;
  taplist.meta.last_updated = new Date().toISOString();

  // Save back to taplist.json
  fs.writeFileSync(path.join(__dirname, 'public', 'taplist.json'), JSON.stringify(taplist, null, 2));

  // Broadcast to all connected WebSocket clients
  wss.clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify({ type: 'taplist-update', taplist }));
    }
  });

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
  // Send current taplist immediately to new clients
  ws.send(JSON.stringify({ type: 'taplist-update', taplist }));

  ws.on('close', () => console.log('Client disconnected'));
});
