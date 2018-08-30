import statuses from 'statuses';

export function sendError(code) {
  return (req, res) => res.status(code).format({
    'application/json': () => res.send({ error: statuses[code] || String(code) }),
    default: () => res.end(statuses[code] || String(code)),
  });
}

export function sendOptions(allow) {
  return (req, res) => res.set('Allow', allow.join(', ')).end();
}
