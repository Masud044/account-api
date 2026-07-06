// import { Router } from 'express';
// import * as inventoryCtrl from './inventory.controller.js';

// const router = Router();

// // ──────────────────────────────────────────────────────────────────────────────
// // INVENTORIES   (PK: TID)
// // ──────────────────────────────────────────────────────────────────────────────
// router.post  ('/',         inventoryCtrl.create);
// router.get   ('/',         inventoryCtrl.getAll);
// router.get   ('/:tid',    inventoryCtrl.getSingle);
// router.put   ('/:tid',    inventoryCtrl.update);
// router.delete('/:tid',    inventoryCtrl.remove);


// export default router;

import { Router } from 'express';
import * as inventoryCtrl from './inventory.controller.js';

const router = Router();

// ⚠️ IMPORTANT: এই static route টা অবশ্যই '/:tid' এর *আগে* থাকতে হবে,
// নাহলে Express "next-grn-no" কে tid ধরে fetch করার চেষ্টা করবে
router.get('/next-grn-no', inventoryCtrl.nextGrnNo);

router.post  ('/',      inventoryCtrl.create);
router.get   ('/',      inventoryCtrl.getAll);
router.get   ('/:tid',  inventoryCtrl.getSingle);
router.put   ('/:tid',  inventoryCtrl.update);
router.delete('/:tid',  inventoryCtrl.remove);

export default router;