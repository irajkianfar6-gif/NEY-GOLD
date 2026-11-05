import test from 'node:test';
import assert from 'node:assert/strict';
import {
  toFa,
  toEn,
  fmt,
  PRODUCTS,
  filterAndSortProducts,
  searchProducts,
  addOrIncrementCartItem,
  updateCartItemQty,
  calcSubtotal,
  calcShippingCost,
  validateCheckoutForm,
  mulberry,
  D,
  circ,
} from './storeLogic';

test('Persian and English numeral conversion works accurately', () => {
  assert.equal(toFa(1405), '۱۴۰۵');
  assert.equal(toEn('۰۹۱۲۳۴۵۶۷۸۹'), '09123456789');
  assert.equal(fmt(48500000), '۴۸٬۵۰۰٬۰۰۰ تومان');
});

test('Product filtering and sorting works for category, gold, gem, and price', () => {
  const rings = filterAndSortProducts(PRODUCTS, {
    cat: 'rings',
    gold: null,
    gem: null,
    sort: 'low',
  });
  assert.equal(rings.length, 3);
  assert.equal(rings[0].id, 2); // 36,800,000
  assert.equal(rings[2].id, 1); // 48,500,000

  const rubyRose = filterAndSortProducts(PRODUCTS, {
    cat: 'all',
    gold: 'r',
    gem: 'ruby',
    sort: 'rec',
  });
  assert.equal(rubyRose.length, 3);
  assert.ok(rubyRose.every((p) => p.gold === 'r' && p.gem === 'ruby'));
});

test('Search returns matching products or featured products on empty query', () => {
  const featured = searchProducts('');
  assert.ok(featured.length >= 6);
  const emerald = searchProducts('زمرد');
  assert.equal(emerald.length, 4);
});

test('Cart item addition, quantity clamping, subtotal, and shipping calculation', () => {
  let cart = addOrIncrementCartItem([], 1, 'y', '۵۲', 1);
  assert.equal(cart.length, 1);
  assert.equal(cart[0].qty, 1);
  assert.equal(calcSubtotal(cart), 48500000);
  // 48.5M is under 50M threshold -> post shipping costs 350,000
  assert.equal(calcShippingCost(calcSubtotal(cart), 'post'), 350000);

  cart = addOrIncrementCartItem(cart, 1, 'y', '۵۲', 1);
  assert.equal(cart[0].qty, 2);
  assert.equal(calcSubtotal(cart), 97000000);
  // Over 50M threshold -> post shipping is free (0), courier is 450,000
  assert.equal(calcShippingCost(calcSubtotal(cart), 'post'), 0);
  assert.equal(calcShippingCost(calcSubtotal(cart), 'courier'), 450000);

  cart = updateCartItemQty(cart, '1|y|۵۲', -2);
  assert.equal(cart.length, 0);
});

test('Checkout form validation enforces name, Iranian mobile format, city, and address', () => {
  const invalid = validateCheckoutForm({
    name: 'ال',
    phone: '12345',
    city: 'ت',
    addr: 'کوتاه',
  });
  assert.equal(invalid.valid, false);
  assert.equal(invalid.errors.name, true);
  assert.equal(invalid.errors.phone, true);
  assert.equal(invalid.errors.city, true);
  assert.equal(invalid.errors.addr, true);

  const valid = validateCheckoutForm({
    name: 'سارا محمدی',
    phone: '۰۹۱۲۳۴۵۶۷۸۹',
    city: 'تهران',
    addr: 'خیابان ولیعصر، بالاتر از پارک ساعی، پلاک ۱۲',
  });
  assert.equal(valid.valid, true);
});

test('Procedural geometry helpers produce valid closed SVG paths', () => {
  const R = mulberry(42);
  assert.ok(R() >= 0 && R() <= 1);
  const c = circ(0, 0, 10, 8);
  const path = D(c);
  assert.ok(path.startsWith('M'));
  assert.ok(path.endsWith('Z'));
});
