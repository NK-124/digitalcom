import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Dimensions } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import ContactUs from '../../components/ContactUs';
import { useToast } from '../../components/ToastNotification';
import { addToCart } from '../../utils/cart';
import { useAuth } from '../../utils/auth';
import API_URL from '../../utils/apiClient';

const CATEGORIES = ['Landing Page', 'Ecommerce Website', 'Portfolio', 'Business', 'Blog', 'Admin'];

const TemplatePage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [screenWidth, setScreenWidth] = useState(Dimensions.get('window').width);
  const isMobile = screenWidth < 768;
  const isTablet = screenWidth >= 768 && screenWidth < 1024;
  const cardWidth = isMobile ? '46%' : isTablet ? '46%' : '30%';
  const cardMargin = isMobile ? 6 : isTablet ? 8 : 10;
  const titleSize = isMobile ? 26 : isTablet ? 36 : 48;
  const subtitleSize = isMobile ? 15 : isTablet ? 20 : 24;
  const imageHeight = isMobile ? 100 : 220;
  
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
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const touchStartX = React.useRef(null);
  const touchEndX = React.useRef(null);

  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    touchStartX.current = e.nativeEvent.pageX || e.nativeEvent.touches[0].pageX;
    touchEndX.current = e.nativeEvent.pageX || e.nativeEvent.touches[0].pageX;
  };

  const onTouchMove = (e) => {
    touchEndX.current = e.nativeEvent.pageX || e.nativeEvent.touches[0].pageX;
  };

  const onTouchEnd = (handleNext, handlePrevious) => {
    if (touchStartX.current === null || touchEndX.current === null) return;
    
    const distance = touchStartX.current - touchEndX.current;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrevious();
    }
    
    touchStartX.current = null;
    touchEndX.current = null;
  };

  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [templateName, setTemplateName] = useState('');
  const [templatePrice, setTemplatePrice] = useState('');
  const [templateCategory, setTemplateCategory] = useState('Landing Page');
  const [templateImages, setTemplateImages] = useState([null, null, null, null, null]);
  const [templateImagePreviews, setTemplateImagePreviews] = useState(['', '', '', '', '']);
  const [templateDescription, setTemplateDescription] = useState('');
  const [templateGithubUrl, setTemplateGithubUrl] = useState('');
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (currentUser && currentUser.email) {
      checkAdminStatus(currentUser.email);
    }

    fetchTemplates();

    // Reset selectedTemplate when navigating back to list
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/template' || path === '/template/') {
        setSelectedTemplate(null);
      }
    };

    const handleAppNavigate = () => {
      setSelectedTemplate(null);
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app-navigate', handleAppNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app-navigate', handleAppNavigate);
    };
  }, [currentUser]);

  // Check URL on every render
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/template' || path === '/template/') {
      setSelectedTemplate(null);
    }
  });

  const handleTemplateClick = async (template) => {
    window.history.pushState({ page: 'template', templateId: template.id }, '', `/template/${template.id}`);

    try {
      const response = await fetch(`${API_URL}/api/templates/${template.id}`);
      if (response.ok) {
        const fullTemplate = await response.json();
        setSelectedTemplate(fullTemplate);
      }
    } catch (error) {
      console.error('Error fetching template details:', error);
      setSelectedTemplate(template);
    }
  };

  const checkAdminStatus = async (email) => {
    try {
      const response = await fetch(`${API_URL}/api/check-admin?email=${encodeURIComponent(email)}`);
      if (response.ok) {
        const data = await response.json();
        const isAdminValue = data.is_admin || false;
        setIsAdmin(isAdminValue);
        console.log('Admin status:', isAdminValue);
      }
    } catch (error) {
      console.log('Error checking admin status:', error);
    }
  };

  const [selectedCategory, setSelectedCategory] = useState('All');

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(Array.isArray(data) ? data : []);
      } else {
        setTemplates([{ id: 1, name: 'E-commerce Template', description: 'Online store template', github_url: 'https://github.com', image_url: 'https://via.placeholder.com/600x350?text=Template+1', tags: ['React', 'Node.js'] }]);
      }
    } catch (error) {
      console.log('Error:', error);
      setTemplates([{ id: 1, name: 'E-commerce Template', description: 'Online store template', github_url: 'https://github.com', image_url: 'https://via.placeholder.com/600x350?text=Template+1', tags: ['React', 'Node.js'] }]);
    } finally { setLoading(false); }
  };

  const openAddModal = () => {
    setEditingTemplate(null);
    setTemplateName('');
    setTemplatePrice('');
    setTemplateCategory('Landing Page');
    setTemplateImages([null, null, null, null, null]);
    setTemplateImagePreviews(['', '', '', '', '']);
    setTemplateDescription('');
    setTemplateGithubUrl('');
    setShowAdminModal(true);
  };

  const openEditModal = (template) => {
    setEditingTemplate(template);
    setTemplateName(template.name);
    setTemplatePrice(template.price || '');
    setTemplateCategory(template.category || 'Landing Page');
    setTemplateImages([null, null, null, null, null]);
    setTemplateImagePreviews([
      template.image_url || '',
      template.image_url_2 || '',
      template.image_url_3 || '',
      template.image_url_4 || '',
      template.image_url_5 || ''
    ]);
    setTemplateDescription(template.description);
    setTemplateGithubUrl(template.github_url);
    setShowAdminModal(true);
  };

  const handleImageSelect = (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        const newImages = [...templateImages];
        const newPreviews = [...templateImagePreviews];
        newImages[index] = file;
        const reader = new FileReader();
        reader.onload = (event) => {
          newPreviews[index] = event.target.result;
          setTemplateImagePreviews(newPreviews);
        };
        reader.readAsDataURL(file);
        setTemplateImages(newImages);
      }
    };
    input.click();
  };

  const removeImage = (index) => {
    const newImages = [...templateImages];
    const newPreviews = [...templateImagePreviews];
    newImages[index] = null;
    newPreviews[index] = '';
    setTemplateImages(newImages);
    setTemplateImagePreviews(newPreviews);
  };

  const handleSubmit = async () => {
    if (!templateName || !templatePrice) {
      toast.error('Please fill all required fields');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('name', templateName);
      formData.append('description', templateDescription);
      formData.append('github_url', templateGithubUrl);
      formData.append('category', templateCategory);
      formData.append('price', templatePrice);
      templateImages.forEach((img, index) => {
        if (img) formData.append(`image_${index + 1}`, img);
      });
      const url = editingTemplate ? `${API_URL}/api/templates/${editingTemplate.id}` : `${API_URL}/api/templates`;
      const response = await fetch(url, {
        method: editingTemplate ? 'PUT' : 'POST',
        body: formData,
        credentials: 'include'
      });
      if (response.ok) {
        toast.success(editingTemplate ? 'Template updated!' : 'Template created!');
        setShowAdminModal(false);
        fetchTemplates();
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

  const handleDelete = async (templateId) => {
    if (!confirm('Delete this template?')) return;
    try {
      const response = await fetch(`${API_URL}/api/templates/${templateId}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) {
        toast.success('Template deleted!');
        fetchTemplates();
      } else {
        toast.error('Failed to delete');
      }
    } catch (error) {
      toast.error('Error deleting template');
    }
  };

  const openGithub = (url) => { window.open(url, '_blank'); };

  // Detail Page View
  if (selectedTemplate) {
    const allImages = [
      selectedTemplate.image_url,
      selectedTemplate.image_url_2,
      selectedTemplate.image_url_3,
      selectedTemplate.image_url_4,
      selectedTemplate.image_url_5
    ].filter(img => img);

    const handlePreviousImage = () => {
      setCurrentImageIndex((prev) => (prev > 0 ? prev - 1 : allImages.length - 1));
    };

    const handleNextImage = () => {
      setCurrentImageIndex((prev) => (prev < allImages.length - 1 ? prev + 1 : 0));
    };

    return (
      <View style={styles.container}>
        <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.detailContainer}>
            <TouchableOpacity style={styles.backButton} onPress={() => {
              setSelectedTemplate(null);
              window.history.pushState({ page: 'template' }, '', '/template');
            }}>
              <Text style={styles.backButtonText}>← Back to Templates</Text>
            </TouchableOpacity>

            <View style={styles.detailLayout}>
              {/* Image Carousel - Left Side */}
              <View style={styles.carouselSide}>
                {allImages.length > 0 && (
                  <View style={styles.carouselContainer}>
                    {allImages.length > 1 && (
                      <TouchableOpacity style={[styles.navButton, styles.navButtonLeft]} onPress={handlePreviousImage}>
                        <Text style={styles.navButtonText}>‹</Text>
                      </TouchableOpacity>
                    )}

                    <View 
                      style={styles.mediaWrapper}
                      onTouchStart={onTouchStart}
                      onTouchMove={onTouchMove}
                      onTouchEnd={() => onTouchEnd(handleNextImage, handlePreviousImage)}
                    >
                      <img
                        src={allImages[currentImageIndex]}
                        alt={selectedTemplate.name}
                        style={{...styles.mainMediaWeb, pointerEvents: 'none'}}
                        draggable={false}
                      />
                    </View>

                    {allImages.length > 1 && (
                      <TouchableOpacity style={[styles.navButton, styles.navButtonRight]} onPress={handleNextImage}>
                        <Text style={styles.navButtonText}>›</Text>
                      </TouchableOpacity>
                    )}

                    {allImages.length > 1 && (
                      <View style={styles.indicatorsContainer}>
                        {allImages.map((_, index) => (
                          <View key={index} style={[styles.indicator, index === currentImageIndex && styles.indicatorActive]} />
                        ))}
                      </View>
                    )}
                  </View>
                )}
              </View>

              {/* Details & Buy - Right Side */}
              <View style={styles.detailsSide}>
                <View style={styles.infoCard}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>TEMPLATE</Text>
                  </View>
                  <Text style={styles.productPrice}>${selectedTemplate.price}</Text>
                  <Text style={styles.productTitle}>{selectedTemplate.name}</Text>
                  <View style={styles.detailCategoryBadge}>
                  </View>

                  <View style={styles.featureList}>
                    <View style={styles.featureItem}>
                      <Text style={styles.featureIcon}>💻</Text>
                      <Text style={styles.featureText}>Full Source Code Access</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Text style={styles.featureIcon}>🚀</Text>
                      <Text style={styles.featureText}>Ready to Deploy</Text>
                    </View>
                    <View style={styles.featureItem}>
                      <Text style={styles.featureIcon}>📱</Text>
                      <Text style={styles.featureText}>Fully Responsive Design</Text>
                    </View>
                  </View>

                  <View style={styles.actionButtons}>
                    <TouchableOpacity style={styles.buyNowBtn} disabled={buyLoading} onPress={() => {
                      setBuyLoading(true);
                      addToCart({
                        id: selectedTemplate.id,
                        name: selectedTemplate.name,
                        price: selectedTemplate.price,
                        image_url: selectedTemplate.image_url,
                        type: 'Template'
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
                        id: selectedTemplate.id,
                        name: selectedTemplate.name,
                        price: selectedTemplate.price,
                        image_url: selectedTemplate.image_url,
                        type: 'Template'
                      });
                      toast.success('Added to cart!');
                    }}>
                      <Text style={styles.addToCartBtnText}>Add to Cart</Text>
                    </TouchableOpacity>
                  </View>

                  {selectedTemplate.github_url && (
                    <TouchableOpacity style={styles.detailGithubButton} onPress={() => openGithub(selectedTemplate.github_url)}>
                      <Text style={styles.detailGithubButtonText}>📄 View on GitHub</Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Description Section */}
                <View style={styles.descriptionSection}>
                  <Text style={styles.sectionTitle}>What you will get</Text>
                  <Text style={styles.descriptionText}>
                    {selectedTemplate.description || "Get a professional, high-performance template. Clean code, modern design, and easy customization to launch your project faster."}
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
        <View style={styles.header}>
          <Text style={styles.title}>Templates</Text>
          <Text style={styles.subtitle}>Ready-to-use templates</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={openAddModal}>
              <Text style={styles.adminButtonText}>+ Add Template</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0066CC" /></View>
        ) : (
          <View style={styles.container}>
            {/* Category Filter */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryFilter}>
              <TouchableOpacity
                style={[styles.categoryButton, selectedCategory === 'All' && styles.categoryButtonActive]}
                onPress={() => setSelectedCategory('All')}
              >
                <Text style={[styles.categoryText, selectedCategory === 'All' && styles.categoryTextActive]}>All</Text>
              </TouchableOpacity>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[styles.categoryButton, selectedCategory === cat && styles.categoryButtonActive]}
                  onPress={() => setSelectedCategory(cat)}
                >
                  <Text style={[styles.categoryText, selectedCategory === cat && styles.categoryTextActive]}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.grid}>
              {templates
                .filter(t => selectedCategory === 'All' || t.category === selectedCategory)
                .map((template) => (
                  <TouchableOpacity key={template.id} style={[styles.card, { width: '45%', margin: 15 }]} onPress={() => handleTemplateClick(template)}>
                    <Image source={{ uri: template.image_url || 'https://via.placeholder.com/600x350?text=No+Image' }} style={[styles.cardImage, { height: 250 }]} />
                    <View style={styles.cardContent}>
                      <Text style={[styles.cardName, { fontSize: 22 }]}>{template.name}</Text>
                      <Text style={[styles.cardPrice, { fontSize: 20 }]}>${template.price}</Text>
                      <View style={styles.categoryBadge}>
                        <Text style={styles.categoryBadgeText}>{template.category || 'Landing Page'}</Text>
                      </View>
                      <Text style={[styles.cardDescription, { fontSize: 15, lineHeight: 20 }]}>{template.description}</Text>
                      <Text style={[styles.viewDetails, { fontSize: 16 }]}>View Details →</Text>
                    </View>
                    {isAdmin && (
                      <View style={styles.adminActionsCard}>
                        <TouchableOpacity style={styles.editButtonSmall} onPress={(e) => { e.stopPropagation(); openEditModal(template); }}><Text style={styles.editButtonTextSmall}>✏️</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.deleteButtonSmall} onPress={(e) => { e.stopPropagation(); handleDelete(template.id); }}><Text style={styles.deleteButtonTextSmall}>🗑️</Text></TouchableOpacity>
                      </View>
                    )}
                  </TouchableOpacity>
                ))}
            </View>
          </View>
        )}
        <ContactUs />
      </ScrollView>

      <Modal visible={showAdminModal} transparent={true} animationType="slide" onRequestClose={() => setShowAdminModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingTemplate ? 'Edit Template' : 'Add Template'}</Text>
              <TextInput style={styles.input} placeholder="Template Name" value={templateName} onChangeText={setTemplateName} placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="Price ($)" value={templatePrice} onChangeText={setTemplatePrice} keyboardType="numeric" placeholderTextColor="#999" />

              {/* Category Selection */}
              <Text style={styles.inputLabel}>Category</Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[styles.categoryOption, templateCategory === cat && styles.categoryOptionActive]}
                    onPress={() => setTemplateCategory(cat)}
                  >
                    <Text style={[styles.categoryOptionText, templateCategory === cat && styles.categoryOptionTextActive]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Image Uploads */}
              <Text style={styles.inputLabel}>Images (Up to 5)</Text>
              {[0, 1, 2, 3, 4].map((index) => (
                <View key={index} style={styles.imageUploadSection}>
                  <TouchableOpacity style={styles.uploadButton} onPress={() => handleImageSelect(index)}>
                    <Text style={styles.uploadButtonText}>{templateImagePreviews[index] ? `Change Image ${index + 1}` : `Add Image ${index + 1}`}</Text>
                  </TouchableOpacity>
                  {templateImagePreviews[index] ? (
                    <View style={styles.previewContainer}>
                      <Image source={{ uri: templateImagePreviews[index] }} style={styles.previewImage} />
                      <TouchableOpacity style={styles.removeImageButton} onPress={() => removeImage(index)}>
                        <Text style={styles.removeImageButtonText}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ) : null}
                </View>
              ))}

              <TextInput style={[styles.input, { height: 80 }]} placeholder="Description" value={templateDescription} onChangeText={setTemplateDescription} multiline placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="GitHub URL" value={templateGithubUrl} onChangeText={setTemplateGithubUrl} placeholderTextColor="#999" />

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAdminModal(false)}><Text style={styles.cancelButtonText}>Cancel</Text></TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={uploading}><Text style={styles.submitButtonText}>{uploading ? 'Saving...' : (editingTemplate ? 'Update' : 'Create')}</Text></TouchableOpacity>
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
  header: { backgroundColor: '#FFFFFF', paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20, position: 'relative' },
  title: { fontSize: 48, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  subtitle: { fontSize: 24, color: '#86868B' },
  adminButton: { marginTop: 20, backgroundColor: '#0066CC', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  adminButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  categoryFilter: { backgroundColor: '#FFFFFF', paddingVertical: 15, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#E5E5E5' },
  categoryButton: { paddingHorizontal: 18, paddingVertical: 8, borderRadius: 20, backgroundColor: '#F5F5F7', marginRight: 10 },
  categoryButtonActive: { backgroundColor: '#0066CC' },
  categoryText: { fontSize: 14, color: '#1D1D1F', fontWeight: '500' },
  categoryTextActive: { color: '#FFFFFF', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', paddingHorizontal: 20, paddingVertical: 20, paddingBottom: 40, maxWidth: 1600, alignSelf: 'center' },
  card: { backgroundColor: '#FFFFFF', borderRadius: 18, margin: 15, overflow: 'hidden', width: '45%', maxWidth: 500, minWidth: 280, boxShadow: '0 4px 16px rgba(0,0,0,0.12)', position: 'relative' },
  cardImage: { width: '100%', height: 250, backgroundColor: '#F5F5F7', resizeMode: 'cover' },
  cardContent: { padding: 20 },
  cardName: { fontSize: 22, fontWeight: '700', color: '#1D1D1F', marginBottom: 8 },
  cardPrice: { fontSize: 20, fontWeight: '700', color: '#10B981', marginBottom: 12 },
  categoryBadge: { backgroundColor: '#E5F0FF', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, alignSelf: 'flex-start', marginBottom: 8 },
  categoryBadgeText: { fontSize: 10, color: '#0066CC', fontWeight: '600' },
  cardDescription: { fontSize: 12, color: '#86868B', lineHeight: 16, marginBottom: 10 },
  githubButton: { backgroundColor: '#24292E', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12, alignItems: 'center' },
  githubButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  adminActionsCard: { position: 'absolute', top: 15, right: 15, flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 12 },
  editButtonSmall: { padding: 8 },
  editButtonTextSmall: { fontSize: 18 },
  deleteButtonSmall: { padding: 8 },
  deleteButtonTextSmall: { fontSize: 18 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '90%', maxWidth: 550, marginBottom: 30 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 25, textAlign: 'center' },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#1D1D1F', marginBottom: 15, borderWidth: 1, borderColor: '#E5E5E5' },
  inputLabel: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 20 },
  categoryOption: { paddingHorizontal: 16, paddingVertical: 10, borderRadius: 12, backgroundColor: '#F5F5F7', flex: 1, minWidth: '30%', alignItems: 'center' },
  categoryOptionActive: { backgroundColor: '#0066CC' },
  categoryOptionText: { fontSize: 14, color: '#1D1D1F', fontWeight: '500' },
  categoryOptionTextActive: { color: '#FFFFFF', fontWeight: '600' },
  imageUploadSection: { marginBottom: 15, padding: 15, backgroundColor: '#F5F5F7', borderRadius: 12 },
  uploadButton: { backgroundColor: '#0066CC', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginBottom: 10 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600', textAlign: 'center' },
  previewContainer: { alignItems: 'center', marginTop: 10 },
  previewImage: { width: '100%', height: 180, borderRadius: 8, marginBottom: 10, resizeMode: 'cover' },
  removeImageButton: { backgroundColor: '#FF3B30', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 6 },
  removeImageButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  viewDetails: { fontSize: 14, color: '#0066CC', fontWeight: '600', marginTop: 10 },
  detailContainer: { maxWidth: 1200, width: '100%', alignSelf: 'center', padding: 20, paddingBottom: 60 },
  backButton: { alignSelf: 'flex-start', marginBottom: 30, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  backButtonText: { fontSize: 15, fontWeight: '600', color: '#0066CC' },
  detailLayout: { flexDirection: 'row', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' },
  carouselSide: { flex: 1.2, minWidth: 350 },
  detailsSide: { flex: 1, minWidth: 350 },
  
  carouselContainer: { position: 'relative', width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  mediaWrapper: { width: '100%', aspectRatio: 1.4, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 18, touchAction: 'none', userSelect: 'none' },
  mainMediaWeb: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  
  navButton: { position: 'absolute', top: '50%', marginTop: -22, backgroundColor: 'rgba(255, 255, 255, 0.9)', borderRadius: 22, width: 44, height: 44, justifyContent: 'center', alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, zIndex: 10 },
  navButtonLeft: { left: 20 },
  navButtonRight: { right: 20 },
  navButtonText: { fontSize: 28, fontWeight: '300', color: '#1D1D1F' },
  
  indicatorsContainer: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', marginTop: 20, gap: 8 },
  indicator: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#D1D1D1' },
  indicatorActive: { backgroundColor: '#0066CC', width: 24 },
  
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
  
  detailCategoryBadge: { backgroundColor: '#E5F0FF', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 16, marginBottom: 20, flexDirection: 'row', alignItems: 'center' },
  detailCategoryLabel: { fontSize: 14, color: '#86868B', fontWeight: '500' },
  detailCategoryText: { fontSize: 14, color: '#0066CC', fontWeight: '600' },
  detailGithubButton: { backgroundColor: '#24292E', paddingHorizontal: 20, paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 20 },
  detailGithubButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
});

export default TemplatePage;
