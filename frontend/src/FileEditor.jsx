import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom'; // To access state passed via navigation
import CodeEditor from './CodeEditor'; // Import the CodeEditor component
import axios from 'axios';

const FileEditor = () => {
  const location = useLocation();
  const { file, roomId, folderPaths } = location.state || {}; // Retrieve file data from location state

  const [code, setCode] = useState(''); // State for current file content
  const [codeHistory, setCodeHistory] = useState([]); // State for storing code history
  const [latestAuthor, setLatestAuthor] = useState(''); // State for displaying the latest author
  const [username, setUsername] = useState('');

  useEffect(() => {
    if (file) {
      // Fetch file content from the server or load it directly if passed
      const fetchFileContent = async () => {
        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            `http://localhost:5000/api/rooms/${roomId}/file/${encodeURIComponent(folderPaths)}/${file.filename}`,
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const data = response.data;

          setCode(data.content); // Update the code state with fetched content
          setCodeHistory(data.codeHistory); // Update the code history state
          setLatestAuthor(data.latestAuth); // Update the latest author state
        } catch (error) {
          console.error('Error fetching file content:', error);
        }
      };

      fetchFileContent();
    }
  }, [file, roomId, folderPaths]);

  useEffect(() => {
    if (latestAuthor) {  // Only fetch user if latestAuthor is available
      const fetchUserName = async () => {
        try {
          const userResponse = await axios.get(`http://localhost:5000/api/auth/${latestAuthor}`);
          setUsername(userResponse.data.name);
        } catch (error) {
          console.error('Error fetching user name:', error);
        }
      };

      fetchUserName();
    }
  }, [latestAuthor]); // Depend on latestAuthor to trigger the effect

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    // Handle additional code change logic if needed
  };

  return (
    <div>
      <h2>{file?.filename}</h2>
      {latestAuthor && <p>Last edited by: {username}</p>}
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
