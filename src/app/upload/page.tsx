'use client';

import { useState, useRef } from 'react';
import { Camera, MapPin, UploadCloud, Loader2, AlertCircle } from 'lucide-react';
import styles from './upload.module.css';
import Link from 'next/link';

export default function UploadPage() {
  const [image, setImage] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setError(null);
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImage(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!image) return;

    setUploading(true);
    setError(null);

    try {
      // Create FormData to send the file and metadata
      const formData = new FormData();
      formData.append('file', image);
      formData.append('timestamp', new Date().toISOString());

      // Send to our API route
      const response = await fetch('/api/sightings', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Upload failed');
      }
      
      setSuccess(true);
    } catch (err: any) {
      console.error('Error uploading:', err);
      setError(err.message || 'Failed to upload sighting. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  if (success) {
    return (
      <div className={styles.container}>
        <div className={`glass-panel ${styles.successCard}`}>
          <h2>Sighting Reported!</h2>
          <p>Thank you for contributing to WhaleWatch. The image has been validated and GPS coordinates extracted. The sighting has been added to our live map.</p>
          <div className={styles.actions}>
            <Link href="/map" className="btn-primary">View Live Map</Link>
            <button className={styles.secondaryBtn} onClick={() => {
              setSuccess(false);
              setImage(null);
              setPreview(null);
              setError(null);
            }}>Report Another</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <Link href="/" className={styles.backLink}>← Back</Link>
        <h2>Report Sighting</h2>
      </header>

      <form onSubmit={handleSubmit} className={`glass-panel ${styles.form}`}>
        
        {/* Step 1: Photo */}
        <div className={styles.section}>
          <h3>1. Upload Photo</h3>
          <p className={styles.hint}>Geotags must be enabled. Our AI will validate that the image contains whales, identify the species, and count them.</p>
          
          <div 
            className={styles.uploadArea} 
            onClick={() => fileInputRef.current?.click()}
          >
            {preview ? (
              <img src={preview} alt="Preview" className={styles.previewImage} />
            ) : (
              <div className={styles.uploadPlaceholder}>
                <Camera size={48} color="var(--color-cyan)" />
                <span>Tap to take or upload a photo</span>
              </div>
            )}
            <input 
              type="file" 
              accept="image/*" 
              ref={fileInputRef}
              onChange={handleImageChange}
              className={styles.hiddenInput}
            />
          </div>
        </div>

        {/* Step 2: Location Extraction Info */}
        <div className={styles.section}>
          <h3>2. Sighting Location</h3>
          <p className={styles.hint}>GPS coordinates are extracted automatically from your image's EXIF metadata tags.</p>
          
          <div className={styles.locationArea}>
            <div className={styles.locationSuccess}>
              <MapPin size={24} color="var(--color-cyan)" />
              <span>Automatic EXIF Geotag Extraction</span>
            </div>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className={styles.errorMessage}>
            <AlertCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle', display: 'inline' }} />
            <span>{error}</span>
          </div>
        )}

        {/* Submit */}
        <button 
          type="submit" 
          className={`btn-primary ${styles.submitBtn}`}
          disabled={!image || uploading}
        >
          {uploading ? (
            <><Loader2 className={styles.spin} /> Validating & Processing...</>
          ) : (
            <><UploadCloud /> Submit Sighting</>
          )}
        </button>

      </form>
    </div>
  );
}
