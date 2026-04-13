import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, ActivityIndicator, TouchableOpacity, Image, Modal, TextInput } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import { useToast } from '../../components/ToastNotification';
import API_URL from '../../utils/apiClient';

const AdminOrdersPage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [pdfFile, setPdfFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  const [videoFile, setVideoFile] = useState(null);
  const [zipFile, setZipFile] = useState(null);

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
        toast.success('Order updated');
      } else {
        toast.error('Failed to update order');
      }
    } catch (error) {
      console.error('Error updating order:', error);
      toast.error('Error updating order');
    }
  };

  const openUploadModal = (order) => {
    setSelectedOrder(order);
    setPdfFile(null);
    setImageFile(null);
    setVideoFile(null);
    setZipFile(null);
    setShowUploadModal(true);
  };

  const handleFileSelect = (type) => {
    const input = document.createElement('input');
    input.type = 'file';
    if (type === 'pdf') input.accept = '.pdf';
    else if (type === 'image') input.accept = 'image/*';
    else if (type === 'video') input.accept = 'video/*';
    else if (type === 'zip') input.accept = '.zip,.rar,.7z';

    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (type === 'pdf') setPdfFile(file);
        else if (type === 'image') setImageFile(file);
        else if (type === 'video') setVideoFile(file);
        else if (type === 'zip') setZipFile(file);
      }
    };
    input.click();
  };

  const handleUpload = async () => {
    if (!selectedOrder) return;
    setUploading(true);

    try {
      const formData = new FormData();
      if (pdfFile) formData.append('pdf', pdfFile);
      if (imageFile) formData.append('image', imageFile);
      if (videoFile) formData.append('video', videoFile);
      if (zipFile) formData.append('zip_file', zipFile);

      const response = await fetch(`${API_URL}/api/orders/${selectedOrder.id}/deliverable`, {
        method: 'PUT',
        body: formData
      });

      if (response.ok) {
        toast.success('Deliverable uploaded successfully!');
        setShowUploadModal(false);
        setSelectedOrder(null);
        loadOrders();
      } else {
        toast.error('Failed to upload deliverable');
      }
    } catch (error) {
      console.error('Error uploading:', error);
      toast.error('Error uploading deliverable');
    } finally {
      setUploading(false);
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
          <Text style={styles.title}>Admin Orders</Text>
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

                <View style={styles.deliverableStatus}>
                  {order.pdf_url && <View style={styles.deliverableTag}><Text style={styles.deliverableTagText}>📄 PDF</Text></View>}
                  {order.image_url && <View style={styles.deliverableTag}><Text style={styles.deliverableTagText}>🖼️ Image</Text></View>}
                  {order.video_url && <View style={styles.deliverableTag}><Text style={styles.deliverableTagText}>🎥 Video</Text></View>}
                  {order.zip_url && <View style={styles.deliverableTag}><Text style={styles.deliverableTagText}>📦 ZIP</Text></View>}
                  {!order.pdf_url && !order.image_url && !order.video_url && (
                    <Text style={styles.noDeliverable}>No deliverables uploaded</Text>
                  )}
                </View>

                <View style={styles.orderFooter}>
                  <Text style={styles.orderTotal}>Total: ${order.total_amount}</Text>
                  <View style={styles.statusActions}>
                    <TouchableOpacity style={styles.uploadBtn} onPress={() => openUploadModal(order)}>
                      <Text style={styles.uploadBtnText}>📤 Upload</Text>
                    </TouchableOpacity>
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

      {/* Upload Modal */}
      <Modal visible={showUploadModal} transparent={true} animationType="slide" onRequestClose={() => setShowUploadModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>Upload Deliverables</Text>
              <Text style={styles.modalSubtitle}>Order #{selectedOrder?.id} - {selectedOrder?.customer_name}</Text>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>📄 PDF for eBook</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileSelect('pdf')}>
                  <Text style={styles.uploadButtonText}>{pdfFile ? pdfFile.name : 'Choose PDF'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>🖼️ Image for Gift Card</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileSelect('image')}>
                  <Text style={styles.uploadButtonText}>{imageFile ? imageFile.name : 'Choose Image'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>🎥 Video for Course</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileSelect('video')}>
                  <Text style={styles.uploadButtonText}>{videoFile ? videoFile.name : 'Choose Video'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.uploadSection}>
                <Text style={styles.uploadLabel}>📦 ZIP/Archive File</Text>
                <TouchableOpacity style={styles.uploadButton} onPress={() => handleFileSelect('zip')}>
                  <Text style={styles.uploadButtonText}>{zipFile ? zipFile.name : 'Choose ZIP File'}</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowUploadModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleUpload} disabled={uploading}>
                  <Text style={styles.submitButtonText}>{uploading ? 'Uploading...' : 'Upload'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
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
  orderItems: { marginBottom: 15 },
  orderItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  itemName: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', flex: 2 },
  itemType: { fontSize: 14, color: '#86868B', flex: 1 },
  itemPrice: { fontSize: 16, fontWeight: '600', color: '#1D1D1F' },
  deliverableStatus: { flexDirection: 'row', gap: 10, marginBottom: 15, flexWrap: 'wrap' },
  deliverableTag: { backgroundColor: '#E5F0FF', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 },
  deliverableTagText: { fontSize: 13, color: '#0066CC', fontWeight: '600' },
  noDeliverable: { fontSize: 13, color: '#86868B', fontStyle: 'italic' },
  orderFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F5F5F7' },
  orderTotal: { fontSize: 22, fontWeight: '700', color: '#1D1D1F' },
  statusActions: { flexDirection: 'row', gap: 10 },
  uploadBtn: { backgroundColor: '#0066CC', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  uploadBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  completeBtn: { backgroundColor: '#10B981', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  completeBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  cancelBtn: { backgroundColor: '#F5F5F7', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12 },
  cancelBtnText: { color: '#EF4444', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '90%', maxWidth: 500, marginBottom: 30 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 8, textAlign: 'center' },
  modalSubtitle: { fontSize: 14, color: '#86868B', marginBottom: 25, textAlign: 'center' },
  uploadSection: { marginBottom: 20, padding: 15, backgroundColor: '#F5F5F7', borderRadius: 12 },
  uploadLabel: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  uploadButton: { backgroundColor: '#0066CC', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default AdminOrdersPage;
