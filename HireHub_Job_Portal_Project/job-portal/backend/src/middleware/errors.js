export function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}
export function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ message: 'This record already exists.' });
  if (err.name === 'MulterError') return res.status(400).json({ message: err.message });
  const status=Number(err.status)||500;
  res.status(status).json({ message: status>=500 ? 'Internal server error.' : (err.message || 'Request failed.') });
}
