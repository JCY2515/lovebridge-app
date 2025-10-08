// Admin endpoint to monitor API usage and costs
// Protected with admin secret

const API_SECRET = process.env.API_SECRET || 'your-secret-key-2024';
const ADMIN_SECRET = process.env.ADMIN_SECRET || 'admin-2024';

// Simple usage tracking (in production, use a database)
let usageStats = {
  totalTranslations: 0,
  totalSpeechRequests: 0,
  estimatedCost: 0,
  lastReset: Date.now(),
  dailyLimits: {
    maxTranslations: 1000,
    maxSpeechRequests: 100
  }
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    // Admin authentication
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ADMIN_SECRET}`) {
      return res.status(401).json({ error: 'Admin access required' });
    }

    if (req.method === 'GET') {
      // Return usage statistics
      const uptimeHours = (Date.now() - usageStats.lastReset) / (1000 * 60 * 60);
      
      return res.status(200).json({
        ...usageStats,
        uptimeHours: Math.round(uptimeHours * 100) / 100,
        averageTranslationsPerHour: Math.round((usageStats.totalTranslations / Math.max(uptimeHours, 0.1)) * 100) / 100,
        remainingDailyTranslations: Math.max(0, usageStats.dailyLimits.maxTranslations - usageStats.totalTranslations),
        remainingDailySpeech: Math.max(0, usageStats.dailyLimits.maxSpeechRequests - usageStats.totalSpeechRequests),
        status: 'active'
      });
    }

    if (req.method === 'POST') {
      // Reset statistics (admin only)
      const { action } = req.body;
      
      if (action === 'reset') {
        usageStats = {
          totalTranslations: 0,
          totalSpeechRequests: 0,
          estimatedCost: 0,
          lastReset: Date.now(),
          dailyLimits: usageStats.dailyLimits
        };
        
        return res.status(200).json({ message: 'Statistics reset successfully', usageStats });
      }
      
      if (action === 'updateLimits') {
        const { maxTranslations, maxSpeechRequests } = req.body;
        
        if (maxTranslations) usageStats.dailyLimits.maxTranslations = parseInt(maxTranslations);
        if (maxSpeechRequests) usageStats.dailyLimits.maxSpeechRequests = parseInt(maxSpeechRequests);
        
        return res.status(200).json({ message: 'Limits updated successfully', usageStats });
      }
      
      return res.status(400).json({ error: 'Invalid action' });
    }

    return res.status(405).json({ error: 'Method not allowed' });

  } catch (error) {
    console.error('Admin API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// Export usage tracking function for other APIs to use
module.exports.trackUsage = function(type, cost = 0) {
  if (type === 'translation') {
    usageStats.totalTranslations++;
    usageStats.estimatedCost += cost || 0.0001; // Roughly $0.0001 per translation
  } else if (type === 'speech') {
    usageStats.totalSpeechRequests++;
    usageStats.estimatedCost += cost || 0.001; // Roughly $0.001 per speech request
  }
};