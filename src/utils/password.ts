export function isStrongPassword(password: string) {
  const hasLower = /[a-z]/.test(password);
  const hasUpper = /[A-Z]/.test(password);
  const hasNumber = /\d/.test(password);
  const hasSymbol = /[^A-Za-z\d]/.test(password);
  return password.length >= 8 && hasLower && hasUpper && hasNumber && hasSymbol;
}
