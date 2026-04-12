import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import { useToast } from '../../components/ToastNotification';
import { useAuth } from '../../utils/auth';

const MyDownloadsPage = ({ onNavigate, onSignUp }) => {
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
        toast.error('Please login to view your downloads');
        onNavigate('home');
        return;
      }
      loadOrders(currentUser.email);
    }
  }, [currentUser, authLoading]);

  const loadOrders = async (email) => {
    try {
      const response = await fetch(`http://localhost:8000/api/user-orders?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        console.log('User orders:', data);
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

  // Flatten all deliverables from orders
  const getDeliverables = () => {
    const deliverables = [];
    
    console.log('=== Processing Orders for Downloads ===');
    console.log('Total orders:', orders.length);
    
    orders.forEach(order => {
      console.log('Order:', order.id, 'Items:', order.items);
      console.log('  PDF URL:', order.pdf_url);
      console.log('  Image URL:', order.image_url);
      console.log('  Video URL:', order.video_url);
      
      order.items && order.items.forEach(item => {
        const itemType = item.type ? item.type.toLowerCase() : '';
        console.log('  Item:', item.name, 'Type:', item.type, '(lowercase:', itemType + ')');
        
        // Add ALL available deliverables for this order
        // PDF deliverable
        if (order.pdf_url) {
          deliverables.push({
            id: `pdf-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'pdf',
            icon: '📄',
            url: order.pdf_url,
            date: order.created_at,
            status: 'ready'
          });
        } else if (['ebook', 'book'].includes(itemType)) {
          deliverables.push({
            id: `pdf-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'pdf',
            icon: '📄',
            url: null,
            date: order.created_at,
            status: 'pending'
          });
        }
        
        // Image deliverable
        if (order.image_url) {
          deliverables.push({
            id: `img-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'image',
            icon: '🖼️',
            url: order.image_url,
            date: order.created_at,
            status: 'ready'
          });
        } else if (['gift card', 'giftcard'].includes(itemType)) {
          deliverables.push({
            id: `img-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'image',
            icon: '🖼️',
            url: null,
            date: order.created_at,
            status: 'pending'
          });
        }
        
        // Video deliverable
        if (order.video_url) {
          deliverables.push({
            id: `vid-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'video',
            icon: '🎥',
            url: order.video_url,
            date: order.created_at,
            status: 'ready'
          });
        } else if (['course'].includes(itemType)) {
          deliverables.push({
            id: `vid-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'video',
            icon: '🎥',
            url: null,
            date: order.created_at,
            status: 'pending'
          });
        }
        
        // ZIP deliverable
        if (order.zip_url) {
          deliverables.push({
            id: `zip-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'zip',
            icon: '📦',
            url: order.zip_url,
            date: order.created_at,
            status: 'ready'
          });
        }

        // Templates (link to GitHub)
        if (itemType === 'template') {
          deliverables.push({
            id: `tpl-${order.id}`,
            orderId: order.id,
            name: item.name,
            type: 'template',
            icon: '🎨',
            url: item.github_url || null,
            date: order.created_at,
            status: 'ready'
          });
        }
      });
    });
    
    console.log('Total deliverables found:', deliverables.length);
    console.log('Deliverables:', deliverables);
    return deliverables;
  };

  const allDeliverables = getDeliverables();

  const tabs = [
    { id: 'all', label: 'All', icon: '📦' },
    { id: 'pdf', label: 'PDFs', icon: '📄' },
    { id: 'image', label: 'Images', icon: '🖼️' },
    { id: 'video', label: 'Videos', icon: '🎥' },
    { id: 'zip', label: 'ZIPs', icon: '📦' },
  ];

  const filteredDeliverables = activeTab === 'all' 
    ? allDeliverables 
    : allDeliverables.filter(d => d.type === activeTab);

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>My Downloads</Text>
          <Text style={styles.subtitle}>{allDeliverables.filter(d => d.status === 'ready').length} ready to download</Text>
        </View>

        {/* Category Tabs */}
        <View style={[styles.tabsContainer, isMobile && styles.tabsContainerMobile]}>
          {tabs.map((tab, index) => (
            <TouchableOpacity
              key={tab.id}
              style={[
                styles.tab, 
                activeTab === tab.id && styles.tabActive,
                isMobile && (index === 4 ? styles.tabFullWidth : styles.tabHalfWidth)
              ]}
              onPress={() => setActiveTab(tab.id)}
            >
              <Text style={styles.tabIcon}>{tab.icon}</Text>
              <Text style={[styles.tabText, activeTab === tab.id && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : filteredDeliverables.length === 0 ? (
          <View style={styles.emptyDownloads}>
            <Text style={styles.emptyIcon}>📥</Text>
            <Text style={styles.emptyText}>No downloads available yet</Text>
            <TouchableOpacity style={styles.shopButton} onPress={() => onNavigate('home')}>
              <Text style={styles.shopButtonText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.downloadsList}>
            {filteredDeliverables.map((item, index) => (
              <View key={item.id} style={styles.downloadCard}>
                <View style={styles.cardIcon}>
                  <Text style={styles.iconText}>{item.icon}</Text>
                </View>
                <View style={styles.cardInfo}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemType}>{item.type.toUpperCase()}</Text>
                  <Text style={styles.itemDate}>{new Date(item.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
                </View>
                <View style={styles.cardActions}>
                  {item.status === 'ready' ? (
                    <TouchableOpacity
                      style={styles.downloadBtn}
                      onPress={async () => {
                        try {
                          // Fetch file and create blob for download
                          const response = await fetch(item.url);
                          if (!response.ok) throw new Error('Download failed');
                          
                          const blob = await response.blob();
                          const blobUrl = window.URL.createObjectURL(blob);
                          
                          // Create download link
                          const link = document.createElement('a');
                          link.href = blobUrl;
                          let extension = '';
                          if (item.type === 'pdf') extension = '.pdf';
                          else if (item.type === 'image') extension = '.jpg';
                          else if (item.type === 'video') extension = '.mp4';
                          else if (item.type === 'zip') extension = '.zip';
                          
                          link.download = item.name + extension;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(blobUrl);
                        } catch (error) {
                          console.error('Download error:', error);
                          toast.error('Download failed. Please try again.');
                        }
                      }}
                    >
                      <Text style={styles.downloadBtnText}>📥 Download</Text>
                    </TouchableOpacity>
                  ) : (
                    <View style={styles.pendingBadge}>
                      <Text style={styles.pendingText}>⏳ Pending</Text>
                    </View>
                  )}
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
  tabsContainer: { 
    backgroundColor: '#FFFFFF', 
    paddingVertical: 15, 
    paddingHorizontal: 20, 
    borderBottomWidth: 1, 
    borderBottomColor: '#E5E5E5', 
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center'
  },
  tabsContainerMobile: {
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    paddingHorizontal: 10
  },
  tab: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center',
    paddingHorizontal: 16, 
    paddingVertical: 10, 
    borderRadius: 20, 
    backgroundColor: '#F5F5F7', 
    marginRight: 10 
  },
  tabHalfWidth: {
    width: '45%',
    marginRight: 0,
    marginBottom: 5
  },
  tabFullWidth: {
    width: '92%',
    marginRight: 0,
    marginTop: 5
  },
  tabActive: { backgroundColor: '#0066CC' },
  tabIcon: { fontSize: 16, marginRight: 6 },
  tabText: { fontSize: 14, color: '#1D1D1F', fontWeight: '500' },
  tabTextActive: { color: '#FFFFFF', fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyDownloads: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyIcon: { fontSize: 64, marginBottom: 20 },
  emptyText: { fontSize: 24, color: '#86868B', marginBottom: 30 },
  shopButton: { backgroundColor: '#0066CC', paddingHorizontal: 40, paddingVertical: 16, borderRadius: 30 },
  shopButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  downloadsList: { paddingHorizontal: 20, paddingBottom: 60, maxWidth: 900, marginHorizontal: 'auto', width: '100%' },
  downloadCard: { flexDirection: 'row', backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, marginBottom: 15, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', alignItems: 'center' },
  cardIcon: { width: 60, height: 60, borderRadius: 30, backgroundColor: '#F5F5F7', justifyContent: 'center', alignItems: 'center', marginRight: 20 },
  iconText: { fontSize: 28 },
  cardInfo: { flex: 1 },
  itemName: { fontSize: 18, fontWeight: '700', color: '#1D1D1F', marginBottom: 4 },
  itemType: { fontSize: 13, color: '#86868B', marginBottom: 4, fontWeight: '600' },
  itemDate: { fontSize: 13, color: '#86868B' },
  cardActions: { alignItems: 'flex-end' },
  downloadBtn: { backgroundColor: '#0066CC', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  downloadBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  pendingBadge: { backgroundColor: '#F5F5F7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 12 },
  pendingText: { fontSize: 13, color: '#F59E0B', fontWeight: '600' },
});

export default MyDownloadsPage;
