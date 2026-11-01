import Link from "next/link";
import { BRAND } from "@/lib/config";
import { ThemeToggle } from "./ThemeToggle";

export function Footer() {
  return (
    <>
      <section className="strip">
        <div className="wrap">
          <div>
            <h3>Free to sell</h3>
            <p>No listing fees. Sellers keep 100% of the item price.</p>
          </div>
          <div>
            <h3>Buyer protection</h3>
            <p>A small fee on each order covers refunds if something goes wrong.</p>
          </div>
          <div>
            <h3>Delivery booked for you</h3>
            <p>Riders for parcels, vans for furniture and appliances.</p>
          </div>
          <div>
            <h3>Chat stays in the app</h3>
            <p>No sharing numbers or paying off-app, so scams have nowhere to hide.</p>
          </div>
        </div>
      </section>
      <footer className="site-footer">
        <div className="wrap">
          <div>
            <span className="logo">
              <i />
              {BRAND.name}
            </span>
            <p>
              {BRAND.name} means {BRAND.meaning}. Buy and sell pre-loved fashion, furniture and appliances, direct from
              sellers across Nigeria.
            </p>
            <ThemeToggle />
          </div>
          <div>
            <h4>Shop</h4>
            <ul>
              <li><Link href="/?dept=women">Women</Link></li>
              <li><Link href="/?dept=men">Men</Link></li>
              <li><Link href="/?dept=kids">Kids</Link></li>
              <li><Link href="/?dept=home">Home &amp; furniture</Link></li>
              <li><Link href="/?dept=appliances">Appliances</Link></li>
            </ul>
          </div>
          <div>
            <h4>Account</h4>
            <ul>
              <li><Link href="/orders">My orders</Link></li>
              <li><Link href="/saved">Saved items</Link></li>
              <li><Link href="/sell">Sell an item</Link></li>
              <li><Link href="/settings">Settings</Link></li>
            </ul>
          </div>
          <div>
            <h4>Help</h4>
            <ul>
              <li><Link href="/help/buyer-protection">Buyer protection</Link></li>
              <li><Link href="/help/buyer-protection#delivery">Delivery and returns</Link></li>
              <li><Link href="/help/buyer-protection#safety">Safety tips</Link></li>
            </ul>
          </div>
        </div>
        <p className="fine wrap">
          Early preview. Payments are not switched on yet, so nothing can be bought for real. Buyer protection is ₦300 + 5%
          of the item price.
        </p>
      </footer>
    </>
  );
}
