import mongoose from 'mongoose';



const MAX_DEPTH = 12;

function clean(value, depth = 0) {
  // A depth bound, because a deeply nested body is otherwise a way to spend
  // unbounded time here — and a real one only nests a handful of levels.
  if (depth > MAX_DEPTH) return undefined;

  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) {
      const cleaned = clean(value[i], depth + 1);
      if (cleaned === undefined) {
        value.splice(i, 1);
        i -= 1;
      } else {
        value[i] = cleaned;
      }
    }
    return value;
  }

  if (value && typeof value === 'object') {
    // Buffers, Dates and ObjectIds are legitimate values that happen to be
    // objects. Walking into one would replace it with a plain object and break
    // whatever it was — an ObjectId arriving as `{_bsontype: ...}` would fail to
    // cast and look like a client error.
    if (
      value instanceof Date
      || value instanceof RegExp
      || value instanceof mongoose.Types.ObjectId
      || Buffer.isBuffer(value)
    ) {
      return value;
    }

    for (const key of Object.keys(value)) {
      if (key.startsWith('$') || key.includes('.')) {
        delete value[key];
        continue;
      }

      const cleaned = clean(value[key], depth + 1);
      if (cleaned === undefined) delete value[key];
      else value[key] = cleaned;
    }

    return value;
  }

  return value;
}

export default function sanitize(req, res, next) {
  // `req.body` is undefined in Express 5 when nothing was parsed, so it is
  // checked rather than assumed.
  if (req.body && typeof req.body === 'object') clean(req.body);
  if (req.params && typeof req.params === 'object') clean(req.params);

  // `req.query` is read through the accessor, which is what makes this safe:
  // the value is mutated, never reassigned.
  const query = req.query;
  if (query && typeof query === 'object') clean(query);

  return next();
}

export { clean as stripUnsafeKeys };
