import jwt from "jsonwebtoken";
import crypto from "crypto";

const TOKEN_TTL = "2h";
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const attempts = new Map();

function timingSafeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) {
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  return crypto.timingSafeEqual(bufA, bufB);
}

export function checkRateLimit(req, res, next) {
  const ip = req.ip;
  const now = Date.now();
  const record = attempts.get(ip);
  if (record && now - record.firstAttempt < WINDOW_MS && record.count >= MAX_ATTEMPTS) {
    return res.status(429).json({ error: "Too many attempts. Try again later." });
  }
  next();
}

function recordFailedAttempt(req) {
  const ip = req.ip;
  const now = Date.now();
  const record = attempts.get(ip);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    attempts.set(ip, { count: 1, firstAttempt: now });
  } else {
    record.count += 1;
  }
}

function clearAttempts(req) {
  attempts.delete(req.ip);
}

export function login(req, res) {
  const expectedUsername = process.env.DBUPDATE_USERNAME;
  const expectedPassword = process.env.DBUPDATE_PASSWORD;
  const { username, password } = req.body || {};

  if (!expectedUsername || !expectedPassword) {
    return res.status(500).json({ error: "DB update console is not configured." });
  }
  const usernameOk = !!username && timingSafeEqual(username, expectedUsername);
  const passwordOk = !!password && timingSafeEqual(password, expectedPassword);
  if (!usernameOk || !passwordOk) {
    recordFailedAttempt(req);
    return res.status(401).json({ error: "Incorrect username or password." });
  }
  clearAttempts(req);
  const token = jwt.sign({ scope: "dbupdate" }, process.env.JWT_SECRET, { expiresIn: TOKEN_TTL });
  return res.json({ token });
}

export function requireDbUpdateToken(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Missing token." });
  }
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (decoded.scope !== "dbupdate") {
      return res.status(403).json({ error: "Invalid token scope." });
    }
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired token." });
  }
}
