import React, { useState } from 'react';
import axios from 'axios';

function FileUpload({ roomId }) {
  const [files, setFiles] = useState([]);
  const [singleFile, setSingleFile] = useState(null);

  const handleFileChange = (event) => {
    const selectedFiles = Array.from(event.target.files);
    setFiles(selectedFiles);
  };

  const handleSingleFileChange = (event) => {
    const file = event.target.files[0];
    setSingleFile(file);
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

  const handleSingleFileUpload = async () => {
    if (!singleFile) return;

    const formData = new FormData();
    formData.append('file', singleFile);

    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:5000/api/rooms/${roomId}/upload-file`,
        formData,
        { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'multipart/form-data' } }
      );
      alert('File uploaded successfully');
      setSingleFile(null); // Reset single file input
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('Failed to upload file');
    }
  };

  return (
    <div>
      <h3>Upload Folder</h3>
      <input
        type="file"
        webkitdirectory="true"
        onChange={handleFileChange}
        multiple
      />
      <button onClick={handleFileUpload}>Upload Folder</button>

      <h3>Upload Single File</h3>
      <input
        type="file"
        onChange={handleSingleFileChange}
      />
      <button onClick={handleSingleFileUpload}>Upload File</button>
    </div>
  );
}

export default FileUpload;
