import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Dimensions } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import ContactUs from '../../components/ContactUs';
import { useToast } from '../../components/ToastNotification';
import { addToCart } from '../../utils/cart';
import { useAuth } from '../../utils/auth';
import API_URL from '../../utils/apiClient';

const GiftCardPage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const { user: currentUser, refreshUser } = useAuth();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const cardWidth = isMobile ? '46%' : isTablet ? '46%' : '30%';
  const cardMargin = isMobile ? 6 : isTablet ? 8 : 10;
  const titleSize = isMobile ? 26 : isTablet ? 32 : 36;
  const subtitleSize = isMobile ? 15 : isTablet ? 18 : 18;
  const headerPadding = isMobile ? 25 : 40;
  const imageHeight = isMobile ? 100 : 150;

  // Update screen width on resize
  useEffect(() => {
    const updateLayout = () => {
      const newWidth = Dimensions.get('window').width;
      setScreenWidth(newWidth);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('resize', updateLayout);
      return () => window.removeEventListener('resize', updateLayout);
    }
  }, []);

  const [loadingProductId, setLoadingProductId] = useState(null);
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Admin state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingCard, setEditingCard] = useState(null);
  const [cardName, setCardName] = useState('');
  const [cardPrice, setCardPrice] = useState('');
  const [uploading, setUploading] = useState(false);

  // Notification state
  const [notification, setNotification] = useState({ show: false, message: '', type: 'success' });

  // Multiple images and videos (up to 5 each)
  const [images, setImages] = useState([null, null, null, null, null]);
  const [videos, setVideos] = useState([null, null, null, null, null]);
  const [imagePreviews, setImagePreviews] = useState(['', '', '', '', '']);
  const [videoPreviews, setVideoPreviews] = useState(['', '', '', '', '']);
  const imageRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];
  const videoRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    if (currentUser && currentUser.email) {
      checkAdminStatus(currentUser.email);
    }
    fetchGiftCards();
  }, [currentUser]);

  const checkAdminStatus = async (email) => {
    try {
      const response = await fetch(`${API_URL}/api/check-admin?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        setIsAdmin(data.is_admin || false);
      }
    } catch (error) {
      console.log('Error checking admin status:', error);
    }
  };

  const fetchGiftCards = async () => {
    try {
      const response = await fetch(`${API_URL}/api/gift-cards`);
      if (response.ok) {
        const data = await response.json();
        setGiftCards(Array.isArray(data) ? data : []);
      } else {
        setGiftCards([
          { id: 1, name: 'Apple Gift Card', price: 50, image_url: 'https://via.placeholder.com/300x200?text=Gift+Card+1' },
        ]);
      }
    } catch (error) {
      console.log('Error fetching gift cards:', error);
      setGiftCards([
        { id: 1, name: 'Apple Gift Card', price: 50, image_url: 'https://via.placeholder.com/300x200?text=Gift+Card+1' },
      ]);
    } finally {
      // Add 3 second loading delay
      setTimeout(() => {
        setLoading(false);
      }, 3000);
    }
  };

  // Fetch gift cards in background without blocking render
  useEffect(() => {
    fetchGiftCards();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ show: true, message, type });
    setTimeout(() => {
      setNotification({ show: false, message: '', type: 'success' });
    }, 3000);
  };

  const openAddModal = () => {
    setEditingCard(null);
    setCardName('');
    setCardPrice('');
    setImages([null, null, null, null, null]);
    setVideos([null, null, null, null, null]);
    setImagePreviews(['', '', '', '', '']);
    setVideoPreviews(['', '', '', '', '']);
    setShowAdminModal(true);
  };

  const openEditModal = (card) => {
    setEditingCard(card);
    setCardName(card.name);
    setCardPrice(card.price.toString());
    
    const loadedImages = [null, null, null, null, null];
    const loadedVideos = [null, null, null, null, null];
    const loadedImagePreviews = ['', '', '', '', ''];
    const loadedVideoPreviews = ['', '', '', '', ''];
    
    if (card.image_url) { loadedImages[0] = card.image_url; loadedImagePreviews[0] = card.image_url; }
    if (card.image_url_2) { loadedImages[1] = card.image_url_2; loadedImagePreviews[1] = card.image_url_2; }
    if (card.image_url_3) { loadedImages[2] = card.image_url_3; loadedImagePreviews[2] = card.image_url_3; }
    if (card.image_url_4) { loadedImages[3] = card.image_url_4; loadedImagePreviews[3] = card.image_url_4; }
    if (card.image_url_5) { loadedImages[4] = card.image_url_5; loadedImagePreviews[4] = card.image_url_5; }
    
    if (card.video_url) { loadedVideos[0] = card.video_url; loadedVideoPreviews[0] = card.video_url; }
    if (card.video_url_2) { loadedVideos[1] = card.video_url_2; loadedVideoPreviews[1] = card.video_url_2; }
    if (card.video_url_3) { loadedVideos[2] = card.video_url_3; loadedVideoPreviews[2] = card.video_url_3; }
    if (card.video_url_4) { loadedVideos[3] = card.video_url_4; loadedVideoPreviews[3] = card.video_url_4; }
    if (card.video_url_5) { loadedVideos[4] = card.video_url_5; loadedVideoPreviews[4] = card.video_url_5; }
    
    setImages(loadedImages);
    setVideos(loadedVideos);
    setImagePreviews(loadedImagePreviews);
    setVideoPreviews(loadedVideoPreviews);
    setShowAdminModal(true);
  };

  const openDetailView = (card) => {
    window.history.pushState({ page: 'gift-card-detail', cardId: card.id }, '', `/gift-card/${card.id}`);
    window.location.reload();
  };

  const handleSubmit = async () => {
    if (!cardName || !cardPrice) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!imageRefs[0].current && !editingCard) {
      toast.error('Please select at least one image');
      return;
    }

    // Debug: Log what files are being sent
    console.log('=== DEBUG: Files to send ===');
    for (let i = 0; i < 5; i++) {
      console.log(`imageRefs[${i}]:`, imageRefs[i].current ? imageRefs[i].current.name : 'NULL');
      console.log(`videoRefs[${i}]:`, videoRefs[i].current ? videoRefs[i].current.name : 'NULL');
    }
    console.log('=========================\n');

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', cardName);
      formData.append('price', parseFloat(cardPrice));
      
      // Use refs (synchronous) instead of state (async)
      console.log('=== SENDING FILES ===');
      for (let i = 0; i < 5; i++) {
        const file = imageRefs[i].current;
        console.log(`Image ${i}:`, file ? file.name : 'NULL');
        if (file) {
          const fieldName = i === 0 ? 'image' : `image_${i + 1}`;
          formData.append(fieldName, file);
          console.log(`  → Appended as '${fieldName}'`);
        }
      }
      
      for (let i = 0; i < 5; i++) {
        const file = videoRefs[i].current;
        console.log(`Video ${i}:`, file ? file.name : 'NULL');
        if (file) {
          const fieldName = i === 0 ? 'video' : `video_${i + 1}`;
          formData.append(fieldName, file);
          console.log(`  → Appended as '${fieldName}'`);
        }
      }
      console.log('===================\n');

      const url = editingCard
        ? `${API_URL}/api/gift-cards/${editingCard.id}`
        : `${API_URL}/api/gift-cards`;
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, { method, body: formData });
      const responseText = await response.text();

      if (response.ok) {
        const msg = editingCard ? 'Gift card updated successfully!' : 'Gift card created successfully!';
        console.log('✅ Update/Create success, showing toast:', msg);
        toast.success(msg);
        setShowAdminModal(false);
        setImages([null, null, null, null, null]);
        setVideos([null, null, null, null, null]);
        setImagePreviews(['', '', '', '', '']);
        setVideoPreviews(['', '', '', '', '']);
        for (let i = 0; i < 5; i++) {
          imageRefs[i].current = null;
          videoRefs[i].current = null;
        }
        fetchGiftCards();
      } else {
        try {
          const errorData = JSON.parse(responseText);
          toast.error('Failed to save gift card: ' + (errorData.detail || 'Unknown error'));
        } catch (e) {
          toast.error('Failed to save gift card: Server error ' + response.status);
        }
      }
    } catch (error) {
      toast.error('Error saving gift card: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (cardId) => {
    setDeleteTargetId(cardId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!deleteTargetId) return;
    try {
      const response = await fetch(`${API_URL}/api/gift-cards/${deleteTargetId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Gift card deleted successfully!');
        fetchGiftCards();
      } else {
        toast.error('Failed to delete gift card');
      }
    } catch (error) {
      console.error('Error deleting gift card:', error);
      toast.error('Error deleting gift card');
    }
    setDeleteTargetId(null);
  };

  const handleImageSelect = (index) => {
    console.log(`handleImageSelect called with index: ${index}`);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      console.log(`Image ${index} selected:`, file ? file.name : 'NULL');
      if (file) {
        imageRefs[index].current = file;
        const newImages = [...images];
        newImages[index] = file;
        setImages(newImages);
        console.log(`imageRefs[${index}].current set to:`, file.name);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const newPreviews = [...imagePreviews];
          newPreviews[index] = event.target.result;
          setImagePreviews(newPreviews);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleVideoSelect = (index) => {
    console.log(`handleVideoSelect called with index: ${index}`);
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      console.log(`Video ${index} selected:`, file ? file.name : 'NULL');
      if (file) {
        videoRefs[index].current = file;
        const newVideos = [...videos];
        newVideos[index] = file;
        setVideos(newVideos);
        console.log(`videoRefs[${index}].current set to:`, file.name);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          const newPreviews = [...videoPreviews];
          newPreviews[index] = event.target.result;
          setVideoPreviews(newPreviews);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, { paddingVertical: headerPadding }]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Gift Cards</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Give the perfect gift</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={openAddModal}>
              <Text style={styles.adminButtonText}>+ Add Gift Card</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
            <Text style={styles.loadingText}>Loading...</Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {giftCards.map((card) => (
              <TouchableOpacity key={card.id} style={[styles.card, { width: cardWidth, margin: cardMargin }]} onPress={() => openDetailView(card)}>
                <Image source={{ uri: card.image_url }} style={[styles.cardImage, { height: imageHeight }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardName}>{card.name}</Text>
                  <Text style={styles.cardPrice}>${card.price}</Text>
                  <TouchableOpacity style={styles.buyButton} disabled={loadingProductId === card.id} onPress={(e) => {
                    e.stopPropagation();
                    setLoadingProductId(card.id);
                    addToCart({
                      id: card.id,
                      name: card.name,
                      price: card.price,
                      image_url: card.image_url,
                      type: 'Gift Card'
                    });
                    toast.success('Added to cart!');
                    setTimeout(() => {
                      setLoadingProductId(null);
                      if (onNavigate) onNavigate('cart');
                    }, 2000);
                  }}>
                    {loadingProductId === card.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buyButtonText}>Buy Now</Text>
                    )}
                  </TouchableOpacity>

                  {isAdmin && (
                    <View style={styles.adminActions}>
                      <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(card)}>
                        <Text style={styles.editButtonText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteClick(card.id)}>
                        <Text style={styles.deleteButtonText}>🗑️ Delete</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
        <ContactUs />
      </ScrollView>

      <Modal visible={showAdminModal} transparent={true} animationType="slide" onRequestClose={() => setShowAdminModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingCard ? 'Edit Gift Card' : 'Add Gift Card'}</Text>
              
              <TextInput style={styles.input} placeholder="Gift Card Name" value={cardName} onChangeText={setCardName} placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="Price (e.g., 50)" value={cardPrice} onChangeText={setCardPrice} keyboardType="numeric" placeholderTextColor="#999" />
              
              {[0, 1, 2, 3, 4].map((index) => (
                <View key={`image-${index}`} style={styles.uploadSection}>
                  <Text style={styles.uploadLabel}>📷 Upload Image {index + 1} {index === 0 ? '(Required)' : '(Optional)'}</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={() => handleImageSelect(index)}>
                    <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  {imagePreviews[index] && <Image source={{ uri: imagePreviews[index] }} style={styles.previewImage} />}
                </View>
              ))}

              {[0, 1, 2, 3, 4].map((index) => (
                <View key={`video-${index}`} style={styles.uploadSection}>
                  <Text style={styles.uploadLabel}>🎥 Upload Video {index + 1} (Optional)</Text>
                  <TouchableOpacity style={styles.uploadButton} onPress={() => handleVideoSelect(index)}>
                    <Text style={styles.uploadButtonText}>Choose from Gallery</Text>
                  </TouchableOpacity>
                  {videoPreviews[index] && (
                    <div style={{ width: '100%', marginTop: 10 }}>
                      <video src={videoPreviews[index]} controls style={{ width: '100%', height: 200, borderRadius: 8 }} />
                    </div>
                  )}
                </View>
              ))}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAdminModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={uploading}>
                  <Text style={styles.submitButtonText}>{uploading ? 'Saving...' : (editingCard ? 'Update' : 'Create')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={showDeleteModal} transparent={true} animationType="fade" onRequestClose={() => setShowDeleteModal(false)}>
        <View style={styles.deleteModalOverlay}>
          <View style={styles.deleteModalContent}>
            <Text style={styles.deleteModalTitle}>Delete Gift Card?</Text>
            <Text style={styles.deleteModalText}>Are you sure you want to delete this gift card? This action cannot be undone.</Text>
            <View style={styles.deleteModalButtons}>
              <TouchableOpacity style={styles.deleteModalCancel} onPress={() => { setShowDeleteModal(false); setDeleteTargetId(null); }}>
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.deleteModalConfirm} onPress={confirmDelete}>
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  notification: { position: 'fixed', top: 80, left: '50%', transform: 'translateX(-50%)', paddingHorizontal: 30, paddingVertical: 15, borderRadius: 12, zIndex: 10000, minWidth: 300, textAlign: 'center', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' },
  notificationSuccess: { backgroundColor: '#34C759' },
  notificationError: { backgroundColor: '#FF3B30' },
  notificationText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600', textAlign: 'center' },
  header: { backgroundColor: '#FFFFFF', paddingVertical: 40, paddingHorizontal: 15, alignItems: 'center', marginBottom: 15 },
  title: { fontSize: 36, fontWeight: '700', color: '#1D1D1F', marginBottom: 8, textAlign: 'center' },
  subtitle: { fontSize: 18, color: '#86868B', textAlign: 'center' },
  adminButton: { marginTop: 15, backgroundColor: '#0066CC', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
  adminButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  loadingText: { fontSize: 16, color: '#86868B', marginTop: 15 },
  grid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 5, paddingBottom: 30 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, margin: 5, overflow: 'hidden', maxWidth: 300, minWidth: 140, boxShadow: '0 2px 8px rgba(0,0,0,0.1)', cursor: 'pointer' },
  cardImage: { width: '100%', height: 120, backgroundColor: '#F5F5F7' },
  cardContent: { padding: 10, alignItems: 'center' },
  cardName: { fontSize: 14, fontWeight: '600', color: '#1D1D1F', marginBottom: 4, textAlign: 'center' },
  cardPrice: { fontSize: 16, fontWeight: '700', color: '#1D1D1F', marginBottom: 8 },
  buyButton: { backgroundColor: '#0066CC', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 15, width: '100%', alignItems: 'center' },
  buyButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  adminActions: { flexDirection: 'row', gap: 10, marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F5F5F7', width: '100%' },
  editButton: { flex: 1, backgroundColor: '#34C759', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { flex: 1, backgroundColor: '#FF3B30', paddingVertical: 10, borderRadius: 12, alignItems: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 25, textAlign: 'center' },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#1D1D1F', marginBottom: 15, borderWidth: 1, borderColor: '#E5E5E5' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  uploadSection: { marginBottom: 15, padding: 15, backgroundColor: '#F5F5F7', borderRadius: 12 },
  uploadLabel: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  uploadButton: { backgroundColor: '#0066CC', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  previewImage: { width: '100%', height: 200, marginTop: 10, borderRadius: 8 },
  modalScrollView: { maxHeight: '80%' },
  deleteModalOverlay: { flex: 1, backgroundColor: 'rgba(0, 0, 0, 0.5)', justifyContent: 'center', alignItems: 'center' },
  deleteModalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '90%', maxWidth: 400 },
  deleteModalTitle: { fontSize: 22, fontWeight: '700', color: '#1D1D1F', marginBottom: 12, textAlign: 'center' },
  deleteModalText: { fontSize: 15, color: '#86868B', marginBottom: 25, textAlign: 'center', lineHeight: 22 },
  deleteModalButtons: { flexDirection: 'row', gap: 12 },
  deleteModalCancel: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  deleteModalCancelText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  deleteModalConfirm: { flex: 1, backgroundColor: '#FF3B30', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  deleteModalConfirmText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default GiftCardPage;
