import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import API_URL from '../../utils/apiClient';

const AdminDashboard = ({ onLogout, onSectionChange }) => {
  const [giftCards, setGiftCards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCard, setEditingCard] = useState(null);

  // Form state
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  
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
    fetchGiftCards();
  }, []);

  const fetchGiftCards = async () => {
    try {
      const response = await fetch(`${API_URL}/api/gift-cards`);
      if (response.ok) {
        const data = await response.json();
        setGiftCards(data);
      } else {
        // Use sample data
        setGiftCards([
          { id: 1, name: 'Apple Gift Card', price: 50, image_url: 'https://via.placeholder.com/300x200?text=Gift+Card+1' },
          { id: 2, name: 'Premium Gift Card', price: 100, image_url: 'https://via.placeholder.com/300x200?text=Gift+Card+2' },
        ]);
      }
    } catch (error) {
      console.log('Error:', error);
      setGiftCards([
        { id: 1, name: 'Apple Gift Card', price: 50, image_url: 'https://via.placeholder.com/300x200?text=Gift+Card+1' },
        { id: 2, name: 'Premium Gift Card', price: 100, image_url: 'https://via.placeholder.com/300x200?text=Gift+Card+2' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (fileNumber) => (e) => {
    const file = e.target.files[0];
    if (file) {
      const targetSetter = fileNumber === 1 ? setImage : 
                           fileNumber === 2 ? setImage2 :
                           fileNumber === 3 ? setImage3 :
                           fileNumber === 4 ? setImage4 : setImage5;
      const setPreview = fileNumber === 1 ? setImagePreview : 
                         fileNumber === 2 ? setImagePreview2 :
                         fileNumber === 3 ? setImagePreview3 :
                         fileNumber === 4 ? setImagePreview4 : setImagePreview5;
      
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
      const targetSetter = fileNumber === 1 ? setVideo : 
                           fileNumber === 2 ? setVideo2 :
                           fileNumber === 3 ? setVideo3 :
                           fileNumber === 4 ? setVideo4 : setVideo5;
      const setPreview = fileNumber === 1 ? setVideoPreview : 
                         fileNumber === 2 ? setVideoPreview2 :
                         fileNumber === 3 ? setVideoPreview3 :
                         fileNumber === 4 ? setVideoPreview4 : setVideoPreview5;
      
      targetSetter(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!name || !price || (!editingCard && !image)) {
      Alert.alert('Error', 'Please fill all fields and select at least one image');
      return;
    }

    setUploading(true);

    try {
      // Create form data for file upload
      const formData = new FormData();
      formData.append('name', name);
      formData.append('price', parseFloat(price));
      
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

      const url = editingCard
        ? `${API_URL}/api/gift-cards/${editingCard.id}`
        : `${API_URL}/api/gift-cards`;
      
      const method = editingCard ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        body: formData,
        credentials: 'include'
      });

      if (response.ok) {
        Alert.alert('Success', editingCard ? 'Gift card updated!' : 'Gift card added!');
        resetForm();
        fetchGiftCards();
      } else {
        Alert.alert('Error', 'Failed to save gift card');
      }
    } catch (error) {
      console.log('Error:', error);
      // Demo mode - add to local state
      if (!editingCard) {
        const newCard = {
          id: Date.now(),
          name,
          price: parseFloat(price),
          image_url: imagePreview,
        };
        setGiftCards([...giftCards, newCard]);
        Alert.alert('Success', 'Gift card added (demo mode)!');
        resetForm();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (card) => {
    setEditingCard(card);
    setName(card.name);
    setPrice(card.price.toString());
    setImagePreview(card.image_url);
    setImagePreview2(card.image_url_2);
    setImagePreview3(card.image_url_3);
    setImagePreview4(card.image_url_4);
    setImagePreview5(card.image_url_5);
    setVideoPreview(card.video_url);
    setVideoPreview2(card.video_url_2);
    setVideoPreview3(card.video_url_3);
    setVideoPreview4(card.video_url_4);
    setVideoPreview5(card.video_url_5);
    setShowAddForm(true);
  };
//... (handleDelete remains same)
  const resetForm = () => {
    setShowAddForm(false);
    setEditingCard(null);
    setName('');
    setPrice('');
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
              const targetSetter = fileNumber === 1 ? setImage : 
                                   fileNumber === 2 ? setImage2 :
                                   fileNumber === 3 ? setImage3 :
                                   fileNumber === 4 ? setImage4 : setImage5;
              const setPreview = fileNumber === 1 ? setImagePreview : 
                                 fileNumber === 2 ? setImagePreview2 :
                                 fileNumber === 3 ? setImagePreview3 :
                                 fileNumber === 4 ? setImagePreview4 : setImagePreview5;
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
          id={`gift-image-upload-${fileNumber}`} 
        />
        <label htmlFor={`gift-image-upload-${fileNumber}`}>
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
              const targetSetter = fileNumber === 1 ? setVideo : 
                                   fileNumber === 2 ? setVideo2 :
                                   fileNumber === 3 ? setVideo3 :
                                   fileNumber === 4 ? setVideo4 : setVideo5;
              const setPreview = fileNumber === 1 ? setVideoPreview : 
                                 fileNumber === 2 ? setVideoPreview2 :
                                 fileNumber === 3 ? setVideoPreview3 :
                                 fileNumber === 4 ? setVideoPreview4 : setVideoPreview5;
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
          id={`gift-video-upload-${fileNumber}`} 
        />
        <label htmlFor={`gift-video-upload-${fileNumber}`}>
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
        <Text style={styles.title}>Admin Dashboard</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {/* Add New Button */}
        {!showAddForm && (
          <TouchableOpacity 
            style={styles.addButton} 
            onPress={() => setShowAddForm(true)}
          >
            <Text style={styles.addButtonText}>+ Add New Gift Card</Text>
          </TouchableOpacity>
        )}

        {/* Add/Edit Form */}
        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {editingCard ? 'Edit Gift Card' : 'Add New Gift Card'}
            </Text>

            <TextInput
              style={styles.input}
              placeholder="Gift Card Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="Price (e.g., 50)"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              placeholderTextColor="#999"
            />

            {/* Image Upload */}
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Images (up to 5)</Text>
              {renderImageUpload(1, 'Main Image')}
              {renderImageUpload(2, 'Image 2')}
              {renderImageUpload(3, 'Image 3')}
              {renderImageUpload(4, 'Image 4')}
              {renderImageUpload(5, 'Image 5')}
            </View>

            {/* Video Upload */}
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
                  {uploading ? 'Saving...' : (editingCard ? 'Update' : 'Add Gift Card')}
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={resetForm}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Gift Cards List */}
        <Text style={styles.sectionTitle}>All Gift Cards</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : (
          <View style={styles.cardsList}>
            {giftCards.map((card) => (
              <View key={card.id} style={styles.cardItem}>
                <Image source={{ uri: card.image_url }} style={styles.cardItemImage} />
                <View style={styles.cardItemInfo}>
                  <Text style={styles.cardItemName}>{card.name}</Text>
                  <Text style={styles.cardItemPrice}>${card.price}</Text>
                </View>
                <View style={styles.cardItemActions}>
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => handleEdit(card)}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => handleDelete(card.id)}
                  >
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
  container: {
    flex: 1,
    backgroundColor: '#F5F5F7',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 20,
    paddingHorizontal: 30,
    borderBottomWidth: 1,
    borderBottomColor: '#D2D2D7',
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1D1D1F',
  },
  logoutButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  logoutButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  content: {
    flex: 1,
    padding: 30,
  },
  addButton: {
    backgroundColor: '#0066CC',
    paddingVertical: 15,
    paddingHorizontal: 25,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginBottom: 20,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 30,
    marginBottom: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 17,
    color: '#1D1D1F',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#D2D2D7',
  },
  uploadSection: {
    marginBottom: 20,
  },
  uploadLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 10,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  previewImage: {
    width: 300,
    height: 200,
    borderRadius: 12,
    marginBottom: 10,
  },
  previewVideo: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    marginBottom: 10,
  },
  removeImageButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 20,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeImageButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  uploadBox: {
    alignItems: 'center',
    paddingVertical: 30,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D2D2D7',
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  fileInput: {
    display: 'none',
  },
  uploadButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  uploadButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
  uploadHint: {
    fontSize: 13,
    color: '#86868B',
  },
  formButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  submitButton: {
    backgroundColor: '#34C759',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    flex: 1,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#99DDAA',
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cancelButton: {
    backgroundColor: '#8E8E93',
    paddingVertical: 14,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 20,
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  cardsList: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  cardItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F7',
  },
  cardItemImage: {
    width: 100,
    height: 70,
    borderRadius: 8,
    backgroundColor: '#F5F5F7',
  },
  cardItemInfo: {
    flex: 1,
    marginLeft: 15,
  },
  cardItemName: {
    fontSize: 17,
    fontWeight: '600',
    color: '#1D1D1F',
    marginBottom: 5,
  },
  cardItemPrice: {
    fontSize: 15,
    color: '#86868B',
  },
  cardItemActions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    backgroundColor: '#0066CC',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  deleteButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});

export default AdminDashboard;
