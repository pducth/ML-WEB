import type { StoreSettings } from '../models';

export interface FaqGroup {
  title: string;
  items: Array<{ q: string; a: string }>;
}

/** FAQs, grouped by what a shopper is trying to do. Figures come from the store settings so they never go stale.
 *  Shared by the FAQ page and the chat assistant, so both always say the same thing. */
export function buildFaqGroups(s: StoreSettings): FaqGroup[] {
  const fee = `$${s.shippingFee.toFixed(2)}`;
  return [
    {
      title: 'Orders & payment',
      items: [
        { q: 'How do I place an order?', a: 'Add products to your bag and go to checkout. You need to be signed in so the order is saved to your account, where you can track, cancel or return it.' },
        { q: 'Which payment methods do you accept?', a: `Cash on delivery, or bank transfer and QR in US dollars. For a bank transfer, scan the QR code and pay within ${s.paymentTimeoutMinutes} minutes. After that the QR code expires, the order is not placed and any discount code is returned. Go back to checkout to try again or choose cash on delivery.` },
        { q: 'Can I use a discount code?', a: 'Yes, one code per order, and the discount never exceeds your product subtotal. New customers can use WELCOME10 for 10% off their first order.' },
        { q: 'Are prices in US dollars?', a: 'Yes. Prices are listed in USD per size and include applicable taxes. The price, size and discount at the moment you order are locked on your receipt.' },
      ],
    },
    {
      title: 'Shipping & tracking',
      items: [
        { q: 'How much is shipping and how long does it take?', a: `Shipping is a flat ${fee} per order. Delivery is estimated at 3 to 5 business days.` },
        { q: 'How can I track my order?', a: 'Open My orders in your account menu. Each order shows its status and a shipping timeline.' },
      ],
    },
    {
      title: 'Cancellations & returns',
      items: [
        { q: 'Can I cancel an order?', a: 'Yes, until it ships. Orders that are shipping or delivered can no longer be cancelled. Paid orders that are cancelled are refunded in full.' },
        { q: 'How do returns work?', a: `Request a return from your order page within ${s.returnWindowDays} days after delivery. Returns cover the whole order and products must be unopened with the original seal, unless an item arrived defective or was not what you ordered.` },
        { q: 'How much will I be refunded?', a: `Once a return is approved you receive the order total minus the ${fee} shipping fee. If the store made a mistake, shipping is refunded too.` },
      ],
    },
    {
      title: 'Hair Quiz & routines',
      items: [
        { q: 'How does the Hair Quiz work?', a: 'Answer seven short questions and one optional one about your scalp, strands, color history, washing and goal. We match you with a four-step routine: cleanse, condition, treat and style, built only from products that are in stock.' },
        { q: 'Is the quiz a medical diagnosis?', a: 'No. Results are for cosmetic beauty consultation and do not replace professional dermatological diagnosis or medical treatment.' },
        { q: 'Is my quiz data private?', a: 'Quiz statistics record only the time, hair-need labels and ruleset version, never your answers or identity. Your routine is kept in your account only if you choose Save to Hair Profile.' },
        { q: 'Why does my routine show a substitute?', a: 'When a recommended product is out of stock we swap in an equivalent with the same benefits and mark it as a substitute.' },
      ],
    },
    {
      title: 'Account & wishlist',
      items: [
        { q: 'How do I save products for later?', a: 'Tap the heart on any product. Your saved products are in Wishlist, in your account menu.' },
        { q: 'I forgot my password.', a: 'Choose Forgot password on the sign-in page. We send a one-time code to your email so you can set a new one.' },
        { q: 'Who can write a review?', a: 'Only customers with a delivered order can review a product, so every review comes from a verified purchase.' },
      ],
    },
  ];
}
