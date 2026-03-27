'use strict';
/**
 * heartRegen.js
 *
 * Hearts regenerate at 1 per REGEN_MINUTES when below max.
 * We don't use a cron — we calculate on-demand whenever we read a user.
 *
 * Call applyRegen(db, userId) before any response that shows hearts.
 * Returns the current hearts value (after regen, if any).
 */

const REGEN_MINUTES = 30; // 1 heart every 30 minutes
const MAX_HEARTS    = 5;

/**
 * Calculates and applies heart regeneration for a user.
 * Mutates the DB row if hearts should have regenerated.
 * Returns the up-to-date hearts count.
 */
function applyRegen(db, userId) {
  const user = db.prepare(
    'SELECT hearts, last_heart_lost FROM users WHERE id=?'
  ).get(userId);

  if (!user) return MAX_HEARTS;

  // Already full — nothing to do
  if (user.hearts >= MAX_HEARTS) return MAX_HEARTS;

  // No timestamp means we don't know when hearts were lost → restore to max
  // (safety net for legacy rows)
  if (!user.last_heart_lost) {
    db.prepare('UPDATE users SET hearts=? WHERE id=?').run(MAX_HEARTS, userId);
    return MAX_HEARTS;
  }

  const lostAt     = new Date(user.last_heart_lost).getTime();
  const now        = Date.now();
  const elapsedMs  = now - lostAt;
  const regenCount = Math.floor(elapsedMs / (REGEN_MINUTES * 60 * 1000));

  if (regenCount <= 0) return user.hearts;

  const newHearts = Math.min(MAX_HEARTS, user.hearts + regenCount);

  if (newHearts >= MAX_HEARTS) {
    // Full again — clear the timestamp
    db.prepare('UPDATE users SET hearts=?, last_heart_lost=NULL WHERE id=?')
      .run(MAX_HEARTS, userId);
  } else {
    // Partial regen — advance the timestamp by the consumed regen periods
    const consumed     = regenCount * REGEN_MINUTES * 60 * 1000;
    const newTimestamp = new Date(lostAt + consumed).toISOString();
    db.prepare('UPDATE users SET hearts=?, last_heart_lost=? WHERE id=?')
      .run(newHearts, newTimestamp, userId);
  }

  return newHearts;
}

/**
 * Returns how many minutes until the next heart regenerates.
 * Returns 0 if hearts are full or regen would fire immediately.
 */
function minutesUntilNextRegen(db, userId) {
  const user = db.prepare(
    'SELECT hearts, last_heart_lost FROM users WHERE id=?'
  ).get(userId);

  if (!user || user.hearts >= MAX_HEARTS || !user.last_heart_lost) return 0;

  const lostAt    = new Date(user.last_heart_lost).getTime();
  const elapsedMs = Date.now() - lostAt;
  const remainMs  = (REGEN_MINUTES * 60 * 1000) - (elapsedMs % (REGEN_MINUTES * 60 * 1000));
  return Math.ceil(remainMs / 60000);
}

module.exports = { applyRegen, minutesUntilNextRegen, REGEN_MINUTES, MAX_HEARTS };
