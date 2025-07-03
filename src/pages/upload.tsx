import { useState, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';

export default function Upload() {
  const [message, setMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<{
    csv: File | null;
    images: File[];
  }>({ csv: null, images: [] });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const { name, files } = event.target;
    
    if (name === 'csv' && files && files[0]) {
      setSelectedFiles(prev => ({ ...prev, csv: files[0] }));
    } else if (name === 'images' && files) {
      setSelectedFiles(prev => ({ ...prev, images: Array.from(files) }));
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage('');
    setIsLoading(true);

    const form = event.currentTarget;
    const formData = new FormData(form);

    const csvFile = formData.get('csv');
    const imageFiles = formData.getAll('images');

    if (!csvFile || (Array.isArray(imageFiles) && imageFiles.length === 0)) {
        setMessage('Please select both a CSV file and at least one image.');
        setIsLoading(false);
        return;
    }

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setMessage(result.message);
      } else {
        const errorData = await response.json();
        setMessage(`Upload failed: ${errorData.error}`);
      }
    } catch (error) {
      setMessage('An error occurred during upload.');
      console.error('Upload error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
      <div style={{ marginBottom: '20px' }}>
        <Link href="/" style={{ color: '#0070f3', textDecoration: 'none' }}>
          ← Back to Panorama Viewer
        </Link>
      </div>
      
      <h1 style={{ marginBottom: '30px' }}>Upload Panorama Data</h1>
      
      <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="csv" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select pano-poses CSV file:
          </label>
          <input 
            type="file" 
            id="csv" 
            name="csv" 
            accept=".csv" 
            required 
            onChange={handleFileChange}
            style={{ 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              width: '100%'
            }}
          />
          {selectedFiles.csv && (
            <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
              Selected: {selectedFiles.csv.name}
            </p>
          )}
        </div>
        
        <div style={{ marginBottom: '20px' }}>
          <label htmlFor="images" style={{ display: 'block', marginBottom: '8px', fontWeight: 'bold' }}>
            Select panorama images (JPG/PNG):
          </label>
          <input 
            type="file" 
            id="images" 
            name="images" 
            accept="image/*" 
            multiple 
            required 
            onChange={handleFileChange}
            style={{ 
              padding: '8px', 
              border: '1px solid #ccc', 
              borderRadius: '4px',
              width: '100%'
            }}
          />
          {selectedFiles.images.length > 0 && (
            <div style={{ margin: '10px 0' }}>
              <p style={{ margin: '5px 0', color: '#666', fontSize: '14px' }}>
                Selected {selectedFiles.images.length} image(s):
              </p>
              <ul style={{ margin: '5px 0', paddingLeft: '20px', fontSize: '14px', color: '#666' }}>
                {selectedFiles.images.map((file, index) => (
                  <li key={index}>{file.name}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            padding: '12px 24px',
            backgroundColor: isLoading ? '#ccc' : '#0070f3',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold'
          }}
        >
          {isLoading ? 'Uploading and Generating...' : 'Upload and Generate'}
        </button>
      </form>
      
      {message && (
        <div style={{
          padding: '15px',
          border: '1px solid #ccc',
          borderRadius: '4px',
          backgroundColor: message.includes('failed') || message.includes('error') ? '#fee' : '#efe',
          color: message.includes('failed') || message.includes('error') ? '#c33' : '#060'
        }}>
          {message}
        </div>
      )}
      
      <div style={{ marginTop: '40px', padding: '20px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
        <h3>Instructions:</h3>
        <ol>
          <li>Select your pano-poses.csv file containing panorama position data</li>
          <li>Select one or more panorama images (JPG or PNG format)</li>
          <li>Click "Upload and Generate" to upload files and automatically generate the configuration</li>
          <li>Once complete, return to the main viewer to see your panoramas</li>
        </ol>
      </div>
    </div>
  );
}