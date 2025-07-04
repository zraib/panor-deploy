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

  // This effect will run once on mount to initialize file state
  useEffect(() => {
    const initializeFiles = async () => {
      // 1. Check for files on the server
      try {
        const response = await fetch('/api/check-files');
        if (response.ok) {
          const data = await response.json();
          if (data.csvFile || (data.imageFiles && data.imageFiles.length > 0)) {
            const newSelectedFiles: { csv: File | null; images: File[] } = {
              csv: null,
              images: [],
            };

            if (data.csvFile) {
              const fileResponse = await fetch(`/data/${data.csvFile}`);
              const blob = await fileResponse.blob();
              newSelectedFiles.csv = new File([blob], data.csvFile, {
                type: blob.type,
              });
            }

            if (data.imageFiles && data.imageFiles.length > 0) {
              const imagePromises = data.imageFiles.map(
                async (imageName: string) => {
                  const fileResponse = await fetch(`/images/${imageName}`);
                  const blob = await fileResponse.blob();
                  return new File([blob], imageName, { type: blob.type });
                }
              );
              newSelectedFiles.images = await Promise.all(imagePromises);
            }

            setSelectedFiles(newSelectedFiles);
            return; // Prioritize server files
          }
        }
      } catch (error) {
        console.error('Failed to check or fetch server files:', error);
      }

      // 2. If no server files, try to restore from browser session
      try {
        if (
          typeof window !== 'undefined' &&
          (window as any).__uploadPageFiles
        ) {
          const storedFiles = (window as any).__uploadPageFiles;
          if (storedFiles.csv || storedFiles.images.length > 0) {
            setSelectedFiles(storedFiles);
            return;
          }
        }

        const savedData = sessionStorage.getItem('uploadPageFiles');
        if (savedData) {
          const fileData = JSON.parse(savedData);
          if (fileData.csv || fileData.images.length > 0) {
            setMessage(
              'ℹ️ Previous file selections were detected but need to be reselected due to browser security restrictions.'
            );
          }
        }
      } catch (error) {
        console.warn('Failed to restore files from storage:', error);
      }
    };

    initializeFiles();
  }, []); // Empty dependency array ensures this runs only once on mount

  // This effect synchronizes the file input elements with the state
  useEffect(() => {
    const csvInput = document.getElementById('csv') as HTMLInputElement;
    const imagesInput = document.getElementById('images') as HTMLInputElement;

    const dtCsv = new DataTransfer();
    if (selectedFiles.csv) {
      dtCsv.items.add(selectedFiles.csv);
    }
    if (csvInput) {
      csvInput.files = dtCsv.files;
    }

    const dtImages = new DataTransfer();
    if (selectedFiles.images.length > 0) {
      selectedFiles.images.forEach(file => dtImages.items.add(file));
    }
    if (imagesInput) {
      imagesInput.files = dtImages.files;
    }
  }, [selectedFiles]);

  // This effect persists selected files for the session
  useEffect(() => {
    try {
      if (selectedFiles.csv || selectedFiles.images.length > 0) {
        const fileData = {
          csv: selectedFiles.csv
            ? {
                name: selectedFiles.csv.name,
                size: selectedFiles.csv.size,
                type: selectedFiles.csv.type,
                lastModified: selectedFiles.csv.lastModified,
              }
            : null,
          images: selectedFiles.images.map(file => ({
            name: file.name,
            size: file.size,
            type: file.type,
            lastModified: file.lastModified,
          })),
        };
        sessionStorage.setItem('uploadPageFiles', JSON.stringify(fileData));

        if (typeof window !== 'undefined') {
          (window as any).__uploadPageFiles = {
            csv: selectedFiles.csv,
            images: selectedFiles.images,
          };
        }
      }
    } catch (error) {
      console.warn('Failed to save files to storage:', error);
    }
  }, [selectedFiles]);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = event.target;

    if (name === 'csv' && files && files[0]) {
      setSelectedFiles(prev => ({ ...prev, csv: files[0] }));
    } else if (name === 'images' && files) {
      setSelectedFiles(prev => ({ ...prev, images: Array.from(files) }));
    }
  };

  const handleSubmit = async (
    event: FormEvent<HTMLFormElement> & { _overwriteMode?: boolean }
  ) => {
    event.preventDefault();
    setMessage('');
    setDuplicateWarning([]);
    setUploadSuccess(false);
    setUploadProgress(0);
    setIsLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    if (allowOverwrite || event._overwriteMode) {
      formData.append('overwrite', 'true');
      setAllowOverwrite(false);
    }

    if (!selectedFiles.csv || selectedFiles.images.length === 0) {
      setMessage('Please select both a CSV file and at least one image.');
      setIsLoading(false);
      return;
    }

    const totalSize =
      selectedFiles.images.reduce((sum, file) => sum + file.size, 0) +
      (selectedFiles.csv ? selectedFiles.csv.size : 0);

    if (totalSize > 500 * 1024 * 1024) {
      // 500MB
      setMessage(
        'Large upload detected. This may take several minutes. Please be patient and do not close this page.'
      );
    }

    try {
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
          setDuplicateWarning(errorData.duplicates);
          setMessage(errorData.message);
        } else if (response.status === 413) {
          setMessage(
            `Upload failed: ${errorData.error} Try uploading fewer files or reducing file sizes.`
          );
        } else if (response.status === 408) {
          setMessage(
            `Upload timeout: ${errorData.error} Try uploading fewer files at once.`
          );
        } else {
          setMessage(`Upload failed: ${errorData.error}`);
        }
      }
    } catch (error: any) {
      setUploadProgress(0);
      if (error.name === 'AbortError') {
        setMessage('Upload was cancelled.');
      } else if (error.message.includes('Failed to fetch')) {
        setMessage(
          'Network error. Please check your connection and try again.'
        );
      } else {
        setMessage('An error occurred during upload. Please try again.');
      }
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
      setTimeout(() => setUploadProgress(0), 2000);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.logoContainer}>
        <img
          src='/assets/svg/primezone-logo.svg'
          alt='PrimeZone Logo'
          className={styles.logo}
        />
      </div>
      <div className={styles.content}>
        <div className={styles.header}>
          <Link href='/' className={styles.backLink}>
            ← Back to Panorama Viewer
          </Link>
        </div>

        <h1 className={styles.title}>Upload Panorama Data</h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor='csv' className={styles.label}>
              📄 CSV File:
            </label>
            {selectedFiles.csv &&
              selectedFiles.csv.name !== 'pano-poses.csv' && (
                <div className={styles.csvInstruction}>
                  <p>
                    ⚠️ Important: Your CSV file must be named exactly{' '}
                    <strong>"pano-poses.csv"</strong>
                  </p>
                </div>
              )}
            <input
              type='file'
              id='csv'
              name='csv'
              accept='.csv'
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

          <div className={styles.formGroup}>
            <label htmlFor='images' className={styles.label}>
              🖼️ Panorama Images:
            </label>
            <input
              type='file'
              id='images'
              name='images'
              accept='image/*'
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
                    type='button'
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
            type='submit'
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
                {uploadProgress < 100
                  ? `Uploading... ${Math.round(uploadProgress)}%`
                  : 'Processing files...'}
              </div>
            </div>
          )}
        </form>

        {duplicateWarning.length > 0 && (
          <div className={`${styles.message} ${styles.messageWarning}`}>
            <div className={styles.duplicateHeader}>
              <h4>
                ⚠️ Duplicate Files Detected ({duplicateWarning.length} files)
              </h4>
              <button
                type='button'
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
            <p>
              These files already exist. You can either rename them or choose to
              overwrite the existing files.
            </p>

            <div className={styles.duplicateActions}>
              <button
                onClick={e => {
                  e.preventDefault();
                  const form = document.querySelector(
                    'form'
                  ) as HTMLFormElement;
                  if (form) {
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
                      _overwriteMode: true,
                    } as unknown as FormEvent<HTMLFormElement> & {
                      _overwriteMode: boolean;
                    };
                    handleSubmit(syntheticEvent);
                  }
                }}
                disabled={isLoading}
                className={styles.overwriteButton}
              >
                {isLoading && <span className={styles.loadingSpinner}></span>}
                {isLoading ? 'Overwriting...' : '🔄 Upload and Overwrite'}
              </button>

              <button
                onClick={async e => {
                  e.preventDefault();
                  setIsLoading(true);
                  setMessage('Clearing old data...');
                  try {
                    const response = await fetch('/api/clear-data', {
                      method: 'POST',
                    });
                    if (!response.ok) {
                      throw new Error('Failed to clear old data.');
                    }
                    setMessage('Old data cleared. Now uploading new files...');
                    const form = document.querySelector(
                      'form'
                    ) as HTMLFormElement;
                    if (form) {
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
                        _overwriteMode: true, // Treat as overwrite since we just cleared
                      } as unknown as FormEvent<HTMLFormElement> & {
                        _overwriteMode: boolean;
                      };
                      handleSubmit(syntheticEvent);
                    }
                  } catch (error: any) {
                    setMessage(`Error: ${error.message}`);
                    setIsLoading(false);
                  }
                }}
                disabled={isLoading}
                className={styles.clearButton}
              >
                {isLoading && <span className={styles.loadingSpinner}></span>}
                {isLoading ? 'Clearing...' : '🗑️ Clear All and Upload'}
              </button>
            </div>
          </div>
        )}

        {message && duplicateWarning.length === 0 && (
          <div
            className={`${styles.message} ${
              message.includes('failed') || message.includes('error')
                ? styles.messageError
                : styles.messageSuccess
            }`}
          >
            {message}
          </div>
        )}

        {uploadSuccess && (
          <div className={styles.successActions}>
            <Link href='/' className={styles.viewPanoramasButton}>
              🏠 View Panoramas
            </Link>
          </div>
        )}

        <div className={styles.instructions}>
          <h3 className={styles.instructionsTitle}>Instructions:</h3>
          <ol className={styles.instructionsList}>
            <li>
              Select your pano-poses.csv file containing panorama position data
            </li>
            <li>Select one or more panorama images (JPG or PNG format)</li>
            <li>
              Click "Upload and Generate" to upload files and automatically
              generate the configuration
            </li>
            <li>
              Once complete, return to the main viewer to see your panoramas
            </li>
          </ol>
        </div>
      </div>
    </div>
  );
}
