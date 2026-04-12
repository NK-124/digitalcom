import { getCookie, setCookie, removeCookie } from './cookies';

const CART_COOKIE_NAME = 'digitalcom_cart';

export const addToCart = (product) => {
  const cart = getCart();

  // Check if already in cart
  const existingIndex = cart.findIndex(item => item.id === product.id);
  if (existingIndex >= 0) {
    cart[existingIndex] = { ...cart[existingIndex], ...product };
  } else {
    cart.push(product);
  }

  setCookie(CART_COOKIE_NAME, JSON.stringify(cart));

  // Dispatch storage event so navbar and other components update
  window.dispatchEvent(new Event('storage'));
  window.dispatchEvent(new CustomEvent('cartUpdated'));
};

export const getCart = () => {
  try {
    return JSON.parse(getCookie(CART_COOKIE_NAME) || '[]');
  } catch (e) {
    return [];
  }
};

export const removeFromCart = (productId) => {
  const cart = getCart();
  const updatedCart = cart.filter(item => item.id !== productId);
  setCookie(CART_COOKIE_NAME, JSON.stringify(updatedCart));
  window.dispatchEvent(new CustomEvent('cartUpdated'));
};

export const clearCart = () => {
  removeCookie(CART_COOKIE_NAME);
  window.dispatchEvent(new CustomEvent('cartUpdated'));
};

export const getCartCount = () => {
  const cart = getCart();
  return cart.length;
};
