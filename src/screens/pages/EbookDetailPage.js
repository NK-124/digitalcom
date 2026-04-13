import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import AppleNavbar from '../../components/AppleNavbar';
import { useToast } from '../../components/ToastNotification';
import { addToCart } from '../../utils/cart';
import API_URL from '../../utils/apiClient';

const EbookDetailPage = ({ onNavigate, onSignUp }) => {
  const toast = useToast();
  const [buyLoading, setBuyLoading] = useState(false);
  const [ebook, setEbook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
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

  const onTouchEnd = () => {
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

  useEffect(() => {
    const pathParts = window.location.pathname.split('/');
    const ebookId = pathParts[pathParts.length - 1];
    if (ebookId) fetchEbook(ebookId);
    else setLoading(false);
  }, []);

  const fetchEbook = async (id) => {
    try {
      const response = await fetch(`${API_URL}/api/ebooks/${id}`);
      if (response.ok) {
        const data = await response.json();
        setEbook(data);
      }
    } catch (error) {
      console.log('Error fetching ebook:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    window.history.pushState({ page: 'ebook' }, '', '/ebook');
    window.location.reload();
  };

  const handlePrevious = () => {
    setCurrentMediaIndex((prev) => {
      const allMedia = getAllMedia();
      return prev > 0 ? prev - 1 : allMedia.length - 1;
    });
  };

  const handleNext = () => {
    setCurrentMediaIndex((prev) => {
      const allMedia = getAllMedia();
      return prev < allMedia.length - 1 ? prev + 1 : 0;
    });
  };

  const getAllMedia = () => {
    if (!ebook) return [];
    const media = [];
    if (ebook.image_url) media.push({ type: 'image', url: ebook.image_url });
    if (ebook.image_url_2) media.push({ type: 'image', url: ebook.image_url_2 });
    if (ebook.image_url_3) media.push({ type: 'image', url: ebook.image_url_3 });
    if (ebook.image_url_4) media.push({ type: 'image', url: ebook.image_url_4 });
    if (ebook.image_url_5) media.push({ type: 'image', url: ebook.image_url_5 });
    if (ebook.video_url) media.push({ type: 'video', url: ebook.video_url });
    if (ebook.video_url_2) media.push({ type: 'video', url: ebook.video_url_2 });
    if (ebook.video_url_3) media.push({ type: 'video', url: ebook.video_url_3 });
    if (ebook.video_url_4) media.push({ type: 'video', url: ebook.video_url_4 });
    if (ebook.video_url_5) media.push({ type: 'video', url: ebook.video_url_5 });
    return media;
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0066CC" />
          <Text style={styles.loadingText}>Loading eBook...</Text>
        </View>
      </View>
    );
  }

  if (!ebook) {
    return (
      <View style={styles.container}>
        <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>eBook not found</Text>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back to eBooks</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const allMedia = getAllMedia();

  return (
    <View style={styles.container}>
      <AppleNavbar onNavigate={onNavigate} onSignUp={onSignUp} />
      <ScrollView style={styles.scrollView}>
        <View style={styles.detailContainer}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <Text style={styles.backButtonText}>← Back to eBooks</Text>
          </TouchableOpacity>

          <View style={styles.detailLayout}>
            {/* Image Carousel - Left Side */}
            <View style={styles.carouselSide}>
              {allMedia.length > 0 && (
                <View style={styles.carouselContainer}>
                  {allMedia.length > 1 && (
                    <TouchableOpacity style={[styles.navButton, styles.navButtonLeft]} onPress={handlePrevious}>
                      <Text style={styles.navButtonText}>‹</Text>
                    </TouchableOpacity>
                  )}

                  <View 
                    style={styles.mediaWrapper}
                    onTouchStart={onTouchStart}
                    onTouchMove={onTouchMove}
                    onTouchEnd={onTouchEnd}
                  >
                    {(() => {
                      const currentMedia = allMedia[currentMediaIndex];
                      return currentMedia.type === 'image' ? (
                        <img 
                          src={currentMedia.url} 
                          alt={ebook.title} 
                          style={{...styles.mainMediaWeb, pointerEvents: 'none'}} 
                          draggable={false}
                        />
                      ) : (
                        <video 
                          src={currentMedia.url} 
                          controls 
                          style={{...styles.mainVideoWeb, pointerEvents: 'auto'}}
                        />
                      );
                    })()}
                  </View>

                  {allMedia.length > 1 && (
                    <TouchableOpacity style={[styles.navButton, styles.navButtonRight]} onPress={handleNext}>
                      <Text style={styles.navButtonText}>›</Text>
                    </TouchableOpacity>
                  )}

                  {allMedia.length > 1 && (
                    <View style={styles.indicatorsContainer}>
                      {allMedia.map((_, index) => (
                        <View key={index} style={[styles.indicator, index === currentMediaIndex && styles.indicatorActive]} />
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
                  <Text style={styles.badgeText}>EBOOK</Text>
                </View>
                <Text style={styles.productPrice}>${ebook.price}</Text>
                <Text style={styles.productTitle}>{ebook.title}</Text>
                <Text style={styles.productAuthor}>by {ebook.author}</Text>
                
                <View style={styles.featureList}>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>📖</Text>
                    <Text style={styles.featureText}>Digital PDF Download</Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Text style={styles.featureIcon}>📱</Text>
                    <Text style={styles.featureText}>Read on Any Device</Text>
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
                      id: ebook.id,
                      name: ebook.title,
                      price: ebook.price,
                      image_url: ebook.image_url,
                      type: 'eBook'
                    });
                    toast.success('Added to cart!');
                    setTimeout(() => {
                      setBuyLoading(false);
                      if (onNavigate) onNavigate('cart');
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
                      id: ebook.id,
                      name: ebook.title,
                      price: ebook.price,
                      image_url: ebook.image_url,
                      type: 'eBook'
                    });
                    toast.success('Added to cart!');
                  }}>
                    <Text style={styles.addToCartBtnText}>Add to Cart</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Description Section */}
              <View style={styles.descriptionSection}>
                <Text style={styles.sectionTitle}>What you will get</Text>
                <Text style={styles.descriptionText}>
                  {ebook.description || "Get immediate access to this comprehensive eBook. Perfect for learning at your own pace, anywhere, anytime."}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F5F7' },
  scrollView: { flex: 1 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  loadingText: { fontSize: 18, color: '#86868B', marginTop: 20 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  errorText: { fontSize: 24, color: '#FF3B30', marginBottom: 20 },
  detailContainer: { maxWidth: 1200, width: '100%', alignSelf: 'center', padding: 20, paddingBottom: 60 },
  backButton: { alignSelf: 'flex-start', marginBottom: 30, paddingHorizontal: 16, paddingVertical: 10, backgroundColor: '#FFFFFF', borderRadius: 12, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5 },
  backButtonText: { fontSize: 15, fontWeight: '600', color: '#0066CC' },
  detailLayout: { flexDirection: 'row', gap: 40, alignItems: 'flex-start', flexWrap: 'wrap' },
  carouselSide: { flex: 1.2, minWidth: 350 },
  detailsSide: { flex: 1, minWidth: 350 },
  
  carouselContainer: { position: 'relative', width: '100%', backgroundColor: '#FFFFFF', borderRadius: 24, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.1, shadowRadius: 12 },
  mediaWrapper: { width: '100%', aspectRatio: 1, justifyContent: 'center', alignItems: 'center', overflow: 'hidden', borderRadius: 18, touchAction: 'none', userSelect: 'none' },
  mainMediaWeb: { width: '100%', height: '100%', objectFit: 'contain', display: 'block' },
  mainVideoWeb: { width: '100%', height: '100%', backgroundColor: '#000' },
  
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
  productTitle: { fontSize: 28, fontWeight: '700', color: '#1D1D1F', marginBottom: 6 },
  productAuthor: { fontSize: 18, color: '#86868B', marginBottom: 20 },
  productPrice: { fontSize: 32, fontWeight: '700', color: '#0066CC', marginBottom: 8 },
  
  featureList: { marginBottom: 32, gap: 12 },
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
});

export default EbookDetailPage;
