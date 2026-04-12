import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';

const ContactUs = () => {
  const openTwitter = () => {
    window.open('https://twitter.com/BipulUnexpected', '_blank');
  };

  const openEmail = () => {
    window.location.href = 'mailto:info@bipul.tech';
  };

  const openWhatsapp = () => {
    window.open('https://wa.me/8801537408702', '_blank');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Contact Us</Text>
      <View style={styles.links}>
        <TouchableOpacity style={styles.link} onPress={openTwitter}>
          <Text style={styles.icon}>🐦</Text>
          <Text style={styles.text}>Twitter: @BipulUnexpected</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={openEmail}>
          <Text style={styles.icon}>📧</Text>
          <Text style={styles.text}>Email: info@bipul.tech</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.link} onPress={openWhatsapp}>
          <Text style={styles.icon}>💬</Text>
          <Text style={styles.text}>WhatsApp: +880 1537-408702</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.copyright}>© 2026 Gift Card. All rights reserved.</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    marginTop: 40,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1D1D1F',
    marginBottom: 20,
  },
  links: {
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    marginBottom: 20,
  },
  link: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F7',
    borderRadius: 12,
    minWidth: 280,
    justifyContent: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 10,
  },
  text: {
    fontSize: 14,
    color: '#1D1D1F',
    fontWeight: '500',
  },
  copyright: {
    fontSize: 12,
    color: '#86868B',
    marginTop: 10,
  },
});

export default ContactUs;
