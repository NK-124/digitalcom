import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Dimensions } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import ContactUs from '../../components/ContactUs';
import { useToast } from '../../components/ToastNotification';
import { addToCart } from '../../utils/cart';
import { useAuth } from '../../utils/auth';
import API_URL from '../../utils/apiClient';

const EbookPage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const cardWidth = isMobile ? '46%' : isTablet ? '46%' : '30%';
  const cardMargin = isMobile ? 6 : isTablet ? 8 : 10;
  const titleSize = isMobile ? 26 : isTablet ? 36 : 48;
  const subtitleSize = isMobile ? 15 : isTablet ? 20 : 24;
  const imageHeight = isMobile ? 120 : 200;

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
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  // Admin state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookAuthor, setBookAuthor] = useState('');
  const [bookPrice, setBookPrice] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [uploading, setUploading] = useState(false);

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
    fetchEbooks();
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

  const fetchEbooks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ebooks`);
      if (response.ok) {
        const data = await response.json();
        setEbooks(data);
      } else {
        setEbooks([
          { id: 1, title: 'Learn React Native', author: 'John Doe', price: 29.99, image_url: 'https://via.placeholder.com/300x400?text=eBook+1', description: 'Master React Native development' },
        ]);
      }
    } catch (error) {
      console.log('Error fetching ebooks:', error);
      setEbooks([
        { id: 1, title: 'Learn React Native', author: 'John Doe', price: 29.99, image_url: 'https://via.placeholder.com/300x400?text=eBook+1', description: 'Master React Native development' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingBook(null);
    setBookTitle('');
    setBookAuthor('');
    setBookPrice('');
    setBookDescription('');
    setImages([null, null, null, null, null]);
    setVideos([null, null, null, null, null]);
    setImagePreviews(['', '', '', '', '']);
    setVideoPreviews(['', '', '', '', '']);
    setShowAdminModal(true);
  };

  const openEditModal = (book) => {
    setEditingBook(book);
    setBookTitle(book.title);
    setBookAuthor(book.author);
    setBookPrice(book.price.toString());
    setBookDescription(book.description || '');

    const loadedImages = [null, null, null, null, null];
    const loadedVideos = [null, null, null, null, null];
    const loadedImagePreviews = ['', '', '', '', ''];
    const loadedVideoPreviews = ['', '', '', '', ''];

    if (book.image_url) { loadedImages[0] = book.image_url; loadedImagePreviews[0] = book.image_url; }
    if (book.image_url_2) { loadedImages[1] = book.image_url_2; loadedImagePreviews[1] = book.image_url_2; }
    if (book.image_url_3) { loadedImages[2] = book.image_url_3; loadedImagePreviews[2] = book.image_url_3; }
    if (book.image_url_4) { loadedImages[3] = book.image_url_4; loadedImagePreviews[3] = book.image_url_4; }
    if (book.image_url_5) { loadedImages[4] = book.image_url_5; loadedImagePreviews[4] = book.image_url_5; }

    if (book.video_url) { loadedVideos[0] = book.video_url; loadedVideoPreviews[0] = book.video_url; }
    if (book.video_url_2) { loadedVideos[1] = book.video_url_2; loadedVideoPreviews[1] = book.video_url_2; }
    if (book.video_url_3) { loadedVideos[2] = book.video_url_3; loadedVideoPreviews[2] = book.video_url_3; }
    if (book.video_url_4) { loadedVideos[3] = book.video_url_4; loadedVideoPreviews[3] = book.video_url_4; }
    if (book.video_url_5) { loadedVideos[4] = book.video_url_5; loadedVideoPreviews[4] = book.video_url_5; }

    setImages(loadedImages);
    setVideos(loadedVideos);
    setImagePreviews(loadedImagePreviews);
    setVideoPreviews(loadedVideoPreviews);
    setShowAdminModal(true);
  };

  const handleSubmit = async () => {
    if (!bookTitle || !bookAuthor || !bookPrice) {
      toast.error('Please fill in all required fields');
      return;
    }
    if (!imageRefs[0].current && !editingBook) {
      toast.error('Please select at least one image');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', bookTitle);
      formData.append('author', bookAuthor);
      formData.append('price', parseFloat(bookPrice));
      formData.append('description', bookDescription);

      for (let i = 0; i < 5; i++) {
        if (imageRefs[i].current) {
          formData.append(i === 0 ? 'image' : `image_${i + 1}`, imageRefs[i].current);
        }
      }

      for (let i = 0; i < 5; i++) {
        if (videoRefs[i].current) {
          formData.append(i === 0 ? 'video' : `video_${i + 1}`, videoRefs[i].current);
        }
      }

      const url = editingBook
        ? `${API_URL}/api/ebooks/${editingBook.id}`
        : `${API_URL}/api/ebooks`;
      const method = editingBook ? 'PUT' : 'POST';

      const response = await fetch(url, { method, body: formData });
      const responseText = await response.text();

      if (response.ok) {
        const msg = editingBook ? 'eBook updated successfully!' : 'eBook created successfully!';
        console.log('✅ eBook save success, showing toast:', msg);
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
        fetchEbooks();
      } else {
        try {
          const errorData = JSON.parse(responseText);
          toast.error('Failed to save eBook: ' + (errorData.detail || 'Unknown error'));
        } catch (e) {
          toast.error('Failed to save eBook: Server error ' + response.status);
        }
      }
    } catch (error) {
      toast.error('Error saving eBook: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (bookId) => {
    setDeleteTargetId(bookId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!deleteTargetId) return;
    try {
      const response = await fetch(`${API_URL}/api/ebooks/${deleteTargetId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('eBook deleted successfully!');
        fetchEbooks();
      } else {
        toast.error('Failed to delete eBook');
      }
    } catch (error) {
      console.error('Error deleting eBook:', error);
      toast.error('Error deleting eBook');
    }
    setDeleteTargetId(null);
  };

  const handleImageSelect = (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        imageRefs[index].current = file;
        const newImages = [...images];
        newImages[index] = file;
        setImages(newImages);

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
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'video/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        videoRefs[index].current = file;
        const newVideos = [...videos];
        newVideos[index] = file;
        setVideos(newVideos);

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

  const openDetailView = (book) => {
    window.history.pushState({ page: 'ebook-detail', bookId: book.id }, '', `/ebook/${book.id}`);
    window.location.reload();
  };

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />

      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>eBooks</Text>
          <Text style={styles.subtitle}>Expand your knowledge</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={openAddModal}>
              <Text style={styles.adminButtonText}>+ Add eBook</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : (
          <View style={styles.grid}>
            {ebooks.map((book) => (
              <TouchableOpacity key={book.id} style={[styles.card, { width: cardWidth, margin: cardMargin }]} onPress={() => openDetailView(book)}>
                <Image source={{ uri: book.image_url }} style={[styles.cardImage, { height: imageHeight }]} />
                <View style={styles.cardContent}>
                  <Text style={styles.bookTitle}>{book.title}</Text>
                  <Text style={styles.bookAuthor}>by {book.author}</Text>
                  <Text style={styles.bookPrice}>${book.price}</Text>
                  <TouchableOpacity style={styles.buyButton} disabled={loadingProductId === book.id} onPress={(e) => {
                    e.stopPropagation();
                    setLoadingProductId(book.id);
                    addToCart({
                      id: book.id,
                      name: book.title,
                      price: book.price,
                      image_url: book.image_url,
                      type: 'eBook'
                    });
                    toast.success('Added to cart!');
                    setTimeout(() => {
                      setLoadingProductId(null);
                      if (onNavigate) onNavigate('cart');
                    }, 2000);
                  }}>
                    {loadingProductId === book.id ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <Text style={styles.buyButtonText}>Buy Now</Text>
                    )}
                  </TouchableOpacity>

                  {isAdmin && (
                    <View style={styles.adminActions}>
                      <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(book)}>
                        <Text style={styles.editButtonText}>✏️ Edit</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteClick(book.id)}>
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
              <Text style={styles.modalTitle}>{editingBook ? 'Edit eBook' : 'Add eBook'}</Text>

              <TextInput style={styles.input} placeholder="Book Title" value={bookTitle} onChangeText={setBookTitle} placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="Author" value={bookAuthor} onChangeText={setBookAuthor} placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="Price (e.g., 29.99)" value={bookPrice} onChangeText={setBookPrice} keyboardType="numeric" placeholderTextColor="#999" />
              <TextInput style={[styles.input, styles.textArea]} placeholder="Description" value={bookDescription} onChangeText={setBookDescription} multiline numberOfLines={4} placeholderTextColor="#999" />

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
                  <Text style={styles.submitButtonText}>{uploading ? 'Saving...' : (editingBook ? 'Update' : 'Create')}</Text>
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
            <Text style={styles.deleteModalTitle}>Delete eBook?</Text>
            <Text style={styles.deleteModalText}>Are you sure you want to delete this eBook? This action cannot be undone.</Text>
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
  header: { backgroundColor: '#FFFFFF', paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 48, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  subtitle: { fontSize: 24, color: '#86868B' },
  adminButton: { marginTop: 20, backgroundColor: '#0066CC', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  adminButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  grid: { display: 'flex', flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 5, paddingBottom: 30 },
  card: { backgroundColor: '#FFFFFF', borderRadius: 12, margin: 5, overflow: 'hidden', maxWidth: 300, minWidth: 140, boxShadow: '0 2px 8px rgba(0,0,0,0.1)' },
  cardImage: { width: '100%', height: 120, backgroundColor: '#F5F5F7' },
  cardContent: { padding: 10, alignItems: 'center' },
  bookTitle: { fontSize: 14, fontWeight: '700', color: '#1D1D1F', marginBottom: 4, textAlign: 'center' },
  bookAuthor: { fontSize: 12, color: '#86868B', marginBottom: 8 },
  bookPrice: { fontSize: 16, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
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
  textArea: { height: 100, textAlignVertical: 'top' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  uploadSection: { marginBottom: 15, padding: 15, backgroundColor: '#F5F5F7', borderRadius: 12 },
  uploadLabel: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  uploadButton: { backgroundColor: '#0066CC', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 12, alignItems: 'center' },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  previewImage: { width: '100%', height: 300, marginTop: 10, borderRadius: 8 },
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

export default EbookPage;
