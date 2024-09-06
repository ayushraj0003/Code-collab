import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // To access state passed via navigation
import CodeEditor from './CodeEditor'; // Import the CodeEditor component

const FileEditor = () => {
  const location = useLocation();
  const { file, roomId } = location.state || {}; // Retrieve file data from location state

  const [code, setCode] = useState('');

  useEffect(() => {
    if (file) {
      // Fetch file content from the server or load it directly if passed
      const fetchFileContent = async () => {
        try {
          // Example: Fetch file content from the server using the file ID
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/file/${file.filename}`,
            { headers: { Authorization: `Bearer ${token}` } });
          const data = await response.json();
          setCode(data.content); // Update the code state with fetched content
        } catch (error) {
          console.error('Error fetching file content:', error);
        }
      };

      fetchFileContent();
    }
  }, [file]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    // Handle additional code change logic if needed
  };

  return (
    <div>
      <h2>{file?.filename}</h2>
      <CodeEditor code={code} onCodeChange={handleCodeChange} roomId={roomId} />
    </div>
  );
};

export default FileEditor;
