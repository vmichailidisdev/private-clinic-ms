const roles = ['client', 'sec', 'doctor', 'admin'];

function isUndefined(value) {
  return value === undefined;
}

module.exports = {
  email(value) {
    if (isUndefined(value)) return false;
    return /^[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}$/.test(value);
  },
  password(value, confirm) {
    if (isUndefined(value)) return false;
    if (isUndefined(confirm)) return false;
    return /^[a-zA-Z0-9]{8,16}$/.test(value) && value === confirm;
  },
  name(value) {
    if (isUndefined(value)) return false;
    return /^[a-zA-Z ]{1,100}$/.test(value);
  },
  date(value) {
    if (isUndefined(value)) return false;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const [curYear, curMonth, curDay] = new Date().toISOString().split('T')[0].split('-');
    const [year, month, day] = value.split('-');
    if (year > curYear || month > curMonth || day > curDay) return false;
    return true;
  },
  mindate(value) {
    if (isUndefined(value)) return false;
    if (!/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value)) return false;
    const [curYear, curMonth, curDay] = new Date().toISOString().split('T')[0].split('-');
    const [year, month, day] = value.split('-');
    if (year < curYear || month < curMonth || day < curDay) return false;
    return true;
  },
  gender(value) {
    if (isUndefined(value)) return false;
    return /^(male|female)$/.test(value);
  },
  role(value) {
    return roles.includes(value);
  },
};
