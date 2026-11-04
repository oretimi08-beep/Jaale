import { describe, expect, it } from "vitest";
import { deviceName, newMessage, newOffer, offerAnswered, orderNote, short } from "./notifications";

const N = (naira: number) => naira * 100;

describe("short", () => {
  it("leaves short text alone", () => expect(short("Hi there")).toBe("Hi there"));
  it("cuts long text on a word", () => expect(short("one two three four five six", 15)).toBe("one two three…"));
  it("tidies spaces and new lines", () => expect(short("hi\n\n  there")).toBe("hi there"));
});

describe("notification wording", () => {
  it("names the sender by first name and opens the chat", () => {
    const n = newMessage({ from: "Adaeze Okafor", item: "Zara dress", text: "Is it still available?", conversationId: "c1" });
    expect(n.title).toBe("Adaeze sent you a message");
    expect(n.body).toContain("Is it still available?");
    expect(n.url).toBe("/messages/c1");
    expect(n.kind).toBe("messages");
  });

  it("shows the offer amount in naira", () => {
    const n = newOffer({ from: "Tunde Bello", item: "LG fridge", kobo: N(150_000), counter: false, conversationId: "c2" });
    expect(n.title).toBe("New offer: ₦150,000");
    expect(n.kind).toBe("offers");
    expect(newOffer({ from: "Seller", item: "x", kobo: N(1000), counter: true, conversationId: "c2" }).title).toBe("Counter-offer: ₦1,000");
  });

  it("tells a buyer they can now buy at the accepted price", () => {
    const n = offerAnswered({ from: "Ngozi", item: "Sofa", kobo: N(80_000), answer: "accepted", youAreBuyer: true, conversationId: "c3" });
    expect(n.title).toBe("Offer accepted: ₦80,000");
    expect(n.body).toContain("Buy it now");
  });

  it("covers every order event with a link to the order", () => {
    const events = ["sold", "shipped", "delivered", "confirmed", "reported", "cancelled", "released", "decided_refund_buyer", "decided_refund_seller", "decided_release_buyer", "decided_release_seller", "paid_out"] as const;
    for (const e of events) {
      const n = orderNote(e, { item: "Blender", kobo: N(20_000), orderId: "o1" });
      expect(n.title.length).toBeGreaterThan(3);
      expect(n.url).toBe("/orders/o1");
      expect(n.kind).toBe("orders");
    }
    expect(orderNote("sold", { item: "Blender", kobo: N(20_000), orderId: "o1" }).body).toContain("₦20,000");
  });
});

describe("deviceName", () => {
  it("recognises common phones", () => {
    expect(deviceName("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit Version/17.0 Mobile Safari/604.1")).toBe("iPhone · Safari");
    expect(deviceName("Mozilla/5.0 (Linux; Android 14) AppleWebKit Chrome/120.0 Mobile Safari/537.36")).toBe("Android · Chrome");
  });
});
