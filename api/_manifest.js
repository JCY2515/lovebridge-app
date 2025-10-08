// Serve the manifest.json file with proper headers
const fs = require('fs');
const path = require('path');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Cache-Control', 'public, max-age=31536000');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Read the manifest.json from public folder
    const manifestPath = path.join(process.cwd(), 'public', 'manifest.json');
    const manifest = fs.readFileSync(manifestPath, 'utf8');
    
    res.status(200).send(manifest);
  } catch (error) {
    console.error('Error serving manifest:', error);
    
    // Fallback manifest
    const fallbackManifest = {
      "short_name": "LoveBridge",
      "name": "LoveBridge - Love Translation App",
      "description": "Real-time translation for couples",
      "start_url": "/",
      "display": "standalone",
      "theme_color": "#ff69b4",
      "background_color": "#1a1a2e",
      "orientation": "portrait",
      "scope": "/",
      "icons": []
    };
    
    res.status(200).json(fallbackManifest);
  }
};