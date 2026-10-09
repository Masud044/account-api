import * as service from './service.js';

export const getAging = async (req, res) => {
  const result = await service.getAging(req.query);
  res.json(result.body);
};

export const getOutstanding = async (req, res) => {
  const result = await service.getOutstanding(req.query);
  res.json(result.body);
};

export const getStatement = async (req, res) => {
  const result = await service.getStatement(req.query);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const getGlSummary = async (req, res) => {
  const result = await service.getGlSummary(req.query);
  res.json(result.body);
};
