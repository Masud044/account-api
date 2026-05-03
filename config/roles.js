
// src\config\roles.js
export const ROLES = {
  ADMIN:      "Admin",
  INVENTORY:   "Inventory",
  
};

const { ADMIN,INVENTORY } = ROLES;

// ── Role Groups ────────────────────────────────────────────────────────────────
export const ALL_ROLES        = [ADMIN, INVENTORY];
export const ADMIN_ONLY       = [ADMIN];
export const INVENTORY_ONLY    = [INVENTORY];



