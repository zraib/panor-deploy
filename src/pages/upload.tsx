import { useState, FormEvent, ChangeEvent, useEffect } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import styles from '@/styles/Upload.module.css';

export default function Upload() {
  const router = useRouter();
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [allowOverwrite, setAllowOverwrite] = useState(false);
  const [showSelectedFiles, setShowSelectedFiles] = useState(false);
  const [showDuplicateFiles, setShowDuplicateFiles] = useState(false);
  const [projectName, setProjectName] = useState('');
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [existingFiles, setExistingFiles] = useState<{
    csv: string | null;
    images: string[];
  }>({ csv: null, images: [] });
  const [selectedFiles, setSelectedFiles] = useState<{
    csv: File | null;
    images: File[];
  }>({ csv: null, images: [] });

  // This effect handles project editing mode
  useEffect(() => {
    const projectParam = router.query.project as string;
    if (projectParam && !isEditMode) {
      setIsEditMode(true);
      setEditingProjectId(projectParam);
      setCreatedProjectId(projectParam);
      
      // Load existing project data
      const loadProjectData = async () => {
        try {
          // Load project info
          const projectResponse = await fetch(`/api/projects?projectId=${encodeURIComponent(projectParam)}`);
          if (projectResponse.ok) {
            const projectData = await projectResponse.json();
            const project = projectData.projects?.find((p: any) => p.id === projectParam);
            if (project) {
              setProjectName(project.name);
            }
          }

          // Load existing files
           const filesResponse = await fetch(`/api/projects/${encodeURIComponent(projectParam)}/files`);
           if (filesResponse.ok) {
             const filesData = await filesResponse.json();
             const { files } = filesData;
             
             // Store existing files in state
             setExistingFiles({
               csv: files.csv,
               images: files.images
             });
             
             let fileInfo = [];
             if (files.csv) {
               fileInfo.push(`CSV: ${files.csv}`);
             }
             if (files.images.length > 0) {
               fileInfo.push(`${files.images.length} image(s)`);
             }
             
             if (fileInfo.length > 0) {
               setMessage(`✏️ Editing project: ${projectName || projectParam}. Current files: ${fileInfo.join(', ')}. Upload new files to update this project.`);
             } else {
               setMessage(`✏️ Editing project: ${projectName || projectParam}. No existing files found. Upload files to add content to this project.`);
             }
           } else {
             setMessage(`✏️ Editing project: ${projectName || projectParam}. Upload new files to update this project.`);
           }
        } catch (error) {
          console.error('Failed to load project data:', error);
          setMessage('⚠️ Failed to load project data. You can still upload files to update the project.');
        }
      };
      
      loadProjectData();
    }
  }, [router.query.project, isEditMode]);

  // This effect will run once on mount to initialize file state
  useEffect(() => {
    const initializeFiles = async () => {
      // Try to restore from browser session (no longer checking legacy server files)
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

    if (!isEditMode) {
      initializeFiles();
    }
  }, [isEditMode]); // Only run when not in edit mode

  // This effect synchronizes the file input elements with the state
  useEffect(() => {
    const csvInput = document.getElementById('csv') as HTMLInputElement;
    const imagesInput = document.getElementById('images') as HTMLInputElement;

    const dtCsv = new DataTransfer();
    // Use selected files first, then fall back to existing files in edit mode
    if (selectedFiles.csv) {
      dtCsv.items.add(selectedFiles.csv);
    } else if (isEditMode && existingFiles.csv) {
      // Create a File object from existing CSV data to display in the input
      const csvFile = new File([''], existingFiles.csv, { type: 'text/csv' });
      dtCsv.items.add(csvFile);
    }
    if (csvInput) {
      csvInput.files = dtCsv.files;
    }

    const dtImages = new DataTransfer();
    // Use selected images first, then fall back to existing images in edit mode
    if (selectedFiles.images.length > 0) {
      selectedFiles.images.forEach(file => dtImages.items.add(file));
    } else if (isEditMode && existingFiles.images.length > 0) {
      // Create File objects from existing image data
      existingFiles.images.forEach(imageName => {
        const imageFile = new File([''], imageName, { type: 'image/jpeg' });
        dtImages.items.add(imageFile);
      });
    }
    if (imagesInput) {
      imagesInput.files = dtImages.files;
    }
  }, [selectedFiles, existingFiles, isEditMode]);

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

    // In edit mode, allow updating without requiring new files if existing files are present
    const hasExistingCsv = isEditMode && existingFiles.csv;
    const hasExistingImages = isEditMode && existingFiles.images.length > 0;
    const hasNewCsv = selectedFiles.csv;
    const hasNewImages = selectedFiles.images.length > 0;
    
    if (!hasNewCsv && !hasExistingCsv) {
      setMessage('Please select a CSV file.');
      setIsLoading(false);
      return;
    }
    
    if (!hasNewImages && !hasExistingImages) {
      setMessage('Please select at least one image.');
      setIsLoading(false);
      return;
    }

    if (!projectName.trim()) {
      setMessage('Please enter a project name.');
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

      let projectId: string;

      if (isEditMode && editingProjectId) {
        // Use existing project ID for editing
        projectId = editingProjectId;
        
        // Update project name if it has changed
        try {
          await fetch('/api/projects', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ 
              projectId: editingProjectId,
              projectName: projectName.trim() 
            }),
          });
        } catch (error) {
          console.warn('Failed to update project name:', error);
        }
      } else {
        // Create new project
        const projectResponse = await fetch('/api/projects', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectName: projectName.trim() }),
        });

        if (!projectResponse.ok) {
          const projectError = await projectResponse.json();
          throw new Error(projectError.error || 'Failed to create project');
        }

        const projectData = await projectResponse.json();
        projectId = projectData.project.id;
        setCreatedProjectId(projectId);
      }

      // Upload files to the project
      const response = await fetch(`/api/projects/${encodeURIComponent(projectId)}/upload`, {
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

        <h1 className={styles.title}>
          {isEditMode ? 'Edit Project Data' : 'Upload Panorama Data'}
        </h1>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGroup}>
            <label htmlFor='projectName' className={styles.label}>
              📁 Project Name:
            </label>
            <input
              type='text'
              id='projectName'
              name='projectName'
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              placeholder='Enter a name for your project'
              required
              className={styles.textInput}
            />
            <div className={styles.inputHint}>
              {isEditMode 
                ? 'Update the name of your existing project.' 
                : 'This will create a new project folder for your panorama data.'}
            </div>
          </div>



          <div className={styles.formGroup}>
            <label htmlFor='csv' className={styles.label}>
              📄 CSV File{isEditMode && existingFiles.csv ? ' (Optional - will replace existing)' : ''}:
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
              required={!isEditMode || !existingFiles.csv}
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            {(selectedFiles.csv || (isEditMode && existingFiles.csv)) && (
              <div className={styles.fileInfo}>
                Selected: {selectedFiles.csv ? selectedFiles.csv.name : existingFiles.csv}
              </div>
            )}
          </div>

          <div className={styles.formGroup}>
            <label htmlFor='images' className={styles.label}>
              🖼️ Panorama Images{isEditMode && existingFiles.images.length > 0 ? ' (Optional - will add to existing)' : ''}:
            </label>
            <input
              type='file'
              id='images'
              name='images'
              accept='image/*'
              multiple
              required={!isEditMode || existingFiles.images.length === 0}
              onChange={handleFileChange}
              className={styles.fileInput}
            />
            {(selectedFiles.images.length > 0 || (isEditMode && existingFiles.images.length > 0)) && (
              <div className={styles.fileList}>
                <div className={styles.fileListHeader}>
                  <p className={styles.fileListTitle}>
                    Selected {selectedFiles.images.length > 0 ? selectedFiles.images.length : existingFiles.images.length} image(s)
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
                    {selectedFiles.images.length > 0 
                      ? selectedFiles.images.map((file, index) => (
                          <li key={index}>{file.name}</li>
                        ))
                      : existingFiles.images.map((imageName, index) => (
                          <li key={index}>{imageName}</li>
                        ))
                    }
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
            {isLoading 
              ? (isEditMode ? 'Updating Project...' : 'Uploading and Generating...') 
              : (isEditMode ? 'Update Project' : 'Upload and Generate')}
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
            {createdProjectId ? (
              <Link href={`/${createdProjectId}`} className={styles.viewPanoramasButton}>
                🏠 View Project Panoramas
              </Link>
            ) : (
              <Link href='/' className={styles.viewPanoramasButton}>
                🏠 View Panoramas
              </Link>
            )}
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
