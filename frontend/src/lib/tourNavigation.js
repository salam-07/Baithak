// A step can render before React Router commits its destination. The source
// route is still part of our navigation until that destination arrives.
export function tourRouteStatus(pathname, expectedPath, pending) {
  if (pathname === expectedPath) return 'arrived';
  if (pending?.to === expectedPath && pathname === pending.from) return 'pending';
  return 'left';
}
