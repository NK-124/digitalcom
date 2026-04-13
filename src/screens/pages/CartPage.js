import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ScrollView, Modal, TextInput, ActivityIndicator, Platform } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import { useToast } from '../../components/ToastNotification';
import { getCart, removeFromCart, clearCart, getCartCount } from '../../utils/cart';
import { useAuth } from '../../utils/auth';
import API_URL from '../../utils/apiClient';

const CartPage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [cartItems, setCartItems] = useState([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [cardName, setCardName] = useState('');
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const isMobile = screenWidth < 768;

  useEffect(() => {
    // Check if user returned from successful Stripe payment
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      // Payment was successful, save order and clear cart
      // Note: Ideally the backend should handle the redirect logic, but for now we assume success if they returned here.
      // We use a small timeout to ensure Stripe has processed the payment on their end.
      setTimeout(async () => {
        // In a real app, you'd fetch the PaymentIntent status from your backend here.
        // For now, we assume success if the URL param is present and cart is not empty.
        if (cartItems.length > 0) {
           try {
            // You would typically verify this with your backend. 
            // For this demo, we just clear the cart.
            clearCart();
            toast.success('Payment successful! Your order is being processed.');
            // Clean up URL
            window.history.replaceState({}, document.title, '/cart');
          } catch (error) {
            console.error("Error finalizing order:", error);
          }
        }
      }, 1000);
    }

    if (currentUser && currentUser.name && !cardName) {
      setCardName(currentUser.name);
    }
    loadCart();
  }, [currentUser]);

  // Listen for cart updates
  useEffect(() => {
    const handleCartUpdate = () => {
      loadCart();
    };
    window.addEventListener('cartUpdated', handleCartUpdate);
    return () => window.removeEventListener('cartUpdated', handleCartUpdate);
  }, []);

  const loadCart = () => {
    const savedCart = getCart();
    setCartItems(savedCart);
  };

  const handleRemoveFromCart = (productId) => {
    removeFromCart(productId);
    loadCart();
    toast.success('Item removed from cart');
  };

  const handleClearCart = () => {
    clearCart();
    setCartItems([]);
    toast.success('Cart cleared');
  };

  const getTotal = () => {
    return cartItems.reduce((sum, item) => sum + (item.price || 0), 0).toFixed(2);
  };

  const handleCheckout = () => {
    if (cartItems.length === 0) {
      toast.error('Cart is empty');
      return;
    }

    // Check if user is logged in
    if (!currentUser) {
      toast.error('Please login or sign up to checkout');
      // Redirect to Sign Up / Login page
      onSignUp(); 
      return;
    }

    setShowPaymentModal(true);
  };

  const handlePayment = async () => {
    if (!cardName) {
      toast.error('Please enter cardholder name');
      return;
    }

    setProcessing(true);
    try {
      // Step 1: Create Checkout Session on backend
      const response = await fetch(`${API_URL}/api/create-checkout-session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(getTotal()),
          items: cartItems,
          customerName: cardName,
          customerEmail: currentUser?.email || '',
          success_url: window.location.origin,
          cancel_url: window.location.origin
        }),
        credentials: 'include'
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Payment setup failed');
      }

      const { url } = await response.json();

      // Step 2: Redirect to Stripe Checkout
      if (url) {
        window.location.href = url;
      } else {
        throw new Error('No checkout URL received');
      }
      
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(`Payment failed: ${error.message}`);
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Shopping Cart</Text>
        </View>

        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <Text style={styles.emptyCartIcon}>🛍️</Text>
            <Text style={styles.emptyCartText}>Your bag is empty.</Text>
            <TouchableOpacity style={styles.continueButton} onPress={() => onNavigate('home')}>
              <Text style={styles.continueButtonText}>Continue Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.cartContent, isMobile && { flexDirection: 'column' }]}>
            <View style={styles.cartItems}>
              {cartItems.map((item, index) => (
                <View key={`${item.id}-${index}`} style={[styles.cartItem, isMobile && { flexDirection: 'column', alignItems: 'flex-start' }]}>
                  <View style={[isMobile ? { flexDirection: 'row', width: '100%', marginBottom: 15 } : { flexDirection: 'row', flex: 1, alignItems: 'center' }]}>
                    <Image source={{ uri: item.image_url }} style={[styles.cartItemImage, isMobile && { width: 80, height: 80 }]} />
                    <View style={styles.cartItemDetails}>
                      <Text style={styles.cartItemName}>{item.name}</Text>
                      <Text style={styles.cartItemType}>{item.type}</Text>
                      {isMobile && <Text style={styles.cartItemPrice}>${item.price}</Text>}
                    </View>
                  </View>
                  
                  {!isMobile && <Text style={styles.cartItemPrice}>${item.price}</Text>}
                  
                  <View style={[isMobile ? { width: '100%', flexDirection: 'row', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: '#F5F5F7', paddingTop: 10 } : { marginLeft: 30 }]}>
                    <TouchableOpacity style={styles.removeButton} onPress={() => handleRemoveFromCart(item.id)}>
                      <Text style={styles.removeButtonText}>Remove</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>

            <View style={[styles.cartSummary, isMobile && { width: '100%', position: 'relative', top: 0, marginTop: 20 }]}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Subtotal</Text>
                <Text style={styles.summaryValue}>${getTotal()}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Shipping</Text>
                <Text style={styles.summaryValue}>FREE</Text>
              </View>
              <View style={[styles.summaryRow, { borderBottomWidth: 0, marginBottom: 10 }]}>
                <Text style={[styles.summaryLabel, { fontSize: 22, color: '#1D1D1F' }]}>Total</Text>
                <Text style={[styles.summaryValue, { fontSize: 22, color: '#1D1D1F', fontWeight: '700' }]}>${getTotal()}</Text>
              </View>
              
              <TouchableOpacity style={styles.checkoutButton} onPress={handleCheckout}>
                <Text style={styles.checkoutButtonText}>Check Out</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.continueShopping} onPress={() => onNavigate('home')}>
                <Text style={styles.continueShoppingText}>Continue Shopping</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Payment Modal - Stripe Secure Checkout */}
      {showPaymentModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 999999,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 15,
        }} onClick={() => setShowPaymentModal(false)}>
          <div style={{
            position: 'relative',
            backgroundColor: '#FFFFFF',
            borderRadius: 16,
            padding: isMobile ? 20 : 30,
            width: isMobile ? '95%' : '90%',
            maxWidth: 450,
            maxHeight: isMobile ? '80vh' : '90vh',
            overflowY: 'auto',
            boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
          }} onClick={(e) => e.stopPropagation()}>
            <h3 style={{
              fontSize: isMobile ? 20 : 24,
              fontWeight: '700',
              color: '#1D1D1F',
              marginBottom: 10,
              textAlign: 'center',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            }}>💳 Secure Payment</h3>
            
            <p style={{
              fontSize: 14,
              color: '#86868B',
              textAlign: 'center',
              marginBottom: 20,
              lineHeight: 1.5,
            }}>
              You will be redirected to Stripe's secure payment page to complete your purchase safely.
            </p>

            <div style={{
              backgroundColor: '#F5F5F7',
              borderRadius: 12,
              padding: 15,
              marginBottom: 20,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#86868B', fontSize: 14 }}>Total Amount</span>
                <span style={{ fontWeight: '700', color: '#1D1D1F', fontSize: 20 }}>${getTotal()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#86868B', fontSize: 13 }}>Items</span>
                <span style={{ color: '#1D1D1F', fontSize: 13 }}>{cartItems.length}</span>
              </div>
            </div>

            <label style={{
              display: 'block',
              fontSize: 13,
              fontWeight: '600',
              color: '#1D1D1F',
              marginBottom: 8,
            }}>Cardholder Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={cardName}
              onChange={(e) => setCardName(e.target.value)}
              style={{
                width: '100%',
                padding: isMobile ? 10 : 12,
                backgroundColor: '#F5F5F7',
                border: '1px solid #E5E5E5',
                borderRadius: 10,
                fontSize: 15,
                marginBottom: 20,
                boxSizing: 'border-box',
              }}
            />

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setShowPaymentModal(false)}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: isMobile ? 12 : 14,
                  backgroundColor: '#F5F5F7',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: '600',
                  color: '#1D1D1F',
                  cursor: 'pointer',
                }}
              >Cancel</button>
              <button
                onClick={handlePayment}
                disabled={processing}
                style={{
                  flex: 1,
                  padding: isMobile ? 12 : 14,
                  backgroundColor: processing ? '#ccc' : '#0066CC',
                  border: 'none',
                  borderRadius: 10,
                  fontSize: isMobile ? 14 : 15,
                  fontWeight: '600',
                  color: '#FFFFFF',
                  cursor: processing ? 'not-allowed' : 'pointer',
                }}
              >{processing ? 'Processing...' : 'Pay with Stripe'}</button>
            </div>

            <p style={{
              fontSize: 10,
              color: '#86868B',
              textAlign: 'center',
              marginTop: 15,
              fontStyle: 'italic',
              fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
            }}>🔒 Secured by Stripe - Your card details are never shared</p>
          </div>
        </div>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  scrollView: { flex: 1 },
  header: { backgroundColor: '#FFFFFF', paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 48, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  subtitle: { fontSize: 24, color: '#86868B' },
  emptyCart: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyCartIcon: { fontSize: 64, marginBottom: 20 },
  emptyCartText: { fontSize: 24, color: '#86868B', marginBottom: 30 },
  continueButton: { backgroundColor: '#0066CC', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30 },
  continueButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  cartContent: { flexDirection: 'row', gap: 30, paddingHorizontal: 20, paddingBottom: 60, maxWidth: 1200, marginHorizontal: 'auto', width: '100%' },
  cartItems: { flex: 2 },
  cartItem: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, marginBottom: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', alignItems: 'center' },
  cartItemImage: { width: 100, height: 100, borderRadius: 12, backgroundColor: '#F5F5F7', resizeMode: 'cover' },
  cartItemDetails: { flex: 1, marginLeft: 20 },
  cartItemName: { fontSize: 20, fontWeight: '700', color: '#1D1D1F', marginBottom: 8 },
  cartItemType: { fontSize: 14, color: '#86868B', marginBottom: 8 },
  cartItemPrice: { fontSize: 22, fontWeight: '700', color: '#1D1D1F' },
  removeButton: { backgroundColor: '#F5F5F7', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },
  removeButtonText: { color: '#FF3B30', fontSize: 14, fontWeight: '600' },
  cartSummary: { flex: 1, backgroundColor: '#FFFFFF', borderRadius: 24, padding: 30, height: 'fit-content', position: 'sticky', top: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  summaryLabel: { fontSize: 16, color: '#86868B', fontWeight: '500' },
  summaryValue: { fontSize: 16, color: '#1D1D1F', fontWeight: '600' },
  summaryTotal: { fontSize: 28, fontWeight: '700', color: '#1D1D1F' },
  checkoutButton: { backgroundColor: '#0066CC', paddingVertical: 18, borderRadius: 16, alignItems: 'center', marginBottom: 15, shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  checkoutButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  continueShopping: { backgroundColor: 'transparent', paddingVertical: 12, borderRadius: 30, alignItems: 'center', borderWidth: 2, borderColor: '#0066CC' },
  continueShoppingText: { color: '#0066CC', fontSize: 16, fontWeight: '600' },
  modalOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 10000, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 20, width: '95%', maxWidth: 450, margin: 10 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 25, textAlign: 'center' },
  inputLabel: { fontSize: 14, fontWeight: '600', color: '#1D1D1F', marginBottom: 8 },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#1D1D1F', marginBottom: 15, borderWidth: 1, borderColor: '#E5E5E5' },
  row: { flexDirection: 'row', gap: 15 },
  halfInput: { flex: 1 },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#E5E5E5' },
  totalLabel: { fontSize: 18, fontWeight: '600', color: '#1D1D1F' },
  totalAmount: { fontSize: 24, fontWeight: '700', color: '#1D1D1F' },
  modalButtons: { flexDirection: 'row', gap: 12 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  payButton: { flex: 1, backgroundColor: '#10B981', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  payButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  testNotice: { fontSize: 11, color: '#86868B', textAlign: 'center', marginTop: 15, fontStyle: 'italic' },
});

export default CartPage;
