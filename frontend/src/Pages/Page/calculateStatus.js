const MONTH_MAP = { Jan:0, Feb:1, Mar:2, Apr:3, May:4, Jun:5, Jul:6, Aug:7, Sep:8, Oct:9, Nov:10, Dec:11 };
const parseExpiryDate = (expiryDate) => {
  if (!expiryDate) return new Date('invalid');
  if (expiryDate.includes('/')) {
    const p = expiryDate.split('/');
    return new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
  }
  const p = expiryDate.split(' ');
  if (p.length === 3 && MONTH_MAP[p[1]] !== undefined) {
    return new Date(parseInt(p[2]), MONTH_MAP[p[1]], parseInt(p[0]));
  }
  return new Date(expiryDate);
};

export const calculateStatus = (expiryDate) => {
  const expiry = parseExpiryDate(expiryDate);
  const currentDate = new Date();

  currentDate.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffDays = (expiry - currentDate) / (1000 * 60 * 60 * 24);

  if (Math.ceil(diffDays) < 0) {
    return { message: 'Expired ' + Math.abs(Math.ceil(diffDays)) + 'd', color: 'red' };
  } else if (Math.ceil(diffDays) === 0) {
    return { message: 'Expires Today', color: 'red' };
  } else if (Math.ceil(diffDays) <= 5) {
    return { message: Math.ceil(diffDays) + 'd to Expire', color: '#DAA520' };
  } else {
    return { message: 'Safe (>5d)', color: 'green' };
  }
};
