import * as service from './service.js';

export const listCustomers = async (req, res) => {
  const result = await service.listCustomers();
  res.json(result.body);
};

export const getCoa = async (req, res) => {
  const result = await service.getCoa();
  res.json(result.body);
};

export const getCustomer = async (req, res) => {
  const result = await service.getCustomer(req.params);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const createCustomer = async (req, res) => {
  const result = await service.createCustomer(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const recordAdvance = async (req, res) => {
  const result = await service.recordAdvance(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const saveInvoice = async (req, res) => {
  const result = await service.saveInvoice(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const settle = async (req, res) => {
  const result = await service.settle(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const cancelInvoice = async (req, res) => {
  const result = await service.cancelInvoice(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const cancelReceipt = async (req, res) => {
  const result = await service.cancelReceipt(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const refundAdvance = async (req, res) => {
  const result = await service.refundAdvance(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const cancelRefund = async (req, res) => {
  const result = await service.cancelRefund(req.body);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};
