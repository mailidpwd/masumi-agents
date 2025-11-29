/**
 * Media Service
 * Handles media upload and storage for evidence capture
 */
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { MediaEvidence } from '../types/verification';
import * as FileSystem from 'expo-file-system';

export class MediaService {
  /**
   * Request permissions for camera/photo library
   */
  static async requestPermissions(): Promise<boolean> {
    try {
      const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
      const { status: mediaStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      return cameraStatus === 'granted' && mediaStatus === 'granted';
    } catch (error) {
      console.error('Error requesting permissions:', error);
      return false;
    }
  }

  /**
   * Pick image from camera or photo library
   */
  static async pickImage(
    source: 'camera' | 'library' = 'library'
  ): Promise<MediaEvidence | null> {
    try {
      let result: any;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      return {
        id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'photo',
        uri: asset.uri,
        thumbnailUri: asset.uri, // Can generate thumbnail if needed
        mimeType: 'image/jpeg', // Default, can be determined from file
        size: fileInfo.exists ? fileInfo.size || 0 : 0,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Error picking image:', error);
      return null;
    }
  }

  /**
   * Pick video from camera or library
   */
  static async pickVideo(
    source: 'camera' | 'library' = 'library'
  ): Promise<MediaEvidence | null> {
    try {
      let result: any;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Videos,
          allowsEditing: true,
          quality: 0.8,
        });
      }

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(asset.uri);
      
      return {
        id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'video',
        uri: asset.uri,
        thumbnailUri: asset.uri,
        mimeType: 'video/mp4',
        size: fileInfo.exists ? fileInfo.size || 0 : 0,
        uploadedAt: new Date(),
      };
    } catch (error) {
      console.error('Error picking video:', error);
      return null;
    }
  }

  /**
   * Pick document/file
   */
  static async pickDocument(): Promise<MediaEvidence | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: '*/*',
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return null;
      }

      const asset = result.assets[0];
      
      return {
        id: `media_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        type: 'document',
        uri: asset.uri,
        mimeType: asset.mimeType || 'application/octet-stream',
        size: asset.size || 0,
        uploadedAt: new Date(),
        metadata: {
          name: asset.name,
        },
      };
    } catch (error) {
      console.error('Error picking document:', error);
      return null;
    }
  }

  /**
   * Get media file size in human-readable format
   */
  static formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  }

  /**
   * Validate media file (size limits, type, etc.)
   */
  static validateMedia(media: MediaEvidence): { valid: boolean; error?: string } {
    const maxSize = 50 * 1024 * 1024; // 50 MB
    
    if (media.size > maxSize) {
      return {
        valid: false,
        error: `File size exceeds maximum of ${this.formatFileSize(maxSize)}`,
      };
    }

    return { valid: true };
  }
}

