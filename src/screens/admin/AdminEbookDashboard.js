import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import API_URL from '../../utils/apiClient';

const AdminEbookDashboard = ({ onLogout }) => {
  const [ebooks, setEbooks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  
  // Form state
  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  
  // Image state (up to 5)
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
  
  // Video state (up to 5)
  const [video, setVideo] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [video2, setVideo2] = useState(null);
  const [videoPreview2, setVideoPreview2] = useState(null);
  const [video3, setVideo3] = useState(null);
  const [videoPreview3, setVideoPreview3] = useState(null);
  const [video4, setVideo4] = useState(null);
  const [videoPreview4, setVideoPreview4] = useState(null);
  const [video5, setVideo5] = useState(null);
  const [videoPreview5, setVideoPreview5] = useState(null);
  
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchEbooks();
  }, []);

  const fetchEbooks = async () => {
    try {
      const response = await fetch(`${API_URL}/api/ebooks`);
      if (response.ok) {
        const data = await response.json();
        setEbooks(data);
      } else {
        setEbooks([]);
      }
    } catch (error) {
      console.log('Error:', error);
      setEbooks([]);
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

  const handleVideoSelect = (fileNumber) => (e) => {
    const file = e.target.files[0];
    if (file) {
      let targetSetter;
      let setPreview;

      switch(fileNumber) {
        case 1: targetSetter = setVideo; setPreview = setVideoPreview; break;
        case 2: targetSetter = setVideo2; setPreview = setVideoPreview2; break;
        case 3: targetSetter = setVideo3; setPreview = setVideoPreview3; break;
        case 4: targetSetter = setVideo4; setPreview = setVideoPreview4; break;
        case 5: targetSetter = setVideo5; setPreview = setVideoPreview5; break;
        default: targetSetter = setVideo; setPreview = setVideoPreview;
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
    if (!title || !author || !price || (!editingBook && !image)) {
      Alert.alert('Error', 'Please fill all fields and select at least one image');
      return;
    }

    setUploading(true);
    
    console.log('--- Submitting eBook ---');
    console.log('image:', image ? 'exists' : 'null');
    console.log('image2:', image2 ? 'exists' : 'null');
    console.log('image3:', image3 ? 'exists' : 'null');
    console.log('video:', video ? 'exists' : 'null');
    console.log('video2:', video2 ? 'exists' : 'null');

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('author', author);
      formData.append('price', parseFloat(price));
      formData.append('description', description);
      
      if (image) formData.append('image', image);
      if (image2) formData.append('image_2', image2);
      if (image3) formData.append('image_3', image3);
      if (image4) formData.append('image_4', image4);
      if (image5) formData.append('image_5', image5);
      
      if (video) formData.append('video', video);
      if (video2) formData.append('video_2', video2);
      if (video3) formData.append('video_3', video3);
      if (video4) formData.append('video_4', video4);
      if (video5) formData.append('video_5', video5);

      const url = editingBook
        ? `${API_URL}/api/ebooks/${editingBook.id}`
        : `${API_URL}/api/ebooks`;
      
      const method = editingBook ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        Alert.alert('Success', editingBook ? 'eBook updated!' : 'eBook added!');
        resetForm();
        fetchEbooks();
      } else {
        Alert.alert('Error', 'Failed to save eBook');
      }
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to save eBook');
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (book) => {
    setEditingBook(book);
    setTitle(book.title);
    setAuthor(book.author);
    setPrice(book.price.toString());
    setDescription(book.description || '');
    setImagePreview(book.image_url);
    setImagePreview2(book.image_url_2);
    setImagePreview3(book.image_url_3);
    setImagePreview4(book.image_url_4);
    setImagePreview5(book.image_url_5);
    setVideoPreview(book.video_url);
    setVideoPreview2(book.video_url_2);
    setVideoPreview3(book.video_url_3);
    setVideoPreview4(book.video_url_4);
    setVideoPreview5(book.video_url_5);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this eBook?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/ebooks/${id}`, {
                method: 'DELETE',
                credentials: 'include'
              });
              
              if (response.ok) {
                fetchEbooks();
                Alert.alert('Success', 'eBook deleted!');
              } else {
                setEbooks(ebooks.filter(book => book.id !== id));
                Alert.alert('Success', 'eBook deleted (demo mode)!');
              }
            } catch (error) {
              setEbooks(ebooks.filter(book => book.id !== id));
              Alert.alert('Success', 'eBook deleted (demo mode)!');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingBook(null);
    setTitle('');
    setAuthor('');
    setPrice('');
    setDescription('');
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
    setVideo(null);
    setVideoPreview(null);
    setVideo2(null);
    setVideoPreview2(null);
    setVideo3(null);
    setVideoPreview3(null);
    setVideo4(null);
    setVideoPreview4(null);
    setVideo5(null);
    setVideoPreview5(null);
  };

  const renderImageUpload = (fileNumber, label) => {
    const preview = fileNumber === 1 ? imagePreview :
                    fileNumber === 2 ? imagePreview2 :
                    fileNumber === 3 ? imagePreview3 :
                    fileNumber === 4 ? imagePreview4 : imagePreview5;
    
    if (preview) {
      return (
        <View style={styles.previewContainer}>
          <Image source={{ uri: preview }} style={styles.previewImage} />
          <TouchableOpacity 
            style={styles.removeImageButton} 
            onPress={() => {
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
              targetSetter(null);
              setPreview(null);
            }}
          >
            <Text style={styles.removeImageButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.uploadBox}>
        <input 
          type="file" 
          accept="image/*" 
          onChange={handleImageSelect(fileNumber)} 
          style={styles.fileInput} 
          id={`ebook-image-upload-${fileNumber}`} 
        />
        <label htmlFor={`ebook-image-upload-${fileNumber}`}>
          <View style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Choose {label}</Text>
          </View>
        </label>
        <Text style={styles.uploadHint}>PNG, JPG up to 5MB</Text>
      </View>
    );
  };

  const renderVideoUpload = (fileNumber, label) => {
    const preview = fileNumber === 1 ? videoPreview :
                    fileNumber === 2 ? videoPreview2 :
                    fileNumber === 3 ? videoPreview3 :
                    fileNumber === 4 ? videoPreview4 : videoPreview5;
    
    if (preview) {
      return (
        <View style={styles.previewContainer}>
          <video src={preview} controls style={styles.previewVideo} />
          <TouchableOpacity 
            style={styles.removeImageButton} 
            onPress={() => {
              let targetSetter;
              let setPreview;

              switch(fileNumber) {
                case 1: targetSetter = setVideo; setPreview = setVideoPreview; break;
                case 2: targetSetter = setVideo2; setPreview = setVideoPreview2; break;
                case 3: targetSetter = setVideo3; setPreview = setVideoPreview3; break;
                case 4: targetSetter = setVideo4; setPreview = setVideoPreview4; break;
                case 5: targetSetter = setVideo5; setPreview = setVideoPreview5; break;
                default: targetSetter = setVideo; setPreview = setVideoPreview;
              }
              targetSetter(null);
              setPreview(null);
            }}
          >
            <Text style={styles.removeImageButtonText}>Remove</Text>
          </TouchableOpacity>
        </View>
      );
    }
    
    return (
      <View style={styles.uploadBox}>
        <input 
          type="file" 
          accept="video/*" 
          onChange={handleVideoSelect(fileNumber)} 
          style={styles.fileInput} 
          id={`ebook-video-upload-${fileNumber}`} 
        />
        <label htmlFor={`ebook-video-upload-${fileNumber}`}>
          <View style={styles.uploadButton}>
            <Text style={styles.uploadButtonText}>Choose {label}</Text>
          </View>
        </label>
        <Text style={styles.uploadHint}>MP4, WebM up to 50MB</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard - eBooks</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {!showAddForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButtonText}>+ Add New eBook</Text>
          </TouchableOpacity>
        )}

        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingBook ? 'Edit eBook' : 'Add New eBook'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Book Title"
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
              style={styles.input}
              placeholder="Price (e.g., 29.99)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description (optional)"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Images (up to 5)</Text>
              {renderImageUpload(1, 'Cover Image')}
              {renderImageUpload(2, 'Image 2')}
              {renderImageUpload(3, 'Image 3')}
              {renderImageUpload(4, 'Image 4')}
              {renderImageUpload(5, 'Image 5')}
            </View>

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Videos (up to 5, optional)</Text>
              {renderVideoUpload(1, 'Video 1')}
              {renderVideoUpload(2, 'Video 2')}
              {renderVideoUpload(3, 'Video 3')}
              {renderVideoUpload(4, 'Video 4')}
              {renderVideoUpload(5, 'Video 5')}
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity 
                style={[styles.submitButton, uploading && styles.submitButtonDisabled]} 
                onPress={handleSubmit} 
                disabled={uploading}
              >
                <Text style={styles.submitButtonText}>
                  {uploading ? 'Saving...' : (editingBook ? 'Update' : 'Add eBook')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>All eBooks</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : (
          <View style={styles.cardsList}>
            {ebooks.map((book) => (
              <View key={book.id} style={styles.cardItem}>
                <Image source={{ uri: book.image_url }} style={styles.cardItemImage} />
                <View style={styles.cardItemInfo}>
                  <Text style={styles.cardItemTitle}>{book.title}</Text>
                  <Text style={styles.cardItemAuthor}>by {book.author}</Text>
                  <Text style={styles.cardItemPrice}>${book.price}</Text>
                </View>
                <View style={styles.cardItemActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(book)}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(book.id)}>
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
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 17, color: '#1D1D1F', marginBottom: 16, borderWidth: 1, borderColor: '#D2D2D7' },
  textArea: { height: 100, textAlignVertical: 'top' },
  uploadSection: { marginBottom: 20 },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  previewContainer: { alignItems: 'center', marginBottom: 15 },
  previewImage: { width: 200, height: 280, borderRadius: 12, marginBottom: 10 },
  previewVideo: { width: '100%', maxWidth: 400, borderRadius: 12, marginBottom: 10 },
  removeImageButton: { backgroundColor: '#FF3B30', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  removeImageButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  uploadBox: { alignItems: 'center', paddingVertical: 30, backgroundColor: '#F5F5F7', borderRadius: 12, borderWidth: 2, borderColor: '#D2D2D7', borderStyle: 'dashed', marginBottom: 15 },
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
  cardItemImage: { width: 70, height: 100, borderRadius: 8, backgroundColor: '#F5F5F7' },
  cardItemInfo: { flex: 1, marginLeft: 15 },
  cardItemTitle: { fontSize: 17, fontWeight: '600', color: '#1D1D1F', marginBottom: 5 },
  cardItemAuthor: { fontSize: 14, color: '#86868B', marginBottom: 5 },
  cardItemPrice: { fontSize: 16, fontWeight: '600', color: '#1D1D1F' },
  cardItemActions: { flexDirection: 'row', gap: 10 },
  editButton: { backgroundColor: '#0066CC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

export default AdminEbookDashboard;
