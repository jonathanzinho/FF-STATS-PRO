import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;
  const db = new Database("matches.db");

  // Initialize database
  db.exec(`
    CREATE TABLE IF NOT EXISTS matches (
      id TEXT PRIMARY KEY,
      user_email TEXT NOT NULL,
      match_data TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS user_config (
      user_email TEXT PRIMARY KEY,
      config_data TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  app.use(express.json({ limit: '50mb' }));

  // Auth Routes
  app.post("/api/auth/signup", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    try {
      const checkStmt = db.prepare("SELECT username FROM users WHERE LOWER(username) = LOWER(?)");
      if (checkStmt.get(username)) {
        return res.status(400).json({ error: "Usuário já existe." });
      }

      const stmt = db.prepare("INSERT INTO users (username, password) VALUES (?, ?)");
      stmt.run(username, password);
      res.json({ success: true });
    } catch (err) {
      console.error("Signup error:", err);
      res.status(500).json({ error: "Erro ao criar conta." });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password are required" });

    try {
      const stmt = db.prepare("SELECT username FROM users WHERE LOWER(username) = LOWER(?) AND password = ?");
      const user = stmt.get(username, password);
      if (user) {
        res.json({ success: true, username: user.username });
      } else {
        res.status(401).json({ error: "Usuário ou senha incorretos." });
      }
    } catch (err) {
      console.error("Login error:", err);
      res.status(500).json({ error: "Erro ao fazer login." });
    }
  });

  // API Routes
  app.get("/api/data", (req, res) => {
    const email = req.query.email as string;
    if (!email) return res.status(400).json({ error: "Email is required" });

    try {
      const matchStmt = db.prepare("SELECT match_data FROM matches WHERE LOWER(user_email) = LOWER(?) ORDER BY created_at DESC");
      const matchRows = matchStmt.all(email);
      const matches = matchRows.map((row: any) => JSON.parse(row.match_data));

      const configStmt = db.prepare("SELECT config_data FROM user_config WHERE LOWER(user_email) = LOWER(?)");
      const configRow = configStmt.get(email) as any;
      const config = configRow ? JSON.parse(configRow.config_data) : null;

      res.json({ matches, config });
    } catch (err) {
      console.error("Error fetching data:", err);
      res.status(500).json({ error: "Failed to fetch data" });
    }
  });

  app.post("/api/matches", (req, res) => {
    const { email, match } = req.body;
    if (!email || !match) return res.status(400).json({ error: "Email and match data are required" });

    const stmt = db.prepare("INSERT OR REPLACE INTO matches (id, user_email, match_data) VALUES (?, ?, ?)");
    stmt.run(match.id, email, JSON.stringify(match));
    res.json({ success: true });
  });

  app.post("/api/config", (req, res) => {
    const { email, config } = req.body;
    if (!email || !config) return res.status(400).json({ error: "Email and config data are required" });

    const stmt = db.prepare("INSERT OR REPLACE INTO user_config (user_email, config_data) VALUES (?, ?)");
    stmt.run(email, JSON.stringify(config));
    res.json({ success: true });
  });

  app.delete("/api/matches", (req, res) => {
    const { email, matchId } = req.query;
    if (!email || !matchId) return res.status(400).json({ error: "Email and matchId are required" });

    try {
      console.log(`Deleting match ${matchId} for user ${email}`);
      const stmt = db.prepare("DELETE FROM matches WHERE LOWER(user_email) = LOWER(?) AND id = ?");
      const result = stmt.run(email, matchId);
      console.log(`Deleted ${result.changes} matches`);
      res.json({ success: true, changes: result.changes });
    } catch (err) {
      console.error("Error deleting match:", err);
      res.status(500).json({ error: "Failed to delete match" });
    }
  });

  app.delete("/api/matches/tournament", (req, res) => {
    const { email, tournament } = req.query;
    if (!email || !tournament) return res.status(400).json({ error: "Email and tournament are required" });

    const tournamentStr = String(tournament).trim();
    console.log(`[DELETE] Tournament: "${tournamentStr}" for user: ${email}`);
    
    try {
      // Fetch all matches for this user to filter in JS (more reliable than json_extract in some environments)
      const matches = db.prepare("SELECT id, match_data FROM matches WHERE LOWER(user_email) = LOWER(?)").all(email);
      const toDelete = matches.filter(m => {
        try {
          const data = JSON.parse(m.match_data);
          const matchTournament = String(data.tournament || '').trim().toLowerCase();
          const targetTournament = tournamentStr.toLowerCase();
          return matchTournament === targetTournament;
        } catch {
          return false;
        }
      }).map(m => m.id);

      if (toDelete.length > 0) {
        const deleteStmt = db.prepare("DELETE FROM matches WHERE id = ? AND LOWER(user_email) = LOWER(?)");
        const deleteMany = db.transaction((ids, userEmail) => {
          for (const id of ids) {
            deleteStmt.run(id, userEmail);
          }
        });
        deleteMany(toDelete, email);
        console.log(`[DELETE] Successfully removed ${toDelete.length} matches for tournament "${tournamentStr}"`);
        res.json({ success: true, deletedCount: toDelete.length });
      } else {
        console.log(`[DELETE] No matches found for tournament "${tournamentStr}"`);
        res.json({ success: true, deletedCount: 0 });
      }
    } catch (err) {
      console.error("[DELETE] Error deleting tournament:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  app.delete("/api/matches/clear", (req, res) => {
    const { email } = req.query;
    if (!email) return res.status(400).json({ error: "Email is required" });

    console.log(`[DELETE] Clearing all matches for user: ${email}`);
    try {
      const stmt = db.prepare("DELETE FROM matches WHERE LOWER(user_email) = LOWER(?)");
      const result = stmt.run(email);
      console.log(`[DELETE] Cleared ${result.changes} matches for ${email}`);
      res.json({ success: true, changes: result.changes });
    } catch (err) {
      console.error("[DELETE] Error clearing matches:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
