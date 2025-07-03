import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import Link from 'next/link';
import styles from '@/styles/Upload.module.css';

export default function Upload() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [showSelectedFiles, setShowSelectedFiles] = useState(false);
  const [showDuplicateFiles, setShowDuplicateFiles] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{
    csv: File | null;
    images: File[];
  }>({ csv: null, images: [] });

  // Use sessionStorage to persist files during the browser session
  useEffect(() => {
    const saveFilesToStorage = () => {
      try {
        if (selectedFiles.csv || selectedFiles.images.length > 0) {
          // Store file metadata in sessionStorage
          const fileData = {
            csv: selectedFiles.csv ? {
              name: selectedFiles.csv.name,
              size: selectedFiles.csv.size,
              type: selectedFiles.csv.type,
              lastModified: selectedFiles.csv.lastModified
            } : null,
            images: selectedFiles.images.map(file => ({
              name: file.name,
              size: file.size,
              type: file.type,
              lastModified: file.lastModified
            }))
          };
          sessionStorage.setItem('uploadPageFiles', JSON.stringify(fileData));
          
          // Store actual files in a global variable for this session
          if (typeof window !== 'undefined') {
            (window as any).__uploadPageFiles = {
              csv: selectedFiles.csv,
              images: selectedFiles.images
            };
          }
        }
      } catch (error) {
        console.warn('Failed to save files to storage:', error);
      }
    };

    saveFilesToStorage();
  }, [selectedFiles]);

  // Restore files from storage on component mount
  useEffect(() => {
    const restoreFilesFromStorage = () => {
      try {
        // First try to restore from global variable (same session)
        if (typeof window !== 'undefined' && (window as any).__uploadPageFiles) {
          const storedFiles = (window as any).__uploadPageFiles;
          if (storedFiles.csv || storedFiles.images.length > 0) {
            setSelectedFiles({
              csv: storedFiles.csv,
              images: storedFiles.images
            });
            
            // Update the file inputs to reflect the restored files
            setTimeout(() => {
              const csvInput = document.getElementById('csv') as HTMLInputElement;
              const imagesInput = document.getElementById('images') as HTMLInputElement;
              
              if (csvInput && storedFiles.csv) {
                // Create a new FileList with the stored file
                const dt = new DataTransfer();
                dt.items.add(storedFiles.csv);
                csvInput.files = dt.files;
              }
              
              if (imagesInput && storedFiles.images.length > 0) {
                // Create a new FileList with the stored files
                const dt = new DataTransfer();
                storedFiles.images.forEach((file: File) => dt.items.add(file));
                imagesInput.files = dt.files;
              }
            }, 100);
            
            return;
          }
        }
        
        // Fallback: check sessionStorage for metadata
        const savedData = sessionStorage.getItem('uploadPageFiles');
        if (savedData) {
          const fileData = JSON.parse(savedData);
          if (fileData.csv || fileData.images.length > 0) {
            setMessage('ℹ️ Previous file selections were detected but need to be reselected due to browser security restrictions.');
          }
        }
      } catch (error) {
        console.warn('Failed to restore files from storage:', error);
      }
    };

    restoreFilesFromStorage();
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = event.target;
    
    if (name === 'csv' && files && files[0]) {
      setSelectedFiles(prev => ({ ...prev, csv: files[0] }));
    } else if (name === 'images' && files) {
      setSelectedFiles(prev => ({ ...prev, images: Array.from(files) }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement> & { _overwriteMode?: boolean }) => {
    event.preventDefault();
    setMessage('');
    setDuplicateWarning([]);
    setUploadSuccess(false);
    setUploadProgress(0);
    setIsLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);
    
    // Add overwrite flag if user has chosen to overwrite duplicates or if in overwrite mode
    if (allowOverwrite || event._overwriteMode) {
      formData.append('overwrite', 'true');
      // Reset overwrite state after adding to formData
      setAllowOverwrite(false);
    }

    const csvFile = formData.get('csv');
    const imageFiles = formData.getAll('images');

    if (!csvFile || (Array.isArray(imageFiles) && imageFiles.length === 0)) {
        setMessage('Please select both a CSV file and at least one image.');
        setIsLoading(false);
        return;
    }

    // Calculate total file size for progress estimation
    const totalSize = selectedFiles.images.reduce((sum, file) => sum + file.size, 0) + 
                     (selectedFiles.csv ? selectedFiles.csv.size : 0);
    
    // Show warning for very large uploads
    if (totalSize > 500 * 1024 * 1024) { // 500MB
      setMessage('Large upload detected. This may take several minutes. Please be patient and do not close this page.');
    }

    try {
      // Simulate progress for user feedback
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev < 90) return prev + Math.random() * 10;
          return prev;
        });
      }, 1000);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
        setUploadSuccess(true);
        
        // Clear stored files after successful upload
        try {
          sessionStorage.removeItem('uploadPageFiles');
          if (typeof window !== 'undefined') {
            delete (window as any).__uploadPageFiles;
          }
        } catch (error) {
          console.warn('Failed to clear stored files:', error);
        }
      } else {
        const errorData = await response.json();
        
        if (response.status === 409 && errorData.duplicates) {
          // Handle duplicate file warning
          setDuplicateWarning(errorData.duplicates);
          setMessage(errorData.message);
        } else if (response.status === 413) {
          setMessage(`Upload failed: ${errorData.error} Try uploading fewer files or reducing file sizes.`);
        } else if (response.status === 408) {
          setMessage(`Upload timeout: ${errorData.error} Try uploading fewer files at once.`);
        } else {
          setMessage(`Upload failed: ${errorData.error}`);
        }
      }
    } catch (error: any) {
      setUploadProgress(0);
      if (error.name === 'AbortError') {
        setMessage('Upload was cancelled.');
      } else if (error.message.includes('Failed to fetch')) {
        setMessage('Network error. Please check your connection and try again.');
      } else {
        setMessage('An error occurred during upload. Please try again.');
      }
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000); // Reset progress after 2 seconds
    }
  };

  return (
    <div className={styles.container}>
      {/* Logo */}
      <div className={styles.logoContainer}>
        <img 
           src="/assets/svg/primezone-logo.svg" 
           alt="PrimeZone Logo" 
           className={styles.logo}
         />
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link href="/" className={styles.backLink}>
            ← Back to Panorama Viewer
          </Link>
        </div>
        
        <h1 className={styles.title}>Upload Panorama Data</h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label htmlFor="csv" className={styles.label}>
              📄 CSV File:
            </label>
            {selectedFiles.csv && selectedFiles.csv.name !== 'pano-poses.csv' && (
              <div className={styles.csvInstruction}>
                <p>⚠️ Important: Your CSV file must be named exactly <strong>"pano-poses.csv"</strong></p>
              </div>
            )}
            <input 
              type="file" 
              id="csv" 
              name="csv" 
              accept=".csv" 
              required 
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            {selectedFiles.csv && (
              <div className={styles.fileInfo}>
                Selected: {selectedFiles.csv.name}
              </div>
            )}
          </div>
        
          <div className={styles.fieldGroup}>
            <label htmlFor="images" className={styles.label}>
              🖼️ Images:
            </label>
            <input 
              type="file" 
              id="images" 
              name="images" 
              accept="image/*" 
              multiple 
              required 
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            {selectedFiles.images.length > 0 && (
              <div className={styles.fileList}>
                <div className={styles.fileListHeader}>
                  <p className={styles.fileListTitle}>
                    Selected {selectedFiles.images.length} image(s)
                  </p>
                  <button 
                    type="button"
                    onClick={() => setShowSelectedFiles(!showSelectedFiles)}
                    className={styles.toggleButton}
                  >
                    {showSelectedFiles ? '▼ Hide' : '▶ Show'}
                  </button>
                </div>
                {showSelectedFiles && (
                  <ul className={styles.fileListItems}>
                    {selectedFiles.images.map((file, index) => (
                      <li key={index}>{file.name}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>
        
          <button 
            type="submit" 
            disabled={isLoading}
            className={styles.submitButton}
          >
            {isLoading && <span className={styles.loadingSpinner}></span>}
            {isLoading ? 'Uploading and Generating...' : 'Upload and Generate'}
          </button>
          
          {isLoading && uploadProgress > 0 && (
            <div className={styles.progressContainer}>
              <div className={styles.progressBar}>
                <div 
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <div className={styles.progressText}>
                {uploadProgress < 100 ? `Uploading... ${Math.round(uploadProgress)}%` : 'Processing files...'}
              </div>
            </div>
          )}
        </form>
        
        {duplicateWarning.length > 0 && (
          <div className={`${styles.message} ${styles.messageWarning}`}>
            <div className={styles.duplicateHeader}>
              <h4>⚠️ Duplicate Files Detected ({duplicateWarning.length} files)</h4>
              <button 
                type="button"
                onClick={() => setShowDuplicateFiles(!showDuplicateFiles)}
                className={styles.toggleButton}
              >
                {showDuplicateFiles ? '▼ Hide' : '▶ Show'}
              </button>
            </div>
            {showDuplicateFiles && (
              <ul className={styles.duplicateList}>
                {duplicateWarning.map((filename, index) => (
                  <li key={index}>{filename}</li>
                ))}
              </ul>
            )}
            <p>These files already exist. You can either rename them or choose to overwrite the existing files.</p>
            
            <button 
              onClick={(e) => {
                e.preventDefault();
                const form = document.querySelector('form') as HTMLFormElement;
                if (form) {
                  const formData = new FormData(form);
                  formData.append('overwrite', 'true');
                  
                  // Call handleSubmit with overwrite flag already set
                  const syntheticEvent = {
                   preventDefault: () => {},
                   currentTarget: form,
                   target: form,
                   nativeEvent: new Event('submit'),
                   bubbles: true,
                   cancelable: true,
                   defaultPrevented: false,
                   eventPhase: 0,
                   isTrusted: true,
                   timeStamp: Date.now(),
                   type: 'submit',
                   _overwriteMode: true
                 } as unknown as FormEvent<HTMLFormElement> & { _overwriteMode: boolean };
                  handleSubmit(syntheticEvent);
                }
              }}
              disabled={isLoading}
              className={styles.overwriteButton}
            >
              {isLoading && <span className={styles.loadingSpinner}></span>}
              {isLoading ? 'Uploading...' : '🔄 Upload and Overwrite'}
            </button>
          </div>
        )}

        {message && duplicateWarning.length === 0 && (
          <div className={`${styles.message} ${
            message.includes('failed') || message.includes('error') 
              ? styles.messageError 
              : styles.messageSuccess
          }`}>
            {message}
          </div>
        )}

        {uploadSuccess && (
          <div className={styles.successActions}>
            <Link href="/" className={styles.viewPanoramasButton}>
              🏠 View Panoramas
            </Link>
          </div>
        )}
      
        <div className={styles.instructions}>
          <h3 className={styles.instructionsTitle}>Instructions:</h3>
          <ol className={styles.instructionsList}>
            <li>Select your pano-poses.csv file containing panorama position data</li>
            <li>Select one or more panorama images (JPG or PNG format)</li>
            <li>Click "Upload and Generate" to upload files and automatically generate the configuration</li>
            <li>Once complete, return to the main viewer to see your panoramas</li>
          </ol>
        </div>
      </div>
    </div>
  );
}