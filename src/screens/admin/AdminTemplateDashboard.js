import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';
import API_URL from '../../utils/apiClient';

const AdminTemplateDashboard = ({ onLogout }) => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [githubUrl, setGithubUrl] = useState('');
  const [tags, setTags] = useState('');
  const [image, setImage] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch(`${API_URL}/api/templates`);
      if (response.ok) {
        const data = await response.json();
        setTemplates(data);
      } else {
        setTemplates([
          { 
            id: 1, 
            name: 'E-commerce Template', 
            description: 'Full e-commerce solution',
            github_url: 'https://github.com/example/ecommerce',
            tags: 'React, Python, E-commerce',
            image: 'https://via.placeholder.com/600x400?text=Template+1'
          },
        ]);
      }
    } catch (error) {
      console.log('Error:', error);
      setTemplates([
        { 
          id: 1, 
          name: 'E-commerce Template', 
          description: 'Full e-commerce solution',
          github_url: 'https://github.com/example/ecommerce',
          tags: 'React, Python, E-commerce',
          image: 'https://via.placeholder.com/600x400?text=Template+1'
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleImageSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async () => {
    if (!name || !description || !githubUrl || !image) {
      Alert.alert('Error', 'Please fill all fields and select an image');
      return;
    }

    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('name', name);
      formData.append('description', description);
      formData.append('github_url', githubUrl);
      formData.append('tags', tags);
      formData.append('image', image);

      const url = editingTemplate
        ? `${API_URL}/api/templates/${editingTemplate.id}`
        : `${API_URL}/api/templates`;
      
      const method = editingTemplate ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method: method,
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', editingTemplate ? 'Template updated!' : 'Template added!');
        resetForm();
        fetchTemplates();
      } else {
        Alert.alert('Error', 'Failed to save template');
      }
    } catch (error) {
      console.log('Error:', error);
      if (!editingTemplate) {
        const newTemplate = {
          id: Date.now(),
          name,
          description,
          github_url: githubUrl,
          tags,
          image: imagePreview,
        };
        setTemplates([...templates, newTemplate]);
        Alert.alert('Success', 'Template added (demo mode)!');
        resetForm();
      }
    } finally {
      setUploading(false);
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setName(template.name);
    setDescription(template.description);
    setGithubUrl(template.github_url);
    setTags(template.tags || '');
    setImagePreview(template.image);
    setShowAddForm(true);
  };

  const handleDelete = async (id) => {
    Alert.alert(
      'Confirm Delete',
      'Are you sure you want to delete this template?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/templates/${id}`, {
                method: 'DELETE',
              });
              
              if (response.ok) {
                fetchTemplates();
                Alert.alert('Success', 'Template deleted!');
              } else {
                setTemplates(templates.filter(t => t.id !== id));
                Alert.alert('Success', 'Template deleted (demo mode)!');
              }
            } catch (error) {
              setTemplates(templates.filter(t => t.id !== id));
              Alert.alert('Success', 'Template deleted (demo mode)!');
            }
          }
        }
      ]
    );
  };

  const resetForm = () => {
    setShowAddForm(false);
    setEditingTemplate(null);
    setName('');
    setDescription('');
    setGithubUrl('');
    setTags('');
    setImage(null);
    setImagePreview(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard - Templates</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {!showAddForm && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButtonText}>+ Add New Template</Text>
          </TouchableOpacity>
        )}

        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>{editingTemplate ? 'Edit Template' : 'Add New Template'}</Text>

            <TextInput
              style={styles.input}
              placeholder="Template Name"
              value={name}
              onChangeText={setName}
              placeholderTextColor="#999"
            />

            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              multiline
              numberOfLines={4}
              placeholderTextColor="#999"
            />

            <TextInput
              style={styles.input}
              placeholder="GitHub Repository URL (e.g., https://github.com/user/repo)"
              value={githubUrl}
              onChangeText={setGithubUrl}
              placeholderTextColor="#999"
              autoCapitalize="none"
            />

            <TextInput
              style={styles.input}
              placeholder="Tags (comma separated, e.g., React, Python, E-commerce)"
              value={tags}
              onChangeText={setTags}
              placeholderTextColor="#999"
            />

            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Template Preview Image</Text>
              
              {imagePreview ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: imagePreview }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => { setImage(null); setImagePreview(null); }}>
                    <Text style={styles.removeImageButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadBox}>
                  <input type="file" accept="image/*" onChange={handleImageSelect} style={styles.fileInput} id="template-image-upload" />
                  <label htmlFor="template-image-upload">
                    <TouchableOpacity style={styles.uploadButton}>
                      <Text style={styles.uploadButtonText}>Choose Image</Text>
                    </TouchableOpacity>
                  </label>
                  <Text style={styles.uploadHint}>PNG, JPG up to 5MB</Text>
                </View>
              )}
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity style={[styles.submitButton, uploading && styles.submitButtonDisabled]} onPress={handleSubmit} disabled={uploading}>
                <Text style={styles.submitButtonText}>{uploading ? 'Saving...' : (editingTemplate ? 'Update' : 'Add Template')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={resetForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>All Templates</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : (
          <View style={styles.cardsList}>
            {templates.map((template) => (
              <View key={template.id} style={styles.cardItem}>
                <Image source={{ uri: template.image }} style={styles.cardItemImage} />
                <View style={styles.cardItemInfo}>
                  <Text style={styles.cardItemName}>{template.name}</Text>
                  <Text style={styles.cardItemDescription}>{template.description}</Text>
                  <Text style={styles.cardItemGithub}>{template.github_url}</Text>
                  {template.tags && (
                    <Text style={styles.cardItemTags}>Tags: {template.tags}</Text>
                  )}
                </View>
                <View style={styles.cardItemActions}>
                  <TouchableOpacity style={styles.editButton} onPress={() => handleEdit(template)}>
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(template.id)}>
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
  previewContainer: { alignItems: 'center' },
  previewImage: { width: 400, height: 220, borderRadius: 12, marginBottom: 10 },
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
  cardItemName: { fontSize: 18, fontWeight: '600', color: '#1D1D1F', marginBottom: 6 },
  cardItemDescription: { fontSize: 14, color: '#86868B', marginBottom: 6, lineHeight: 20 },
  cardItemGithub: { fontSize: 13, color: '#0066CC', marginBottom: 4 },
  cardItemTags: { fontSize: 13, color: '#86868B', fontStyle: 'italic' },
  cardItemActions: { flexDirection: 'row', gap: 10 },
  editButton: { backgroundColor: '#0066CC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  editButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

export default AdminTemplateDashboard;
