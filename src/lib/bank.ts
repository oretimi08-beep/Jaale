// Checks that a bank account belongs to the seller, by comparing the name the bank gives us with their profile name.
// Banks write names in capitals and in any order ("ORE OLUWATIMILEHIN FOLARIN"), so we compare word by word.

function words(name: string): string[] {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // drop accents (Oládiípò → oladiipo)
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 1); // ignore initials like "A."
}

/** True when the profile name and the bank's account name are clearly the same person. */
export function namesMatch(profileName: string, accountName: string): boolean {
  const mine = words(profileName);
  const bank = new Set(words(accountName));
  if (mine.length === 0 || bank.size === 0) return false;
  const shared = mine.filter((w) => bank.has(w)).length;
  // Two names in common (e.g. first name + surname), or the only name given if the profile has one word.
  return mine.length === 1 ? shared === 1 && bank.size <= 3 : shared >= 2;
}

export function maskAccount(number: string): string {
  return `••••••${number.slice(-4)}`;
}
