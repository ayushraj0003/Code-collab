import React, { useState } from 'react';
import axios from 'axios';

function FileUpload({ roomId }) {
  const [files, setFiles] = useState([]);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
  };

  const handleFileUpload = async () => {
    if (files.length === 0) return;

    const formData = new FormData();
    const folderStructure = {};

    files.forEach((file) => {
      const pathParts = file.webkitRelativePath.split('/');
      let currentDir = folderStructure;

      pathParts.slice(0, -1).forEach((dir) => {
        if (!currentDir[dir]) {
          currentDir[dir] = { files: [] };
        }
        currentDir = currentDir[dir];
      });

      currentDir.files.push({ name: file.name, file });
      formData.append('files', file);  // Append the file itself to the formData
    });

    formData.append('folderStructure', JSON.stringify(folderStructure));  // Convert folderStructure to JSON string

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/rooms/${roomId}/upload-folder`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      alert('Folder uploaded successfully');
    } catch (err) {
      console.error('Error uploading folder:', err);
      alert('Failed to upload folder');
    }
  };

  return (
    <div>
      <input
        type="file"
        webkitdirectory="true"
        onChange={handleFileChange}
        multiple
      />
      <button onClick={handleFileUpload}>Upload Folder</button>
    </div>
  );
}

export default FileUpload;
