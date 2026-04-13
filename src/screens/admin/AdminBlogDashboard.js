import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import API_URL from '../../utils/apiClient';

const AdminBlogDashboard = ({ onLogout }) => {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBlog, setEditingBlog] = useState(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [excerpt, setExcerpt] = useState('');
  
  // Paragraphs state
  const [content, setContent] = useState('');
  const [content2, setContent2] = useState('');
  const [content3, setContent3] = useState('');
  const [content4, setContent4] = useState('');
  const [content5, setContent5] = useState('');

  // Images state
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [image2, setImage2] = useState(null);
  const [imagePreview2, setImagePreview2] = useState(null);
  const [image3, setImage3] = useState(null);
  const [imagePreview3, setImagePreview3] = useState(null);
  const [image4, setImage4] = useState(null);
  const [imagePreview4, setImagePreview4] = useState(null);
  const [image5, setImage5] = useState(null);
  const [imagePreview5, setImagePreview5] = useState(null);

  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchBlogs();
  }, []);

  const fetchBlogs = async () => {
    try {
      const response = await fetch(`${API_URL}/api/blogs`);
      if (response.ok) {
        const data = await response.json();
        setBlogs(data);
      } else {
        setBlogs([
          { 
            id: 1, 
            title: 'Getting Started with React Native', 
            excerpt: 'Learn how to build your first mobile app...',
            author: 'John Doe',
            created_at: '2026-03-28',
            image_url: 'https://via.placeholder.com/800x400?text=Blog+1'
          },
        ]);
      }
    } catch (error) {
      console.log('Error:', error);
      setBlogs([
        { 
          id: 1, 
          title: 'Getting Started with React Native', 
          excerpt: 'Learn how to build your first mobile app...',
          author: 'John Doe',
          created_at: '2026-03-28',
          image_url: 'https://via.placeholder.com/800x400?text=Blog+1'
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (fileNumber) => (e) => {
    const file = e.target.files[0];
    if (file) {
      let targetSetter;
      let setPreview;

      switch(fileNumber) {
        case 1: targetSetter = setImage; setPreview = setImagePreview; break;
        case 2: targetSetter = setImage2; setPreview = setImagePreview2; break;
        case 3: targetSetter = setImage3; setPreview = setImagePreview3; break;
        case 4: targetSetter = setImage4; setPreview = setImagePreview4; break;
        case 5: targetSetter = setImage5; setPreview = setImagePreview5; break;
        default: targetSetter = setImage; setPreview = setImagePreview;
      }
      
      targetSetter(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!title || !author || !excerpt || !content || (!editingBlog && !image)) {
      Alert.alert('Error', 'Please fill all required fields and select at least one image');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('author', author);
      formData.append('excerpt', excerpt);
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

      const url = editingBlog
        ? `${API_URL}/api/blogs/${editingBlog.id}`
        : `${API_URL}/api/blogs`;
      
      const method = editingBlog ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', editingBlog ? 'Blog post updated!' : 'Blog post added!');
        resetForm();
        fetchBlogs();
      } else {
        Alert.alert('Error', 'Failed to save blog post');
      }
    } catch (error) {
      console.log('Error:', error);
      if (!editingBlog) {
        const newBlog = {
          id: Date.now(),
          title,
          author,
          excerpt,
          content,
          image_url: imagePreview,
          created_at: new Date().toISOString(),
        };
        setBlogs([newBlog, ...blogs]);
        Alert.alert('Success', 'Blog post added (demo mode)!');
        resetForm();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (blog) => {
    setEditingBlog(blog);
    setTitle(blog.title);
    setAuthor(blog.author);
    setExcerpt(blog.excerpt);
    setContent(blog.content);
    setContent2(blog.content_2 || '');
    setContent3(blog.content_3 || '');
    setContent4(blog.content_4 || '');
    setContent5(blog.content_5 || '');
    setImagePreview(blog.image_url);
    setImagePreview2(blog.image_url_2);
    setImagePreview3(blog.image_url_3);
    setImagePreview4(blog.image_url_4);
    setImagePreview5(blog.image_url_5);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this blog post?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/blogs/${id}`, {
                method: 'DELETE',
              });
              
              if (response.ok) {
                fetchBlogs();
                Alert.alert('Success', 'Blog post deleted!');
              } else {
                setBlogs(blogs.filter(blog => blog.id !== id));
                Alert.alert('Success', 'Blog post deleted (demo mode)!');
              }
            } catch (error) {
              setBlogs(blogs.filter(blog => blog.id !== id));
              Alert.alert('Success', 'Blog post deleted (demo mode)!');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingBlog(null);
    setTitle('');
    setAuthor('');
    setExcerpt('');
    setContent('');
    setContent2('');
    setContent3('');
    setContent4('');
    setContent5('');
    setImage(null);
    setImagePreview(null);
    setImage2(null);
    setImagePreview2(null);
    setImage3(null);
    setImagePreview3(null);
    setImage4(null);
    setImagePreview4(null);
    setImage5(null);
    setImagePreview5(null);
  };

  const renderSection = (index) => {
    const currentContent = [content, content2, content3, content4, content5][index - 1];
    const setContentFunc = [setContent, setContent2, setContent3, setContent4, setContent5][index - 1];
    const preview = [imagePreview, imagePreview2, imagePreview3, imagePreview4, imagePreview5][index - 1];
    
    return (
      <View key={`section-${index}`} style={styles.sectionContainer}>
        <Text style={styles.sectionLabel}>Paragraph {index}</Text>
        <TextInput
          style={[styles.input, styles.contentArea]}
          placeholder={`Write paragraph ${index} content here...`}
          value={currentContent}
          onChangeText={setContentFunc}
          multiline
          numberOfLines={6}
          placeholderTextColor="#999"
        />

        <Text style={styles.uploadLabel}>Image {index}</Text>
        {preview ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: preview }} style={styles.previewImage} />
            <TouchableOpacity 
              style={styles.removeImageButton} 
              onPress={() => {
                let targetSetter;
                let setPreview;
                switch(index) {
                  case 1: targetSetter = setImage; setPreview = setImagePreview; break;
                  case 2: targetSetter = setImage2; setPreview = setImagePreview2; break;
                  case 3: targetSetter = setImage3; setPreview = setImagePreview3; break;
                  case 4: targetSetter = setImage4; setPreview = setImagePreview4; break;
                  case 5: targetSetter = setImage5; setPreview = setImagePreview5; break;
                  default: targetSetter = setImage; setPreview = setImagePreview;
                }
                targetSetter(null);
                setPreview(null);
              }}
            >
              <Text style={styles.removeImageButtonText}>Remove</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.uploadBox}>
            <input 
              type="file" 
              accept="image/*" 
              onChange={handleImageSelect(index)} 
              style={styles.fileInput} 
              id={`blog-image-upload-${index}`} 
            />
            <label htmlFor={`blog-image-upload-${index}`}>
              <View style={styles.uploadButton}>
                <Text style={styles.uploadButtonText}>Choose Image {index}</Text>
              </View>
            </label>
            <Text style={styles.uploadHint}>PNG, JPG up to 5MB</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard - Blog</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {!showAddForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButtonText}>+ Write New Article</Text>
          </TouchableOpacity>
        )}

        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingBlog ? 'Edit Article' : 'Write New Article'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Article Title"
              value={title}
              onChangeText={setTitle}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Author Name"
              value={author}
              onChangeText={setAuthor}
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Excerpt (short description for listing)"
              value={excerpt}
              onChangeText={setExcerpt}
              multiline
              numberOfLines={3}
              placeholderTextColor="#999"
            />

            {/* Structured Content Sections */}
            {renderSection(1)}
            {renderSection(2)}
            {renderSection(3)}
            {renderSection(4)}
            {renderSection(5)}

            <View style={styles.formButtons}>
              <TouchableOpacity style={[styles.submitButton, uploading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={uploading}>
                <Text style={styles.submitButtonText}>{uploading ? 'Publishing...' : (editingBlog ? 'Update Article' : 'Publish Article')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>All Articles</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : (
          <View style={styles.cardsList}>
            {blogs.map((blog) => (
              <View key={blog.id} style={styles.cardItem}>
                <Image source={{ uri: blog.image_url }} style={styles.cardItemImage} />
                <View style={styles.cardItemInfo}>
                  <Text style={styles.cardItemTitle}>{blog.title}</Text>
                  <Text style={styles.cardItemExcerpt}>{blog.excerpt}</Text>
                  <View style={styles.cardItemMeta}>
                    <Text style={styles.cardItemAuthor}>By {blog.author}</Text>
                    <Text style={styles.cardItemDate}>{blog.date ? new Date(blog.date).toLocaleDateString() : 'N/A'}</Text>
                  </View>
                </View>
                <View style={styles.cardItemActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(blog)}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(blog.id)}>
                    <Text style={styles.deleteButtonText}>Delete</Text>
                  </TouchableOpacity>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#FFFFFF', paddingVertical: 20, paddingHorizontal: 30, borderBottomWidth: 1, borderBottomColor: '#D2D2D7' },
  title: { fontSize: 24, fontWeight: '700', color: '#1D1D1F' },
  logoutButton: { backgroundColor: '#FF3B30', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  logoutButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  content: { flex: 1, padding: 30 },
  addButton: { backgroundColor: '#0066CC', paddingVertical: 15, paddingHorizontal: 25, borderRadius: 12, alignSelf: 'flex-start', marginBottom: 20 },
  addButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  formCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 30, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  formTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 20 },
  sectionContainer: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  sectionLabel: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 10,
  },
  contentArea: { height: 120, textAlignVertical: 'top', fontSize: 15 },
  uploadSection: { marginBottom: 10 },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: '#1D1D1F', marginBottom: 10, marginTop: 10 },
  previewContainer: { alignItems: 'center' },
  previewImage: { width: 400, height: 200, borderRadius: 12, marginBottom: 10 },
  removeImageButton: { backgroundColor: '#FF3B30', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  removeImageButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  uploadBox: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#F5F5F7', borderRadius: 12, borderWidth: 2, borderColor: '#D2D2D7', borderStyle: 'dashed' },
  fileInput: { display: 'none' },
  uploadButton: { backgroundColor: '#0066CC', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8, marginBottom: 10 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  uploadHint: { fontSize: 13, color: '#86868B' },
  formButtons: { flexDirection: 'row', gap: 10 },
  submitButton: { backgroundColor: '#34C759', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, flex: 1, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#99DDAA' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancelButton: { backgroundColor: '#8E8E93', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, alignItems: 'center' },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 20 },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  cardsList: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  cardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  cardItemImage: { width: 120, height: 70, borderRadius: 8, backgroundColor: '#F5F5F7' },
  cardItemInfo: { flex: 1, marginLeft: 15 },
  cardItemTitle: { fontSize: 18, fontWeight: '600', color: '#1D1D1F', marginBottom: 8 },
  cardItemExcerpt: { fontSize: 14, color: '#86868B', marginBottom: 8, lineHeight: 20 },
  cardItemMeta: { flexDirection: 'row', justifyContent: 'space-between' },
  cardItemAuthor: { fontSize: 13, color: '#1D1D1F', fontWeight: '500' },
  cardItemDate: { fontSize: 13, color: '#86868B' },
  cardItemActions: { flexDirection: 'row', gap: 10 },
  editButton: { backgroundColor: '#0066CC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

export default AdminBlogDashboard;
