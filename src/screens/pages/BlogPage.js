import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator, Modal, TextInput, ScrollView, Dimensions } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import ContactUs from '../../components/ContactUs';
import { useToast } from '../../components/ToastNotification';
import { useAuth } from '../../utils/auth';
import API_URL from '../../utils/apiClient';

const BlogPage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [selectedBlog, setSelectedBlog] = useState(null);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    if (typeof window !== 'undefined') {
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }
  }, []);

  const isMobile = screenWidth < 768;

  // Admin state
  const [showAdminModal, setShowAdminModal] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  const [blogTitle, setBlogTitle] = useState('');
  const [blogExcerpt, setBlogExcerpt] = useState('');
  const [blogAuthor, setBlogAuthor] = useState('');
  const [heroImage, setHeroImage] = useState(null);
  const [heroImagePreview, setHeroImagePreview] = useState('');

  // 5 Paragraphs
  const [content, setContent] = useState('');
  const [content2, setContent2] = useState('');
  const [content3, setContent3] = useState('');
  const [content4, setContent4] = useState('');
  const [content5, setContent5] = useState('');

  // 5 Images
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState('');
  const [image2, setImage2] = useState(null);
  const [imagePreview2, setImagePreview2] = useState('');
  const [image3, setImage3] = useState(null);
  const [imagePreview3, setImagePreview3] = useState('');
  const [image4, setImage4] = useState(null);
  const [imagePreview4, setImagePreview4] = useState('');
  const [image5, setImage5] = useState(null);
  const [imagePreview5, setImagePreview5] = useState('');

  const [uploading, setUploading] = useState(false);

  // Helper to reset selectedBlog when navigating to blog list
  const resetIfOnList = () => {
    const path = window.location.pathname;
    if (path === '/blog' || path === '/blog/') {
      setSelectedBlog(null);
    }
  };

  useEffect(() => {
    // Check if user is admin by querying backend
    if (currentUser && currentUser.email) {
      checkAdminStatus(currentUser.email);
    }

    fetchBlogs();

    // Listen for browser back/forward navigation
    const handlePopState = () => {
      resetIfOnList();
    };

    // Listen for custom navigation event from App.js
    const handleAppNavigate = () => {
      resetIfOnList();
    };

    window.addEventListener('popstate', handlePopState);
    window.addEventListener('app-navigate', handleAppNavigate);

    return () => {
      window.removeEventListener('popstate', handlePopState);
      window.removeEventListener('app-navigate', handleAppNavigate);
    };
  }, [currentUser]);

  // Check URL on every render to reset selectedBlog if needed
  useEffect(() => {
    resetIfOnList();
  });

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

  const fetchBlogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/blogs`);
      if (response.ok) {
        const data = await response.json();
        console.log('Fetched blogs:', data);
        // Sort blogs by ID descending (newest first)
        const sortedBlogs = Array.isArray(data) ? [...data].sort((a, b) => b.id - a.id) : [];
        setBlogs(sortedBlogs);
      }
    } catch (error) {
      console.log('Error fetching blogs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlogClick = async (blog) => {
    // Update URL to blog detail
    window.history.pushState({ page: 'blog', blogId: blog.id }, '', `/blog/${blog.id}`);
    
    // Fetch full blog details
    try {
      const response = await fetch(`${API_URL}/api/blogs/${blog.id}`);
      if (response.ok) {
        const fullBlog = await response.json();
        console.log('Full blog data:', fullBlog);
        setSelectedBlog(fullBlog);
      }
    } catch (error) {
      console.error('Error fetching blog details:', error);
      setSelectedBlog(blog);
    }
  };

  const openAddModal = () => {
    setEditingBlog(null);
    setBlogTitle('');
    setBlogExcerpt('');
    setBlogAuthor('');
    setHeroImage(null);
    setHeroImagePreview('');
    setContent('');
    setContent2('');
    setContent3('');
    setContent4('');
    setContent5('');
    setImage(null);
    setImage2(null);
    setImage3(null);
    setImage4(null);
    setImage5(null);
    setImagePreview('');
    setImagePreview2('');
    setImagePreview3('');
    setImagePreview4('');
    setImagePreview5('');
    setShowAdminModal(true);
  };

  const openEditModal = (blog) => {
    setEditingBlog(blog);
    setBlogTitle(blog.title);
    setBlogExcerpt(blog.excerpt);
    setBlogAuthor(blog.author);
    setHeroImagePreview(blog.hero_image_url || '');
    setContent(blog.content);
    setContent2(blog.content_2 || '');
    setContent3(blog.content_3 || '');
    setContent4(blog.content_4 || '');
    setContent5(blog.content_5 || '');
    setImagePreview(blog.image_url || '');
    setImagePreview2(blog.image_url_2 || '');
    setImagePreview3(blog.image_url_3 || '');
    setImagePreview4(blog.image_url_4 || '');
    setImagePreview5(blog.image_url_5 || '');
    setShowAdminModal(true);
  };

  const handleHeroImageSelect = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        setHeroImage(file);
        const reader = new FileReader();
        reader.onload = (event) => setHeroImagePreview(event.target.result);
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleImageSelect = (index) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (index === 1) setImage(file);
        else if (index === 2) setImage2(file);
        else if (index === 3) setImage3(file);
        else if (index === 4) setImage4(file);
        else if (index === 5) setImage5(file);
        
        const reader = new FileReader();
        reader.onload = (event) => {
          if (index === 1) setImagePreview(event.target.result);
          else if (index === 2) setImagePreview2(event.target.result);
          else if (index === 3) setImagePreview3(event.target.result);
          else if (index === 4) setImagePreview4(event.target.result);
          else if (index === 5) setImagePreview5(event.target.result);
        };
        reader.readAsDataURL(file);
      }
    };
    input.click();
  };

  const handleSubmit = async () => {
    if (!blogTitle || !content) {
      toast.error('Please fill in required fields');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', blogTitle);
      formData.append('author', blogAuthor);
      formData.append('excerpt', blogExcerpt);
      if (heroImage) formData.append('hero_image', heroImage);
      formData.append('content', content);
      formData.append('content_2', content2);
      formData.append('content_3', content3);
      formData.append('content_4', content4);
      formData.append('content_5', content5);

      if (image) formData.append('image', image);
      if (image2) formData.append('image_2', image2);
      if (image3) formData.append('image_3', image3);
      if (image4) formData.append('image_4', image4);
      if (image5) formData.append('image_5', image5);

      const url = editingBlog ? `${API_URL}/api/blogs/${editingBlog.id}` : `${API_URL}/api/blogs`;
      const response = await fetch(url, {
        method: editingBlog ? 'PUT' : 'POST',
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        toast.success(editingBlog ? 'Blog updated successfully!' : 'Blog created successfully!');
        setShowAdminModal(false);
        fetchBlogs();
      } else {
        const errorData = await response.json().catch(() => ({}));
        console.error('Backend error:', errorData);
        toast.error(`Failed to save: ${errorData.detail || response.statusText || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error saving blog:', error);
      toast.error(`Error saving blog: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (blogId) => {
    if (!confirm('Delete this blog?')) return;
    try {
      const response = await fetch(`${API_URL}/api/blogs/${blogId}`, { method: 'DELETE', credentials: 'include' });
      if (response.ok) { 
        toast.success('Blog deleted successfully!'); 
        fetchBlogs(); 
      }
      else { 
        toast.error('Failed to delete blog'); 
      }
    } catch (error) { 
      toast.error('Error deleting blog'); 
    }
  };

  const renderAdminSection = (index) => {
    const currentContent = [content, content2, content3, content4, content5][index - 1];
    const setContentFunc = [setContent, setContent2, setContent3, setContent4, setContent5][index - 1];
    const preview = [imagePreview, imagePreview2, imagePreview3, imagePreview4, imagePreview5][index - 1];
    
    return (
      <View key={`section-${index}`} style={styles.adminSection}>
        <Text style={styles.adminSectionLabel}>Paragraph {index}</Text>
        <TextInput 
          style={[styles.input, styles.textArea]} 
          placeholder={`Content for paragraph ${index}...`} 
          value={currentContent} 
          onChangeText={setContentFunc} 
          multiline 
          placeholderTextColor="#999" 
        />
        
        <Text style={styles.adminSectionLabel}>Image {index}</Text>
        <TouchableOpacity style={styles.uploadButton} onPress={() => handleImageSelect(index)}>
          <Text style={styles.uploadButtonText}>{preview ? 'Change Image' : 'Choose Image'}</Text>
        </TouchableOpacity>
        {preview ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: preview }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeImageButton} 
              onPress={() => {
                if (index === 1) { setImage(null); setImagePreview(''); }
                else if (index === 2) { setImage2(null); setImagePreview2(''); }
                else if (index === 3) { setImage3(null); setImagePreview3(''); }
                else if (index === 4) { setImage4(null); setImagePreview4(''); }
                else if (index === 5) { setImage5(null); setImagePreview5(''); }
              }}
            >
              <Text style={styles.removeImageButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    );
  };

  if (selectedBlog) {
    console.log('=== SELECTED BLOG DATA ===');
    console.log('Title:', selectedBlog.title);
    console.log('Content:', selectedBlog.content);
    console.log('Image URL:', selectedBlog.image_url);
    console.log('Image URL 2:', selectedBlog.image_url_2);
    console.log('Image URL 3:', selectedBlog.image_url_3);
    console.log('Full blog object:', JSON.stringify(selectedBlog, null, 2));
    console.log('=========================');

    // Helper to fix image URLs (prepend backend URL for local uploads)
    const fixImageUrl = (url) => {
      if (!url) return null;
      if (url.startsWith('/uploads/')) {
        return `${API_URL}${url}`;
      }
      return url;
    };

    return (
      <View style={styles.container}>
        <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
        <ScrollView style={styles.scrollView}>
          <View style={styles.articleContainer}>
            {/* Hero Image (Image 0) */}
            {selectedBlog.hero_image_url && (
              <Image source={{ uri: fixImageUrl(selectedBlog.hero_image_url) }} style={styles.heroImage} />
            )}
            
            <Text style={styles.articleTitle}>{selectedBlog.title}</Text>
            <Text style={styles.articleAuthor}>By {selectedBlog.author}</Text>
            {selectedBlog.created_at && (
              <Text style={styles.articleDate}>{new Date(selectedBlog.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>
            )}

            {/* Content Sections: Paragraph then Image */}
            {[
              { content: selectedBlog.content, image: selectedBlog.image_url },
              { content: selectedBlog.content_2, image: selectedBlog.image_url_2 },
              { content: selectedBlog.content_3, image: selectedBlog.image_url_3 },
              { content: selectedBlog.content_4, image: selectedBlog.image_url_4 },
              { content: selectedBlog.content_5, image: selectedBlog.image_url_5 },
            ].map((section, idx) => (
              (section.content || section.image) && (
                <View key={idx} style={[styles.articleSection, !isMobile && { flexDirection: 'row', alignItems: 'flex-start', paddingHorizontal: 20 }]}>
                  <View style={[styles.articleContent, !isMobile && { width: '60%' }]}>
                    {section.content && <Text style={styles.articleBody}>{section.content}</Text>}
                  </View>
                  {section.image && (
                    <View style={[!isMobile ? { width: '40%', padding: 15 } : { paddingHorizontal: 20, marginBottom: 20 }]}>
                      <Image source={{ uri: fixImageUrl(section.image) }} style={styles.articleImage} />
                    </View>
                  )}
                </View>
              )
            ))}

            <TouchableOpacity style={styles.backButton} onPress={() => {
              setSelectedBlog(null);
              window.history.pushState({ page: 'blog' }, '', '/blog');
            }}>
              <Text style={styles.backButtonText}>← Back to Blogs</Text>
            </TouchableOpacity>
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
          <Text style={styles.title}>Blog</Text>
          <Text style={styles.subtitle}>Articles and insights</Text>
          {isAdmin && (
            <TouchableOpacity style={styles.adminButton} onPress={openAddModal}>
              <Text style={styles.adminButtonText}>+ Add Blog</Text>
            </TouchableOpacity>
          )}
        </View>

        {loading ? (
          <View style={styles.loadingContainer}><ActivityIndicator size="large" color="#0066CC" /></View>
        ) : (
          <View style={styles.blogGrid}>
            {blogs.map((blog) => (
              <TouchableOpacity key={blog.id} style={styles.blogCard} onPress={() => handleBlogClick(blog)}>
                <Image source={{ uri: blog.hero_image_url || blog.image_url }} style={styles.blogImage} />
                <View style={styles.blogContent}>
                  <Text style={styles.blogTitle}>{blog.title}</Text>
                  <Text style={styles.blogExcerpt}>{blog.excerpt}</Text>
                  <Text style={styles.blogAuthor}>By {blog.author}</Text>
                  {blog.created_at && (
                    <Text style={styles.blogDate}>{new Date(blog.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</Text>
                  )}
                  <Text style={styles.readMore}>Read More →</Text>
                </View>
                {isAdmin && (
                  <View style={styles.adminActionsCard}>
                    <TouchableOpacity style={styles.editButtonSmall} onPress={(e) => { e.stopPropagation(); openEditModal(blog); }}>
                      <Text style={styles.editButtonTextSmall}>✏️</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.deleteButtonSmall} onPress={(e) => { e.stopPropagation(); handleDelete(blog.id); }}>
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

      <Modal visible={showAdminModal} transparent={true} animationType="slide" onRequestClose={() => setShowAdminModal(false)}>
        <View style={styles.modalOverlay}>
          <ScrollView style={styles.modalScrollView}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{editingBlog ? 'Edit Blog' : 'Add Blog'}</Text>

              {/* Hero Image (Optional, shows before title) */}
              <Text style={styles.inputLabel}>Hero Image (Optional - Shows before title, centered)</Text>
              <TouchableOpacity style={styles.uploadButton} onPress={handleHeroImageSelect}>
                <Text style={styles.uploadButtonText}>{heroImagePreview ? 'Change Hero Image' : 'Add Hero Image'}</Text>
              </TouchableOpacity>
              {heroImagePreview ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: heroImagePreview }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => { setHeroImage(null); setHeroImagePreview(''); }}>
                    <Text style={styles.removeImageButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : null}

              <TextInput style={styles.input} placeholder="Title" value={blogTitle} onChangeText={setBlogTitle} placeholderTextColor="#999" />

              {/* Render 5 sections */}
              {[1, 2, 3, 4, 5].map(index => renderAdminSection(index))}

              <View style={styles.modalButtons}>
                <TouchableOpacity style={styles.cancelButton} onPress={() => setShowAdminModal(false)}>
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.submitButton} onPress={handleSubmit} disabled={uploading}>
                  <Text style={styles.submitButtonText}>{uploading ? 'Saving...' : (editingBlog ? 'Update' : 'Create')}</Text>
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
  header: { backgroundColor: '#FFFFFF', paddingVertical: 60, paddingHorizontal: 20, alignItems: 'center', marginBottom: 20, position: 'relative' },
  title: { fontSize: 48, fontWeight: '700', color: '#1D1D1F', marginBottom: 10 },
  subtitle: { fontSize: 24, color: '#86868B' },
  adminButton: { marginTop: 20, backgroundColor: '#0066CC', paddingHorizontal: 25, paddingVertical: 12, borderRadius: 25 },
  adminButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  manageButton: {
    marginTop: 20,
    backgroundColor: '#0066CC',
    paddingHorizontal: 25,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  manageButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  blogList: { paddingHorizontal: 20, paddingBottom: 60, maxWidth: 1620, alignSelf: 'center' },
  blogGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, paddingHorizontal: 20, paddingBottom: 60, maxWidth: 1620, alignSelf: 'center' },
  blogCard: { backgroundColor: '#FFFFFF', borderRadius: 18, overflow: 'hidden', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', position: 'relative', flex: 1, minWidth: 300, maxWidth: 500 },
  blogImage: { width: '100%', height: 'auto', minHeight: 200, backgroundColor: '#F5F5F7', resizeMode: 'contain' },
  blogContent: { padding: 18 },
  blogTitle: { fontSize: 20, fontWeight: '700', color: '#1D1D1F', marginBottom: 8 },
  blogExcerpt: { fontSize: 14, color: '#86868B', lineHeight: 20, marginBottom: 12 },
  blogAuthor: { fontSize: 12, color: '#1D1D1F', fontWeight: '600', marginBottom: 6 },
  blogDate: { fontSize: 12, color: '#86868B', marginBottom: 8 },
  readMore: { fontSize: 14, color: '#0066CC', fontWeight: '600' },
  adminActionsCard: { position: 'absolute', top: 15, right: 15, flexDirection: 'row', gap: 10, backgroundColor: 'rgba(255,255,255,0.9)', padding: 10, borderRadius: 12 },
  editButtonSmall: { padding: 8 },
  editButtonTextSmall: { fontSize: 18 },
  deleteButtonSmall: { padding: 8 },
  deleteButtonTextSmall: { fontSize: 18 },
  articleContainer: { backgroundColor: '#FFFFFF', marginVertical: 0, borderRadius: 0, width: '100%', padding: 0 },
  heroImage: { width: '100%', height: 320, resizeMode: 'cover', backgroundColor: '#F5F5F7', alignSelf: 'center', borderRadius: 0, marginBottom: 20 },
  articleSection: { marginBottom: 30, width: '100%' },
  articleImage: { width: '100%', height: 250, backgroundColor: '#F5F5F7', resizeMode: 'cover', borderRadius: 12 },
  articleContent: { width: '100%', paddingVertical: 15, paddingHorizontal: 20 },
  articleTitle: { fontSize: 32, fontWeight: '700', color: '#1D1D1F', marginBottom: 15, lineHeight: 40, paddingHorizontal: 20 },
  articleAuthor: { fontSize: 15, color: '#1D1D1F', fontWeight: '600', marginBottom: 10, paddingBottom: 15, marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  articleDate: { fontSize: 13, color: '#86868B', marginBottom: 20, paddingBottom: 15, marginHorizontal: 20, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  articleBody: { fontSize: 17, color: '#1D1D1F', lineHeight: 28 },
  backButton: { marginTop: 40, marginBottom: 40, paddingVertical: 15, paddingHorizontal: 25, backgroundColor: '#0066CC', borderRadius: 12, alignSelf: 'center' },
  backButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { backgroundColor: '#FFFFFF', borderRadius: 20, padding: 30, width: '90%', maxWidth: 500 },
  modalTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 25, textAlign: 'center' },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 15, paddingVertical: 12, fontSize: 16, color: '#1D1D1F', marginBottom: 15, borderWidth: 1, borderColor: '#E5E5E5' },
  textArea: { height: 120, textAlignVertical: 'top' },
  adminSection: { marginBottom: 20, padding: 15, backgroundColor: '#F5F5F7', borderRadius: 12 },
  adminSectionLabel: { fontSize: 16, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  uploadButton: { backgroundColor: '#0066CC', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, marginBottom: 10 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  previewContainer: { alignItems: 'center', marginTop: 10 },
  previewImage: { width: '100%', height: 200, borderRadius: 8, marginBottom: 10 },
  removeImageButton: { backgroundColor: '#FF3B30', paddingHorizontal: 15, paddingVertical: 6, borderRadius: 6 },
  removeImageButtonText: { color: '#FFFFFF', fontSize: 12, fontWeight: '600' },
  modalButtons: { flexDirection: 'row', gap: 12, marginTop: 10 },
  cancelButton: { flex: 1, backgroundColor: '#F5F5F7', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#1D1D1F', fontSize: 16, fontWeight: '600' },
  submitButton: { flex: 1, backgroundColor: '#0066CC', paddingVertical: 14, borderRadius: 12, alignItems: 'center' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
});

export default BlogPage;
