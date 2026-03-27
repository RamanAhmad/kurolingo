// ────────────────────────────────────────────────────────────────────────────
//  Kurdolingo — PM2 Ecosystem Config
//
//  Setup (ohne Docker, direkt auf Linux-Server):
//    npm install -g pm2
//    pm2 start ecosystem.config.js --env production
//    pm2 save          ← nach Neustart automatisch starten
//    pm2 startup       ← systemd-Unit erstellen
//
//  Befehle:
//    pm2 status        → Prozess-Status
//    pm2 logs          → Live-Logs
//    pm2 restart all   → Neustart
//    pm2 monit         → Live-Dashboard
// ────────────────────────────────────────────────────────────────────────────
module.exports = {
  apps: [
    {
      name:      'kurdolingo-api',
      script:    './backend/src/index.js',
      cwd:       __dirname,

      // ── Cluster mode for multi-core CPUs ──────────────────────────────────
      // SQLite with better-sqlite3 is single-process by design — use fork mode
      // (not cluster) to avoid concurrent DB access from multiple workers.
      instances: 1,
      exec_mode: 'fork',

      // ── Auto-restart on crash ──────────────────────────────────────────────
      autorestart:       true,
      watch:             false,    // never watch in production
      max_memory_restart: '512M',  // restart if memory exceeds 512 MB

      // ── Logging ───────────────────────────────────────────────────────────
      log_date_format:  'YYYY-MM-DD HH:mm:ss',
      error_file:       './logs/error.log',
      out_file:         './logs/out.log',
      merge_logs:       true,
      log_type:         'json',

      // ── Environment ───────────────────────────────────────────────────────
      env: {
        NODE_ENV: 'development',
        PORT:     4000,
      },
      env_production: {
        NODE_ENV:    'production',
        PORT:        4000,
        TRUST_PROXY: '1',   // behind nginx
      },
    },
  ],
};
