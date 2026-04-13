import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import API_URL from '../../utils/apiClient';

const AdminOrdersPage = ({ onNavigate, onSignUp }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      const response = await fetch(`${API_URL}/api/orders`);
      if (response.ok) {
        const data = await response.json();
        setOrders(data);
      } else {
        console.error('Failed to fetch orders');
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId, status) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        loadOrders();
      } else {
        console.error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'processing': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#86868B';
    }
  };

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>Orders</Text>
          <Text style={styles.subtitle}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : orders.length === 0 ? (
          <View style={styles.emptyOrders}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={styles.emptyText}>No orders yet</Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {orders.map((order) => (
              <View key={order.id} style={styles.orderCard}>
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderId}>Order #{order.id}</Text>
                    <Text style={styles.orderCustomer}>{order.customer_name}</Text>
                    <Text style={styles.orderDate}>{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }]}>
                    <Text style={styles.statusText}>{order.status}</Text>
                  </View>
                </View>

                <View style={styles.orderItems}>
                  {order.items && order.items.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemType}>{item.type}</Text>
                      <Text style={styles.itemPrice}>${item.price}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>Total: ${order.total_amount}</Text>
                  <View style={styles.statusActions}>
                    {order.status !== 'completed' && (
                      <TouchableOpacity style={styles.completeBtn} onPress={() => updateOrderStatus(order.id, 'completed')}>
                        <Text style={styles.completeBtnText}>✓ Complete</Text>
                      </TouchableOpacity>
                    )}
                    {order.status !== 'cancelled' && (
                      <TouchableOpacity style={styles.cancelBtn} onPress={() => updateOrderStatus(order.id, 'cancelled')}>
                        <Text style={styles.cancelBtnText}>✕ Cancel</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  scrollView: { flex: 1 },
  header: { backgroundColor: '#FFFFFF', paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 48, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  subtitle: { fontSize: 24, color: '#86868B' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyOrders: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyText: { fontSize: 24, color: '#86868B' },
  ordersList: { paddingHorizontal: 20, paddingBottom: 60, maxWidth: 900, marginHorizontal: 'auto', width: '100%' },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  orderId: { fontSize: 20, fontWeight: '700', color: '#1D1D1F', marginBottom: 4 },
  orderCustomer: { fontSize: 15, color: '#1D1D1F', marginBottom: 4, fontWeight: '500' },
  orderDate: { fontSize: 14, color: '#86868B' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  orderItems: { marginBottom: 20 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', flex: 2 },
  itemType: { fontSize: 14, color: '#86868B', flex: 1 },
  itemPrice: { fontSize: 16, fontWeight: '600', color: '#1D1D1F' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F5F5F7' },
  orderTotal: { fontSize: 22, fontWeight: '700', color: '#1D1D1F' },
  statusActions: { flexDirection: 'row', gap: 10 },
  completeBtn: { backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  completeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cancelBtn: { backgroundColor: '#F5F5F7', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  cancelBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
});

export default AdminOrdersPage;
