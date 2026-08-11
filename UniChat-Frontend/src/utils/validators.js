export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email);
}

export function validateName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;
}

export function validateMessage(text) {
  return typeof text === 'string' && text.trim().length > 0 && text.trim().length <= 5000;
}

export function validatePassword(password) {
  return typeof password === 'string' && password.length >= 6;
}

export function validateServerName(name) {
  return typeof name === 'string' && name.trim().length >= 2 && name.trim().length <= 100;
}

export function validateChannelName(name) {
  return typeof name === 'string' && name.trim().length >= 1 && name.trim().length <= 100;
}

export function validateInviteCode(code) {
  return typeof code === 'string' && code.trim().length >= 4;
}