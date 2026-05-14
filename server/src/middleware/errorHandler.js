export const errorHandler = (err, req, res, next) => {
  console.error(err);
  const message = err?.message || "Something went wrong";
  res.status(500).json({ message });
};
