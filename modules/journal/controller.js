import * as service from './service.js';

export const listJournal = async (req, res) => {
  const result = await service.listJournal(req.query);
  res.json(result.body);
};

export const listGeneralLedger = async (req, res) => {
  const result = await service.listGeneralLedger(req.query);
  res.json(result.body);
};

export const listGlAccounts = async (req, res) => {
  const result = await service.listGlAccounts();
  res.json(result.body);
};
