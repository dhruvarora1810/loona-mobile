import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as Speech from 'expo-speech';

// Replace with your Laptop's IP address or Cloud Server URL when hosted 
const API_URL = "https://loona-api-fpgb.onrender.com";

export default function App() {
  const [glucose, setGlucose] = useState(null);
  const [loading, setLoading] = useState(false);
  const [insight, setInsight] = useState('');

  // Fetch Glucose every 5 minutes
  useEffect(() => {
    fetchGlucose();
    const interval = setInterval(fetchGlucose, 300000); 
    return () => clearInterval(interval);
  }, []);

  const fetchGlucose = async () => {
    try {
      const res = await fetch(`${API_URL}/glucose`);
      const data = await res.json();
      if (data.value) {
        setGlucose(data);
        checkAlerts(data.value);
      }
    } catch (error) {
      console.error("Error fetching glucose:", error);
    }
  };

  const checkAlerts = (value) => {
    if (value < 70) {
      Speech.speak(`Alert! Blood sugar is critically low at ${value}.`);
      setTimeout(() => triggerLoona('do a sad look'), 4000);
    } else if (value > 180) {
      Speech.speak(`Alert! Blood sugar is high at ${value}.`);
      setTimeout(() => triggerLoona('spin around'), 4000);
    }
  };

  const triggerLoona = (action) => {
    // Speak the wake word out loud so the physical robot hears it!
    Speech.speak(`Hello Loona. ${action}`);
  };

  const pickImage = async () => {
    // Request camera permissions first
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      alert('Sorry, we need camera roll permissions to make this work!');
      return;
    }

    try {
      let result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.5,
      });

      if (!result.canceled) {
        uploadMeal(result.assets[0].uri);
      }
    } catch (e) {
      console.log('Camera error:', e);
      alert('Could not open camera.');
    }
  };

  const uploadMeal = async (uri) => {
    setLoading(true);
    setInsight('');
    
    let formData = new FormData();
    formData.append('file', {
      uri: uri,
      name: 'meal.jpg',
      type: 'image/jpeg',
    });

    try {
      // Pass the current glucose to the AI
      const currentBg = glucose ? glucose.value : 120;
      const res = await fetch(`${API_URL}/analyze_meal?glucose=${currentBg}`, {
        method: 'POST',
        headers: { 'Content-Type': 'multipart/form-data' },
        body: formData,
      });

      const data = await res.json();
      setInsight(data.spoken_message);
      
      // Phone speaks the AI recommendation
      Speech.speak(data.spoken_message);
      
      // Tell Loona to cheer for visual feedback!
      setTimeout(() => triggerLoona('do a happy dance'), 4000);
      
    } catch (error) {
      console.error("Meal upload failed", error);
      alert("Failed to analyze meal.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Loona Companion</Text>
      
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Live Glucose</Text>
        {glucose ? (
          <Text style={styles.bgText}>{glucose.value} mg/dL {glucose.trend_arrow}</Text>
        ) : (
          <Text>Loading Dexcom data...</Text>
        )}
      </View>

      <TouchableOpacity style={styles.button} onPress={pickImage} disabled={loading}>
        <Text style={styles.buttonText}>📷 Scan Meal</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator size="large" color="#FF6B6B" style={{marginTop: 20}} />}

      {insight ? (
        <View style={styles.card}>
          <Text style={styles.insightText}>{insight}</Text>
        </View>
      ) : null}
      
      <TouchableOpacity 
         style={[styles.button, {backgroundColor: '#4ECDC4', marginTop: 30}]} 
         onPress={() => triggerLoona('do a happy dance')}>
        <Text style={styles.buttonText}>🗣️ Test Loona Wake Word</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', alignItems: 'center', paddingTop: 60, padding: 20 },
  header: { fontSize: 28, fontWeight: 'bold', marginBottom: 30, color: '#333' },
  card: { backgroundColor: 'white', padding: 20, borderRadius: 15, width: '100%', alignItems: 'center', marginBottom: 20, elevation: 3 },
  cardTitle: { fontSize: 16, color: '#666', marginBottom: 10 },
  bgText: { fontSize: 48, fontWeight: 'bold', color: '#FF6B6B' },
  button: { backgroundColor: '#FF6B6B', padding: 15, borderRadius: 30, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 18, fontWeight: 'bold' },
  insightText: { fontSize: 16, color: '#444', fontStyle: 'italic', textAlign: 'center' },
});
