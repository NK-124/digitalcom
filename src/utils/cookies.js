// Cookie utility for storing auth and cart data securely
const COOKIE_PATH = '/';

/**
 * Set a cookie
 * @param {string} name - Cookie name
 * @param {string} value - Cookie value
 * @param {number} maxAge - Max age in seconds (default: 30 days for refresh tokens)
 */
export const setCookie = (name, value, maxAge = 60 * 60 * 24 * 30) => {
  const cookieString = `${name}=${encodeURIComponent(value)}; path=${COOKIE_PATH}; max-age=${maxAge}; SameSite=Lax; Secure`;
  document.cookie = cookieString;
};

/**
 * Get a cookie by name
 * @param {string} name - Cookie name
 * @returns {string|null} Cookie value or null
 */
export const getCookie = (name) => {
  const match = document.cookie.match(new RegExp(`(^| )${name}=([^;]+)`));
  return match ? decodeURIComponent(match[2]) : null;
};

/**
 * Remove a cookie
 * @param {string} name - Cookie name
 */
export const removeCookie = (name) => {
  document.cookie = `${name}=; path=${COOKIE_PATH}; max-age=0`;
};
