/** Auto-generated label when OTP signup/login did not collect a farmer name. */
export function isPlaceholderFarmerName(name: string | undefined): boolean {
  if (!name?.trim()) return true;
  return /^Farmer \(\d{4}\)$/.test(name.trim());
}
