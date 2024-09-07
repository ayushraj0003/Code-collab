import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // To access state passed via navigation
import CodeEditor from './CodeEditor'; // Import the CodeEditor component

const FileEditor = () => {
  const location = useLocation();
  const { file, roomId, folderPaths } = location.state || {}; // Retrieve file data from location state

  const [code, setCode] = useState(''); // State for current file content
  const [codeHistory, setCodeHistory] = useState([]); // State for storing code history
  const [latestAuthor, setLatestAuthor] = useState(''); // State for displaying the latest author
    // console.log(folderPaths);
  useEffect(() => {
    if (file) {
      // Fetch file content from the server or load it directly if passed
      const fetchFileContent = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`http://localhost:5000/api/rooms/${roomId}/file/${file.filename}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const data = await response.json();
          setCode(data.content); // Update the code state with fetched content
          setCodeHistory(data.codeHistory); // Update the code history state
          setLatestAuthor(data.latestAuth); // Set the latest author
        } catch (error) {
          console.error('Error fetching file content:', error);
        }
      };

      fetchFileContent();
    }
  }, [file, roomId]);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    // Handle additional code change logic if needed
  };

  return (
    <div>
      <h2>{file?.filename}</h2>
      {latestAuthor && <p>Last edited by: {latestAuthor}</p>}
      <CodeEditor code={code} onCodeChange={handleCodeChange} roomId={roomId} filename={file.filename} folderPaths={folderPaths} />
      
      {/* Display Code History */}
      <div>
        <h3>Code History</h3>
        <ul>
          {codeHistory.map((entry, index) => (
            <li key={index}>
              <p>Version {index + 1} - Edited by: {entry.author}</p>
              <pre>{entry.code}</pre>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
};

export default FileEditor;
