const { checkHealth, getConfig } = require('../lib/ai/llm.service');
const path = require('path');
const fs   = require('fs');

/** GET /api/ai/settings — return current config + health */
const getSettings = async (req, res, next) => {
  try {
    const cfg    = getConfig();
    const health = await checkHealth();
    res.json({
      success: true,
      settings: {
        model:    cfg.model,
        endpoint: cfg.endpoint,
        timeout:  cfg.timeout,
        enabled:  cfg.enabled
      },
      health
    });
  } catch (err) { next(err); }
};

/** POST /api/ai/settings — update .env values at runtime */
const updateSettings = async (req, res, next) => {
  try {
    const { model, endpoint, timeout, enabled } = req.body;
    const envPath = path.join(__dirname, '../../.env');

    let envContent = fs.readFileSync(envPath, 'utf8');

    const set = (key, val) => {
      const regex = new RegExp(`^${key}=.*$`, 'm');
      const line  = `${key}=${val}`;
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, line);
      } else {
        envContent += `\n${line}`;
      }
    };

    if (model)    { set('OLLAMA_MODEL',      model); process.env.OLLAMA_MODEL      = model; }
    if (endpoint) { set('OLLAMA_ENDPOINT',   endpoint); process.env.OLLAMA_ENDPOINT = endpoint; }
    if (timeout)  { set('OLLAMA_TIMEOUT_MS', timeout); process.env.OLLAMA_TIMEOUT_MS = String(timeout); }
    if (enabled !== undefined) { set('AI_ENABLED', String(enabled)); process.env.AI_ENABLED = String(enabled); }

    fs.writeFileSync(envPath, envContent);

    const health = await checkHealth();
    res.json({ success: true, message: 'Settings updated.', health });
  } catch (err) { next(err); }
};

/** POST /api/ai/test — ping Ollama */
const testConnection = async (req, res, next) => {
  try {
    const health = await checkHealth();
    if (health.available) {
      res.json({ success: true, message: `Ollama is running. Model "${health.model}" ${health.modelAvailable ? 'is available' : 'is NOT pulled yet — run: ollama pull ' + health.model}.`, health });
    } else {
      res.json({ success: false, message: `Ollama is not reachable at ${health.endpoint}. Start it with: ollama serve`, health });
    }
  } catch (err) { next(err); }
};

module.exports = { getSettings, updateSettings, testConnection };
