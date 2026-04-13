import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import { useToast } from '../../components/ToastNotification';
import { useAuth } from '../../utils/auth';
import API_URL from '../../utils/apiClient';

const MyOrdersPage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const { user: currentUser, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
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
    if (!authLoading) {
      if (!currentUser) {
        toast.error('Please login to view your orders');
        onNavigate('home');
        return;
      }
      loadOrders(currentUser.email);
    }
  }, [currentUser, authLoading]);

  const loadOrders = async (email) => {
    try {
      const response = await fetch(`${API_URL}/api/user-orders?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Orders loaded:', data);
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

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#10B981';
      case 'processing': return '#F59E0B';
      case 'cancelled': return '#EF4444';
      default: return '#86868B';
    }
  };

  const getItemType = (item) => {
    if (!item.type) return 'unknown';
    return item.type.toLowerCase();
  };

  const getFilteredOrders = () => {
    if (activeTab === 'all') return orders;
    return orders.filter(order => 
      order.items && order.items.some(item => getItemType(item) === activeTab)
    );
  };

  const filteredOrders = getFilteredOrders();

  const tabs = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'gift card', label: 'Gift Cards', icon: '🎁' },
    { id: 'ebook', label: 'eBooks', icon: '📚' },
    { id: 'template', label: 'Templates', icon: '🎨' },
    { id: 'course', label: 'Courses', icon: '🎓' },
  ];

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, isMobile && styles.headerMobile]}>
          <Text style={[styles.title, isMobile && { fontSize: 32, marginBottom: 6 }]}>My Orders</Text>
          <Text style={[styles.subtitle, isMobile && { fontSize: 16 }]}>{orders.length} order{orders.length !== 1 ? 's' : ''}</Text>
        </View>

        {/* Category Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={[styles.tabsContainer, isMobile && styles.tabsContainerMobile]}>
          {tabs.map((tab) => (
            <TouchableOpacity
              key={tab.id}
              style={[styles.tab, activeTab === tab.id && styles.tabActive, isMobile && styles.tabMobile]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : filteredOrders.length === 0 ? (
          <View style={[styles.emptyOrders, isMobile && { paddingVertical: 60 }]}>
            <Text style={styles.emptyIcon}>📦</Text>
            <Text style={[styles.emptyText, isMobile && { fontSize: 18 }]}>No orders found</Text>
            <TouchableOpacity style={[styles.shopButton, isMobile && { paddingHorizontal: 25 }]} onPress={() => onNavigate('home')}>
              <Text style={[styles.shopButtonText, isMobile && { fontSize: 15 }]}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={[styles.ordersList, isMobile && { paddingHorizontal: 10 }]}>
            {filteredOrders.map((order) => (
              <View key={order.id} style={[styles.orderCard, isMobile && { padding: 15, marginHorizontal: 5, marginBottom: 12 }]}>
                <View style={[styles.orderHeader, isMobile && { flexDirection: 'column', gap: 10, marginBottom: 12 }]}>
                  <View>
                    <Text style={[styles.orderId, isMobile && { fontSize: 16 }]}>Order #{order.id}</Text>
                    <Text style={[styles.orderDate, isMobile && { fontSize: 12 }]}>{new Date(order.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</Text>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: getStatusColor(order.status) }, isMobile && { alignSelf: 'flex-start' }]}>
                    <Text style={[styles.statusText, isMobile && { fontSize: 11 }]}>{order.status}</Text>
                  </View>
                </View>

                {order.items && order.items.map((item, index) => {
                  const itemType = getItemType(item);
                  return (
                    <View key={index} style={[styles.orderItem, isMobile && { flexDirection: 'column', alignItems: 'flex-start', gap: 10, paddingVertical: 10 }]}>
                      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, width: '100%' }]}>
                        {item.image_url && (
                          <Image source={{ uri: item.image_url }} style={[styles.itemImage, isMobile && { width: 60, height: 60 }]} />
                        )}
                        <View style={[styles.itemInfo, isMobile && { marginLeft: 0 }]}>
                          <Text style={[styles.itemName, isMobile && { fontSize: 14 }]}>{item.name}</Text>
                          <Text style={[styles.itemType, isMobile && { fontSize: 12, marginBottom: 2 }]}>{item.type}</Text>
                          <Text style={[styles.itemPrice, isMobile && { fontSize: 14 }]}>${item.price}</Text>
                        </View>
                      </View>
                      <View style={[styles.deliverableSection, isMobile && { alignItems: 'flex-start', width: '100%', minWidth: 'unset' }]}>
                        {itemType === 'ebook' && order.pdf_url ? (
                          <View style={[styles.readyBadge, isMobile && { paddingHorizontal: 10, paddingVertical: 6 }]}>
                            <TouchableOpacity onPress={() => onNavigate('my-downloads')}>
                              <Text style={[styles.readyBadgeText, isMobile && { fontSize: 11 }]}>📥 Check Download Page</Text>
                            </TouchableOpacity>
                          </View>
                        ) : itemType === 'ebook' ? (
                          <View style={styles.pendingBadge}><Text style={[styles.pendingText, isMobile && { fontSize: 10 }]}>Pending</Text></View>
                        ) : null}

                        {itemType === 'gift card' && order.image_url ? (
                          <View style={[styles.readyBadge, isMobile && { paddingHorizontal: 10, paddingVertical: 6 }]}>
                            <TouchableOpacity onPress={() => onNavigate('my-downloads')}>
                              <Text style={[styles.readyBadgeText, isMobile && { fontSize: 11 }]}>📥 Check Download Page</Text>
                            </TouchableOpacity>
                          </View>
                        ) : itemType === 'gift card' ? (
                          <View style={styles.pendingBadge}><Text style={[styles.pendingText, isMobile && { fontSize: 10 }]}>Pending</Text></View>
                        ) : null}

                        {itemType === 'course' && order.video_url ? (
                          <View style={[styles.readyBadge, isMobile && { paddingHorizontal: 10, paddingVertical: 6 }]}>
                            <TouchableOpacity onPress={() => onNavigate('my-downloads')}>
                              <Text style={[styles.readyBadgeText, isMobile && { fontSize: 11 }]}>📥 Check Download Page</Text>
                            </TouchableOpacity>
                          </View>
                        ) : itemType === 'course' ? (
                          <View style={styles.pendingBadge}><Text style={[styles.pendingText, isMobile && { fontSize: 10 }]}>Pending</Text></View>
                        ) : null}

                        {itemType === 'template' && (
                          <View style={styles.deliverableTag}><Text style={[styles.deliverableTagText, isMobile && { fontSize: 10 }]}>📦 Digital Product</Text></View>
                        )}
                      </View>
                    </View>
                  );
                })}

                <View style={[styles.orderFooter, isMobile && { paddingTop: 10 }]}>
                  <Text style={[styles.orderTotal, isMobile && { fontSize: 18 }]}>Total: ${order.total_amount}</Text>
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
  headerMobile: { paddingVertical: 40, paddingHorizontal: 15, marginBottom: 12 },
  title: { fontSize: 48, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  subtitle: { fontSize: 24, color: '#86868B' },
  tabsContainer: { backgroundColor: '#FFFFFF', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5E5', marginBottom: 20 },
  tabsContainerMobile: { paddingVertical: 10, paddingHorizontal: 10, marginBottom: 12 },
  tab: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, backgroundColor: '#F5F5F7', marginRight: 10 },
  tabMobile: { marginRight: 8, paddingHorizontal: 12, paddingVertical: 8 },
  tabActive: { backgroundColor: '#0066CC' },
  tabIcon: { fontSize: 16, marginRight: 6 },
  tabText: { fontSize: 14, color: '#1D1D1F', fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyOrders: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyText: { fontSize: 24, color: '#86868B', marginBottom: 30 },
  shopButton: { backgroundColor: '#0066CC', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30 },
  shopButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  ordersList: { paddingHorizontal: 20, paddingBottom: 60, maxWidth: 900, marginHorizontal: 'auto', width: '100%' },
  orderCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 24, marginBottom: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  orderId: { fontSize: 20, fontWeight: '700', color: '#1D1D1F', marginBottom: 4 },
  orderDate: { fontSize: 14, color: '#86868B' },
  statusBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
  statusText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600', textTransform: 'capitalize' },
  orderItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7', gap: 15 },
  itemImage: { width: 80, height: 80, borderRadius: 12, backgroundColor: '#F5F5F7', resizeMode: 'cover' },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginBottom: 4 },
  itemType: { fontSize: 14, color: '#86868B', marginBottom: 4 },
  itemPrice: { fontSize: 16, fontWeight: '600', color: '#1D1D1F' },
  deliverableSection: { alignItems: 'flex-end', gap: 8, minWidth: 160 },
  readyBadge: { backgroundColor: '#10B981', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  readyBadgeText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  pendingBadge: { backgroundColor: '#F5F5F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  pendingText: { fontSize: 12, color: '#F59E0B', fontWeight: '600' },
  deliverableTag: { backgroundColor: '#E5F0FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10 },
  deliverableTagText: { fontSize: 12, color: '#0066CC', fontWeight: '600' },
  orderFooter: { paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F5F5F7' },
  orderTotal: { fontSize: 22, fontWeight: '700', color: '#1D1D1F' },
});

export default MyOrdersPage;
