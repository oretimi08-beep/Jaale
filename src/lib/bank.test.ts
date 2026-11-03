import { describe, expect, it } from "vitest";
import { maskAccount, namesMatch } from "./bank";

describe("bank account name check", () => {
  it.each([
    ["Timi Ore", "ORE TIMI"],
    ["Folarin Oluwatimilehin", "OLUWATIMILEHIN FOLARIN ADEBAYO"],
    ["Tolu Adeyemi", "ADEYEMI TOLULOPE TOLU"],
    ["Chiamaka O. Nwosu", "NWOSU CHIAMAKA OGECHI"],
    ["Oládiípò Bello", "BELLO OLADIIPO"],
  ])("accepts %j for bank name %j", (profile, bank) => {
    expect(namesMatch(profile, bank)).toBe(true);
  });

  it.each([
    ["Timi Ore", "ADEYEMI TOLU"],
    ["Timi Ore", "ORE CHUKWUMA"], // same surname, different person
    ["Tolu's Closet", "ADEYEMI TOLU"], // shop names aren't bank names
    ["", "ORE TIMI"],
  ])("rejects %j for bank name %j", (profile, bank) => {
    expect(namesMatch(profile, bank)).toBe(false);
  });

  it("hides all but the last 4 digits", () => {
    expect(maskAccount("0123456789")).toBe("••••••6789");
  });
});
