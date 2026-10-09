import * as service from './service.js';

export const listAttachments = async (req, res) => {
  const result = await service.listAttachments(req.query);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const uploadAttachment = async (req, res) => {
  const result = await service.uploadAttachment(req.body, req.file);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};

export const downloadAttachment = async (req, res) => {
  const result = await service.downloadAttachment(req.params);
  if (result.sendText) return res.status(result.status).send(result.body);
  res.set('Content-Type', result.file.mime || 'application/octet-stream');
  res.set('Content-Disposition', `attachment; filename="${(result.file.oname || 'file').replace(/"/g, '')}"`);
  res.send(result.body);
};

export const deleteAttachment = async (req, res) => {
  const result = await service.deleteAttachment(req.params);
  if (result.status !== 200) return res.status(result.status).json(result.body);
  res.json(result.body);
};
