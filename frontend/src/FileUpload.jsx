import React, { useState } from 'react';
import axios from 'axios';

function FileUpload({ roomId }) {
  const [file, setFile] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
  };

  const handleFileUpload = async () => {
    if (!file) return;

    const formData = new FormData();
    formData.append('file', file);

    try {
      const token = localStorage.getItem('token');
      await axios.post(`http://localhost:5000/api/rooms/${roomId}/upload`, formData, {
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' },
      });
      alert('File uploaded successfully');
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    }
  };

  return (
    <div>
      <input type="file" onChange={handleFileChange} accept=".cpp,.java,.js,.py" />
      <button onClick={handleFileUpload}>Upload File</button>
    </div>
  );
}

export default FileUpload;