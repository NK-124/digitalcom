import { getCart, clearCart } from './cart';
import { apiClient } from './apiClient';

/**
 * Sync local cart (cookies) with database cart after login
 * Merges items instead of overwriting
 * 
 * Call this after successful login/signup
 */
export const syncCartAfterLogin = async (userEmail) => {
  try {
    // Get local cart items
    const localCart = getCart();
    
    if (localCart.length === 0) {
      // No local items, nothing to sync
      return { success: true, synced: false };
    }

    // Fetch existing database cart
    let dbCart = [];
    try {
      const response = await apiClient(`/api/cart?email=${encodeURIComponent(userEmail)}`);
      dbCart = Array.isArray(response) ? response : [];
    } catch (error) {
      // No existing cart or endpoint doesn't exist - that's ok
      console.log('No existing database cart found');
    }

    // Merge: add local items to database cart
    const mergedCart = [...dbCart];
    
    localCart.forEach(localItem => {
      const existingIndex = mergedCart.findIndex(dbItem => dbItem.id === localItem.id);
      
      if (existingIndex >= 0) {
        // Item exists - keep database version (or could merge quantities)
        // For now, skip to avoid duplicates
        console.log(`Item ${localItem.id} already in database cart, skipping`);
      } else {
        // New item - add to merged cart
        mergedCart.push(localItem);
      }
    });

    // Save merged cart to database
    if (mergedCart.length > 0) {
      await apiClient('/api/cart', {
        method: 'POST',
        body: {
          email: userEmail,
          items: mergedCart,
        },
      });
    }

    // Clear local cart after successful sync
    clearCart();

    console.log(`Cart synced: ${localCart.length} local items merged with ${dbCart.length} database items`);
    
    return { 
      success: true, 
      synced: true,
      localItems: localCart.length,
      dbItems: dbCart.length,
      mergedItems: mergedCart.length
    };
  } catch (error) {
    console.error('Cart sync failed:', error);
    // Don't throw - cart sync failure shouldn't break login
    return { success: false, error };
  }
};
