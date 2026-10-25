import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';

import { Colors } from '@/constants/colors';
import { Ionicons as Icon } from '@expo/vector-icons';
interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>SpeedDrop</Text>
          <Text style={styles.subtitle}>Fast. Secure. Offline.</Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionCard, styles.sendCard]}
            onPress={() => navigation.navigate('Send')}>
            <Icon name="send" size={48} color={Colors.primary} />
            <Text style={styles.optionTitle}>Send Files</Text>
            <Text style={styles.optionDescription}>
              Share files with nearby devices
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.receiveCard]}
            onPress={() => navigation.navigate('Receive')}>
            <Icon name="download" size={48} color={Colors.accent} />
            <Text style={styles.optionTitle}>Receive Files</Text>
            <Text style={styles.optionDescription}>
              Get files from senders around you
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.infoCard}>
          <Icon name="information-circle" size={24} color={Colors.accent} />
          <Text style={styles.infoText}>
            SpeedDrop works offline using local Wi-Fi. No internet connection required!
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  content: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginTop: 40,
    marginBottom: 40,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: Colors.primary,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textSecondary,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 30,
  },
  optionCard: {
    backgroundColor: Colors.cardBg,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sendCard: {
    borderTopColor: Colors.primary,
    borderTopWidth: 3,
  },
  receiveCard: {
    borderTopColor: Colors.accent,
    borderTopWidth: 3,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(108, 99, 255, 0.1)',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    gap: 12,
    marginTop: 20,
  },
  infoText: {
    flex: 1,
    color: Colors.textSecondary,
    fontSize: 12,
    lineHeight: 18,
  },
});