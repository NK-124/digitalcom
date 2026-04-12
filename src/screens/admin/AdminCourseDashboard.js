import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, ScrollView, Alert, ActivityIndicator } from 'react-native';

const AdminCourseDashboard = ({ onLogout }) => {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  
  // Course form state
  const [title, setTitle] = useState('');
  const [instructor, setInstructor] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  
  // Video/Note/PDF form state
  const [videoTitle, setVideoTitle] = useState('');
  const [videoUrl, setVideoUrl] = useState('');
  const [videoDuration, setVideoDuration] = useState('');
  const [noteTitle, setNoteTitle] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfFile, setPdfFile] = useState(null);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/courses');
      if (response.ok) {
        const data = await response.json();
        setCourses(data);
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

  const handleThumbnailSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setThumbnail(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setThumbnailPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePdfSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPdfFile(file);
    }
  };

  const handleCreateCourse = async () => {
    if (!title || !instructor || !description || !thumbnail) {
      Alert.alert('Error', 'Please fill all fields and select a thumbnail');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('instructor', instructor);
      formData.append('description', description);
      formData.append('thumbnail', thumbnail);

      const response = await fetch('http://localhost:8000/api/courses', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Course created!');
        resetCourseForm();
        fetchCourses();
      } else {
        Alert.alert('Error', 'Failed to create course');
      }
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to create course');
    } finally {
      setUploading(false);
    }
  };

  const handleAddVideo = async () => {
    if (!selectedCourse || !videoTitle || !videoUrl) {
      Alert.alert('Error', 'Please fill video title and URL');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', videoTitle);
      formData.append('video_url', videoUrl);
      formData.append('duration', videoDuration);

      const response = await fetch(`http://localhost:8000/api/courses/${selectedCourse.id}/videos`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Video added!');
        setVideoTitle('');
        setVideoUrl('');
        setVideoDuration('');
        fetchCourses();
      } else {
        Alert.alert('Error', 'Failed to add video');
      }
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to add video');
    }
  };

  const handleAddNote = async () => {
    if (!selectedCourse || !noteTitle || !noteContent) {
      Alert.alert('Error', 'Please fill note title and content');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', noteTitle);
      formData.append('content', noteContent);

      const response = await fetch(`http://localhost:8000/api/courses/${selectedCourse.id}/notes`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'Note added!');
        setNoteTitle('');
        setNoteContent('');
        fetchCourses();
      } else {
        Alert.alert('Error', 'Failed to add note');
      }
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to add note');
    }
  };

  const handleAddPdf = async () => {
    if (!selectedCourse || !pdfTitle || !pdfFile) {
      Alert.alert('Error', 'Please fill PDF title and select a file');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('title', pdfTitle);
      formData.append('pdf_file', pdfFile);

      const response = await fetch(`http://localhost:8000/api/courses/${selectedCourse.id}/pdfs`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        Alert.alert('Success', 'PDF added!');
        setPdfTitle('');
        setPdfFile(null);
        fetchCourses();
      } else {
        Alert.alert('Error', 'Failed to add PDF');
      }
    } catch (error) {
      console.log('Error:', error);
      Alert.alert('Error', 'Failed to add PDF');
    }
  };

  const handleDeleteCourse = async (id) => {
    Alert.alert('Confirm Delete', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          try {
            const response = await fetch(`http://localhost:8000/api/courses/${id}`, { method: 'DELETE' });
            if (response.ok) {
              fetchCourses();
              Alert.alert('Success', 'Course deleted!');
            }
          } catch (error) {
            Alert.alert('Error', 'Failed to delete course');
          }
        }
      }
    ]);
  };

  const resetCourseForm = () => {
    setShowAddForm(false);
    setEditingCourse(null);
    setTitle('');
    setInstructor('');
    setDescription('');
    setThumbnail(null);
    setThumbnailPreview(null);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard - Courses</Text>
        <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutButtonText}>Logout</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        {!showAddForm && !selectedCourse && (
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddForm(true)}>
            <Text style={styles.addButtonText}>+ Create New Course</Text>
          </TouchableOpacity>
        )}

        {showAddForm && (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>Create New Course</Text>
            <TextInput style={styles.input} placeholder="Course Title" value={title} onChangeText={setTitle} placeholderTextColor="#999" />
            <TextInput style={styles.input} placeholder="Instructor Name" value={instructor} onChangeText={setInstructor} placeholderTextColor="#999" />
            <TextInput style={[styles.input, styles.textArea]} placeholder="Course Description" value={description} onChangeText={setDescription} multiline numberOfLines={4} placeholderTextColor="#999" />
            
            <View style={styles.uploadSection}>
              <Text style={styles.uploadLabel}>Course Thumbnail</Text>
              {thumbnailPreview ? (
                <View style={styles.previewContainer}>
                  <Image source={{ uri: thumbnailPreview }} style={styles.previewImage} />
                  <TouchableOpacity style={styles.removeImageButton} onPress={() => { setThumbnail(null); setThumbnailPreview(null); }}>
                    <Text style={styles.removeImageButtonText}>Remove</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={styles.uploadBox}>
                  <input type="file" accept="image/*" onChange={handleThumbnailSelect} style={styles.fileInput} id="course-thumbnail" />
                  <label htmlFor="course-thumbnail">
                    <TouchableOpacity style={styles.uploadButton}>
                      <Text style={styles.uploadButtonText}>Choose Image</Text>
                    </TouchableOpacity>
                  </label>
                </View>
              )}
            </View>

            <View style={styles.formButtons}>
              <TouchableOpacity style={[styles.submitButton, uploading && styles.submitButtonDisabled]} onPress={handleCreateCourse} disabled={uploading}>
                <Text style={styles.submitButtonText}>{uploading ? 'Creating...' : 'Create Course'}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelButton} onPress={resetCourseForm}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {selectedCourse && (
          <View style={styles.courseDetailCard}>
            <View style={styles.courseDetailHeader}>
              <Text style={styles.courseDetailTitle}>{selectedCourse.title}</Text>
              <TouchableOpacity onPress={() => setSelectedCourse(null)}>
                <Text style={styles.closeButton}>✕</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.courseDetailInstructor}>By {selectedCourse.instructor}</Text>
            <Text style={styles.courseDetailDescription}>{selectedCourse.description}</Text>

            {/* Add Video Section */}
            <View style={styles.resourceSection}>
              <Text style={styles.resourceSectionTitle}>📹 Add Video</Text>
              <TextInput style={styles.input} placeholder="Video Title" value={videoTitle} onChangeText={setVideoTitle} placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="Video URL (YouTube or file path)" value={videoUrl} onChangeText={setVideoUrl} placeholderTextColor="#999" />
              <TextInput style={styles.input} placeholder="Duration (e.g., 10:30)" value={videoDuration} onChangeText={setVideoDuration} placeholderTextColor="#999" />
              <TouchableOpacity style={styles.addResourceButton} onPress={handleAddVideo}>
                <Text style={styles.addResourceButtonText}>Add Video</Text>
              </TouchableOpacity>
            </View>

            {/* Add Note Section */}
            <View style={styles.resourceSection}>
              <Text style={styles.resourceSectionTitle}>📝 Add Note</Text>
              <TextInput style={styles.input} placeholder="Note Title" value={noteTitle} onChangeText={setNoteTitle} placeholderTextColor="#999" />
              <TextInput style={[styles.input, styles.textArea]} placeholder="Note Content" value={noteContent} onChangeText={setNoteContent} multiline numberOfLines={6} placeholderTextColor="#999" />
              <TouchableOpacity style={styles.addResourceButton} onPress={handleAddNote}>
                <Text style={styles.addResourceButtonText}>Add Note</Text>
              </TouchableOpacity>
            </View>

            {/* Add PDF Section */}
            <View style={styles.resourceSection}>
              <Text style={styles.resourceSectionTitle}>📄 Add PDF</Text>
              <TextInput style={styles.input} placeholder="PDF Title" value={pdfTitle} onChangeText={setPdfTitle} placeholderTextColor="#999" />
              <View style={styles.fileSelectBox}>
                <input type="file" accept=".pdf" onChange={handlePdfSelect} style={styles.fileInput} id="pdf-upload" />
                <label htmlFor="pdf-upload">
                  <TouchableOpacity style={styles.fileSelectButton}>
                    <Text style={styles.fileSelectButtonText}>{pdfFile ? pdfFile.name : 'Select PDF File'}</Text>
                  </TouchableOpacity>
                </label>
              </View>
              <TouchableOpacity style={styles.addResourceButton} onPress={handleAddPdf}>
                <Text style={styles.addResourceButtonText}>Upload PDF</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Text style={styles.sectionTitle}>All Courses</Text>
        
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0066CC" />
          </View>
        ) : (
          <View style={styles.cardsList}>
            {courses.map((course) => (
              <View key={course.id} style={styles.cardItem}>
                <Image source={{ uri: course.thumbnail }} style={styles.cardItemImage} />
                <View style={styles.cardItemInfo}>
                  <Text style={styles.cardItemTitle}>{course.title}</Text>
                  <Text style={styles.cardItemInstructor}>{course.instructor}</Text>
                  <View style={styles.cardItemStats}>
                    <Text style={styles.cardItemStat}>📹 {course.videos} Videos</Text>
                    <Text style={styles.cardItemStat}>📝 {course.notes} Notes</Text>
                    <Text style={styles.cardItemStat}>📄 {course.pdfs} PDFs</Text>
                  </View>
                </View>
                <View style={styles.cardItemActions}>
                  <TouchableOpacity style={styles.viewButton} onPress={() => setSelectedCourse(course)}>
                    <Text style={styles.viewButtonText}>Manage</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.deleteButton} onPress={() => handleDeleteCourse(course.id)}>
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
  courseDetailCard: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 30, marginBottom: 30, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  courseDetailHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  courseDetailTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', flex: 1 },
  closeButton: { fontSize: 24, color: '#86868B', marginLeft: 10 },
  courseDetailInstructor: { fontSize: 16, color: '#86868B', marginBottom: 15 },
  courseDetailDescription: { fontSize: 15, color: '#1D1D1F', lineHeight: 24, marginBottom: 20 },
  input: { backgroundColor: '#F5F5F7', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 15, color: '#1D1D1F', marginBottom: 12, borderWidth: 1, borderColor: '#D2D2D7' },
  textArea: { height: 100, textAlignVertical: 'top' },
  uploadSection: { marginBottom: 20, marginTop: 10 },
  uploadLabel: { fontSize: 15, fontWeight: '600', color: '#1D1D1F', marginBottom: 10 },
  previewContainer: { alignItems: 'center' },
  previewImage: { width: 400, height: 220, borderRadius: 12, marginBottom: 10 },
  removeImageButton: { backgroundColor: '#FF3B30', paddingHorizontal: 20, paddingVertical: 8, borderRadius: 8 },
  removeImageButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  uploadBox: { alignItems: 'center', paddingVertical: 20, backgroundColor: '#F5F5F7', borderRadius: 12, borderWidth: 2, borderColor: '#D2D2D7', borderStyle: 'dashed' },
  fileInput: { display: 'none' },
  uploadButton: { backgroundColor: '#0066CC', paddingHorizontal: 24, paddingVertical: 12, borderRadius: 8 },
  uploadButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  formButtons: { flexDirection: 'row', gap: 10, marginTop: 10 },
  submitButton: { backgroundColor: '#34C759', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12, flex: 1, alignItems: 'center' },
  submitButtonDisabled: { backgroundColor: '#99DDAA' },
  submitButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  cancelButton: { backgroundColor: '#8E8E93', paddingVertical: 14, paddingHorizontal: 30, borderRadius: 12 },
  cancelButtonText: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  resourceSection: { backgroundColor: '#F5F5F7', borderRadius: 12, padding: 20, marginBottom: 20 },
  resourceSectionTitle: { fontSize: 18, fontWeight: '700', color: '#1D1D1F', marginBottom: 15 },
  addResourceButton: { backgroundColor: '#0066CC', paddingVertical: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  addResourceButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '600' },
  fileSelectBox: { marginBottom: 10 },
  fileSelectButton: { backgroundColor: '#FFFFFF', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, borderWidth: 1, borderColor: '#D2D2D7', borderStyle: 'dashed' },
  fileSelectButtonText: { color: '#0066CC', fontSize: 14 },
  sectionTitle: { fontSize: 24, fontWeight: '700', color: '#1D1D1F', marginBottom: 20 },
  loadingContainer: { paddingVertical: 60, alignItems: 'center' },
  cardsList: { backgroundColor: '#FFFFFF', borderRadius: 18, padding: 20, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 },
  cardItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F7' },
  cardItemImage: { width: 120, height: 70, borderRadius: 8, backgroundColor: '#F5F5F7' },
  cardItemInfo: { flex: 1, marginLeft: 15 },
  cardItemTitle: { fontSize: 18, fontWeight: '600', color: '#1D1D1F', marginBottom: 5 },
  cardItemInstructor: { fontSize: 14, color: '#86868B', marginBottom: 8 },
  cardItemStats: { flexDirection: 'row', gap: 15 },
  cardItemStat: { fontSize: 13, color: '#1D1D1F', fontWeight: '500' },
  cardItemActions: { flexDirection: 'row', gap: 10 },
  viewButton: { backgroundColor: '#0066CC', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  viewButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
  deleteButton: { backgroundColor: '#FF3B30', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  deleteButtonText: { color: '#FFFFFF', fontSize: 14, fontWeight: '600' },
});

export default AdminCourseDashboard;
