// Delivery options and prices. These are placeholder quotes until the Shipbubble API is connected.

export type DeliveryOption = { key: string; label: string; detail: string; kobo: number };

export function deliveryOptions(bulky: boolean, city: string, area: string | null): DeliveryOption[] {
  const lagos = city === "Lagos";
  if (bulky) {
    return [
      { key: "van", label: "Van delivery to your door", detail: `Within ${city} · 1–3 days · 2 handlers`, kobo: (lagos ? 15000 : 18000) * 100 },
      { key: "intercity_van", label: "Van to another city", detail: "Partner haulage · 3–7 days", kobo: 45000 * 100 },
      { key: "self_pickup", label: "I'll pick it up myself", detail: `From ${area ?? city} · payment still held until you confirm`, kobo: 0 },
    ];
  }
  return [
    { key: "rider", label: "Dispatch rider to your door", detail: lagos ? "Within Lagos · same or next day" : `${city} riders · 1–2 days`, kobo: (lagos ? 2500 : 2800) * 100 },
    { key: "courier", label: "Courier to another city", detail: "Partner courier · 2–5 days", kobo: 4500 * 100 },
    { key: "pickup_point", label: "Pickup point", detail: "Collect from a partner shop near you", kobo: 1500 * 100 },
  ];
}
