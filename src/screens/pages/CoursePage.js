import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Dimensions } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import ContactUs from '../../components/ContactUs';
import { useToast } from '../../components/ToastNotification';
import { addToCart } from '../../utils/cart';
import { useAuth } from '../../utils/auth';
import API_URL from '../../utils/apiClient';

const CoursePage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const cardWidth = isMobile ? '46%' : isTablet ? '46%' : '30%';
  const cardMargin = isMobile ? 8 : isTablet ? 8 : 10;
  const titleSize = isMobile ? 16 : isTablet ? 18 : 20;
  const subtitleSize = isMobile ? 15 : isTablet ? 20 : 24;
  const imageHeight = isMobile ? 180 : 200;

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

  const [buyLoading, setBuyLoading] = useState(false);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [coursePrice, setCoursePrice] = useState('');
  const [courseImage, setCourseImage] = useState(null);
  const [courseImagePreview, setCourseImagePreview] = useState('');
  const [uploading, setUploading] = useState(false);

  // Delete confirmation
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteTargetId, setDeleteTargetId] = useState(null);

  useEffect(() => {
    if (currentUser && currentUser.email) {
      checkAdminStatus(currentUser.email);
    }
    fetchCourses();
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

  const fetchCourses = async () => {
    try {
      const response = await fetch(`${API_URL}/api/courses`);
      if (response.ok) {
        const data = await response.json();
        setCourses(Array.isArray(data) ? data : []);
      } else {
        setCourses([]);
      }
    } catch (error) {
      console.log('Error:', error);
      setCourses([]);
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingCourse(null);
    setCourseTitle('');
    setCoursePrice('');
    setCourseImage(null);
    setCourseImagePreview('');
    setShowAdminModal(true);
  };

  const openEditModal = (course) => {
    setEditingCourse(course);
    setCourseTitle(course.title);
    setCoursePrice(course.price ? course.price.toString() : '');
    setCourseImage(null);
    setCourseImagePreview(course.image_url || '');
    setShowAdminModal(true);
  };

  const handleImageSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setCourseImage(file);
        const reader = new FileReader();
        reader.onload = (event) => setCourseImagePreview(event.target.result);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!courseTitle || !coursePrice) {
      toast.error('Please fill in all required fields');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', courseTitle);
      formData.append('price', coursePrice);
      if (courseImage) {
        formData.append('image', courseImage);
      }
      const url = editingCourse
        ? `${API_URL}/api/courses/${editingCourse.id}`
        : `${API_URL}/api/courses`;
      const response = await fetch(url, {
        method: editingCourse ? 'PUT' : 'POST',
        body: formData
      });
      if (response.ok) {
        toast.success(editingCourse ? 'Course updated successfully!' : 'Course created successfully!');
        setShowAdminModal(false);
        fetchCourses();
      } else {
        const errorData = await response.json().catch(() => ({}));
        toast.error(`Failed to save: ${errorData.detail || response.statusText}`);
      }
    } catch (error) {
      toast.error(`Error: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteClick = (courseId) => {
    setDeleteTargetId(courseId);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    setShowDeleteModal(false);
    if (!deleteTargetId) return;
    try {
      const response = await fetch(`${API_URL}/api/courses/${deleteTargetId}`, { method: 'DELETE' });
      if (response.ok) {
        toast.success('Course deleted successfully!');
        fetchCourses();
      } else {
        toast.error('Failed to delete course');
      }
    } catch (error) {
      toast.error('Error deleting course');
    }
    setDeleteTargetId(null);
  };

  const handleCourseClick = (course) => {
    window.history.pushState({ page: 'course', courseId: course.id }, '', `/course/${course.id}`);
    setSelectedCourse(course);
  };

  useEffect(() => {
    // Handle deep linking/refresh for courses
    const pathParts = window.location.pathname.split('/');
    if (pathParts.length > 2 && pathParts[1] === 'course' && courses.length > 0) {
      const courseId = parseInt(pathParts[2]);
      const foundCourse = courses.find(c => c.id === courseId);
      if (foundCourse) setSelectedCourse(foundCourse);
    }

    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/course' || path === '/course/') {
        setSelectedCourse(null);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [courses]);

  // Course Detail Page (similar to gift card/eBook detail)
  if (selectedCourse) {
    return (
      <View style={styles.container}>
        <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.detailContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => {
              setSelectedCourse(null);
              window.history.pushState({ page: 'course' }, '', '/course');
            }}>
              <Text style={styles.backButtonText}>← Back to Courses</Text>
            </TouchableOpacity>

            <View style={styles.detailLayout}>
              {/* Image - Left Side */}
              <View style={styles.carouselSide}>
                <View style={styles.carouselContainer}>
                  <View style={styles.mediaWrapper}>
                    {selectedCourse.image_url ? (
                      <img src={selectedCourse.image_url} alt={selectedCourse.title} style={styles.mainMediaWeb} />
                    ) : (
                      <View style={styles.detailImagePlaceholder}>
                        <Text style={styles.placeholderText}>No Image</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>

              {/* Details & Buy - Right Side */}
              <View style={styles.detailsSide}>
                <View style={styles.infoCard}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>ONLINE COURSE</Text>
                  </View>
                  <Text style={styles.productTitle}>{selectedCourse.title}</Text>
                  <Text style={styles.productPrice}>${selectedCourse.price}</Text>
                  
                  <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                      <Text style={styles.featureIcon}>🎥</Text>
                      <Text style={styles.featureText}>HD Video Lessons</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Text style={styles.featureIcon}>♾️</Text>
                      <Text style={styles.featureText}>Lifetime Access</Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.buyNowBtn} disabled={buyLoading} onPress={() => {
                      setBuyLoading(true);
                      addToCart({
                        id: selectedCourse.id,
                        name: selectedCourse.title,
                        price: selectedCourse.price,
                        image_url: selectedCourse.image_url,
                        type: 'Course'
                      });
                      toast.success('Added to cart!');
                      setTimeout(() => {
                        setBuyLoading(false);
                        onNavigate('cart');
                      }, 2000);
                    }}>
                      {buyLoading ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      ) : (
                        <Text style={styles.buyNowBtnText}>Buy Now</Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.addToCartBtn} onPress={() => {
                      addToCart({
                        id: selectedCourse.id,
                        name: selectedCourse.title,
                        price: selectedCourse.price,
                        image_url: selectedCourse.image_url,
                        type: 'Course'
                      });
                      toast.success('Course added to cart!');
                    }}>
                      <Text style={styles.addToCartBtnText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Description Section */}
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>What you will get</Text>
                  <Text style={styles.descriptionText}>
                    Master new skills with our comprehensive online course. You'll get step-by-step video tutorials, downloadable resources, and hands-on projects to ensure you can apply what you learn immediately.
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      <ScrollView style={styles.scrollView}>
        <View style={[styles.header, { paddingVertical: isMobile ? 30 : 60 }]}>
          <Text style={[styles.title, { fontSize: titleSize }]}>Courses</Text>
          <Text style={[styles.subtitle, { fontSize: subtitleSize }]}>Learn new skills</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={openAddModal}>
              <Text style={styles.adminButtonText}>+ Add Course</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0066CC" /></View>
        ) : (
          <View style={styles.grid}>
            {courses.map((course) => (
              <TouchableOpacity key={course.id} style={styles.card} onPress={() => handleCourseClick(course)}>
                <Image source={{ uri: course.image_url || 'https://via.placeholder.com/350x200?text=No+Image' }} style={styles.cardImage} />
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{course.title}</Text>
                  <Text style={styles.cardPrice}>${course.price}</Text>
                  <TouchableOpacity style={styles.startButton} onPress={() => handleCourseClick(course)}>
                    <Text style={styles.startButtonText}>View Details</Text>
                  </TouchableOpacity>
                </View>
                {isAdmin && (
                  <View style={styles.adminActionsCard}>
                    <TouchableOpacity style={styles.editButtonSmall} onPress={(e) => { e.stopPropagation(); openEditModal(course); }}>
                      <Text style={styles.editButtonTextSmall}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButtonSmall} onPress={(e) => { e.stopPropagation(); handleDeleteClick(course.id); }}>
                      <Text style={styles.deleteButtonTextSmall}>🗑️</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            ))}
          </View>
        )}
        <ContactUs />
      </ScrollView>

      {/* Admin Modal */}
      <Modal visible={showAdminModal} transparent={true} animationType="slide" onRequestClose={() => setShowAdminModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingCourse ? 'Edit Course' : 'Add Course'}</Text>
              
              <TextInput style={styles.input} placeholder="Course Name" value={courseTitle} onChangeText={setCourseTitle} placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="Price ($)" value={coursePrice} onChangeText={setCoursePrice} keyboardType="numeric" placeholderTextColor="#999" />
              
              <Text style={styles.inputLabel}>Course Image</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={handleImageSelect}>
                <Text style={styles.uploadButtonText}>{courseImagePreview ? 'Change Image' : 'Choose Image'}</Text>
              </TouchableOpacity>
              {courseImagePreview ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: courseImagePreview }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => { setCourseImage(null); setCourseImagePreview(''); }}>
                    <Text style={styles.removeImageButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAdminModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={uploading}>
                  <Text style={styles.submitButtonText}>{uploading ? 'Saving...' : (editingCourse ? 'Update' : 'Create')}</Text>
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
            <Text style={styles.deleteModalTitle}>Delete Course?</Text>
            <Text style={styles.deleteModalText}>Are you sure you want to delete this course? This action cannot be undone.</Text>
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
  scrollView: { flex: 1 },
  header: { backgroundColor: '#FFFFFF', paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20, position: 'relative' },
  title: { fontSize: 48, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  subtitle: { fontSize: 24, color: '#86868B' },
  adminButton: { marginTop: 20, backgroundColor: '#0066CC', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  adminButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20, paddingBottom: 60, maxWidth: 1600, alignSelf: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 14, margin: 15, overflow: 'hidden', width: '320px', boxShadow: '0 4px 16px rgba(0,0,0,0.15)', position: 'relative' },
  cardImage: { width: '100%', height: 200, backgroundColor: '#F5F5F7', resizeMode: 'cover' },
  cardContent: { padding: 16, alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1D1D1F', marginBottom: 8, textAlign: 'center' },
  cardPrice: { fontSize: 18, fontWeight: '700', color: '#1D1D1F', marginBottom: 12 },
  startButton: { backgroundColor: '#0066CC', paddingVertical: 10, borderRadius: 10, alignItems: 'center', width: '100%' },
  startButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  adminActionsCard: { position: 'absolute', top: 15, right: 15, flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 12 },
  editButtonSmall: { padding: 8 },
  editButtonTextSmall: { fontSize: 18 },
  deleteButtonSmall: { padding: 8 },
  deleteButtonTextSmall: { fontSize: 18 },
  
  // Detail Page
  detailContainer: { maxWidth: 1200, width: '100%', alignSelf: 'center', padding: 20, paddingBottom: 60 },
  backButton: { alignSelf: 'flex-start', marginBottom: 30, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  backButtonText: { fontSize: 15, fontWeight: '600', color: '#0066CC' },
  detailLayout: { flexDirection: 'row', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' },
  carouselSide: { flex: 1.2, minWidth: 350 },
  detailsSide: { flex: 1, minWidth: 350 },
  
  carouselContainer: { position: 'relative', width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  mediaWrapper: { width: '100%', aspectRatio: 1.4, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 18 },
  mainMediaWeb: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  
  infoCard: { backgroundColor: '#FFFFFF', borderRadius: 24, padding: 32, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 12, marginBottom: 30 },
  badge: { backgroundColor: '#F5F5F7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 16 },
  badgeText: { fontSize: 12, fontWeight: '700', color: '#86868B', letterSpacing: 1 },
  productTitle: { fontSize: 32, fontWeight: '700', color: '#1D1D1F', marginBottom: 12 },
  productPrice: { fontSize: 36, fontWeight: '700', color: '#0066CC', marginBottom: 24 },
  
  featureList: { marginBottom: 24, gap: 12 },
  featureItem: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureIcon: { fontSize: 16 },
  featureText: { fontSize: 16, color: '#424245', fontWeight: '500' },
  
  actionButtons: { gap: 16 },
  buyNowBtn: { backgroundColor: '#10B981', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#10B981', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  buyNowBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  addToCartBtn: { backgroundColor: '#0066CC', paddingVertical: 18, borderRadius: 16, alignItems: 'center', shadowColor: '#0066CC', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  addToCartBtnText: { color: '#FFFFFF', fontSize: 18, fontWeight: '700' },
  
  descriptionSection: { paddingHorizontal: 10 },
  sectionTitle: { fontSize: 22, fontWeight: '700', color: '#1D1D1F', marginBottom: 16 },
  descriptionText: { fontSize: 16, color: '#86868B', lineHeight: 26 },
  
  detailImagePlaceholder: { width: '100%', height: 400, backgroundColor: '#F5F5F7', borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  placeholderText: { fontSize: 18, color: '#86868B' },
  
  // Modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '90%', maxWidth: 500, marginBottom: 30 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 25, textAlign: 'center' },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#1D1D1F', marginBottom: 15, borderWidth: 1, borderColor: '#E5E5E5' },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  uploadButton: { backgroundColor: '#0066CC', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center', marginBottom: 15 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  previewContainer: { alignItems: 'center', marginBottom: 15 },
  previewImage: { width: '100%', height: 200, borderRadius: 12, resizeMode: 'cover', marginBottom: 10 },
  removeImageButton: { backgroundColor: '#FF3B30', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8 },
  removeImageButtonText: { color: '#FFFFFF', fontSize: 13, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  
  // Delete Modal
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

export default CoursePage;
