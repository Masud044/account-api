import express from 'express';
import * as c from './controller.js';

const router = express.Router();

// ═══════════════════ DEPARTMENTS ═══════════════════
router.get('/departments', c.getAllDepartments);
router.post('/departments', c.createDepartment);
router.get('/departments/:id', c.getDepartment);
router.put('/departments/:id', c.updateDepartment);
router.delete('/departments/:id', c.deleteDepartment);

// ═══════════════════ EMPLOYEES ═══════════════════
router.get('/employees', c.getAllEmployees);              // ?includeInactive=true
router.post('/employees', c.createEmployee);
router.get('/employees/:id', c.getEmployee);
router.put('/employees/:id', c.updateEmployee);
router.patch('/employees/:id/deactivate', c.deactivateEmployee);
router.patch('/employees/:id/reactivate', c.reactivateEmployee);

// ═══════════════════ MEETING ROOMS ═══════════════════
router.get('/rooms', c.getAllMeetingRooms);                // ?includeInactive=true
router.post('/rooms', c.createMeetingRoom);
router.get('/rooms/:id', c.getMeetingRoom);
router.put('/rooms/:id', c.updateMeetingRoom);
router.patch('/rooms/:id/deactivate', c.deactivateMeetingRoom);
router.patch('/rooms/:id/reactivate', c.reactivateMeetingRoom);

export default router;