import express from 'express';
import * as c from './controller.js';

const router = express.Router();

// Lookups for form dropdowns (literal paths — must come before /:id)
router.get('/lookups/departments', c.getDepartments);
router.get('/lookups/employees', c.getEmployees);
router.get('/lookups/rooms', c.getMeetingRooms);



// Header — generic /:id routes go LAST
router.get('/', c.getAll);
router.post('/', c.create);
router.get('/:id', c.getSingle);
router.put('/:id', c.update);
router.delete('/:id', c.remove);

export default router;