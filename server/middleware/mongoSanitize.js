/**
 * Middleware to sanitize user input and prevent NoSQL Injection attacks.
 * Strips MongoDB query operator keys ($gt, $ne, $where, etc.) from req.body, req.query, and req.params.
 */
export const sanitizeMongoInput = (req, res, next) => {
  const sanitize = (obj) => {
    if (!obj || typeof obj !== "object") return obj;

    for (const key of Object.keys(obj)) {
      if (key.startsWith("$") || key.includes(".")) {
        delete obj[key];
      } else if (typeof obj[key] === "object" && obj[key] !== null) {
        sanitize(obj[key]);
      }
    }
    return obj;
  };

  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);

  next();
};

export default sanitizeMongoInput;

