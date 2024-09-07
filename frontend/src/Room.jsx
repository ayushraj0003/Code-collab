import React, { useState } from 'react';
import RenderFoldersComponent from './RenderFoldersComponent';  // Your folder rendering component
import CodeEditor from './CodeEditor';  // Your code editor component

const RoomPage = ({ roomId }) => {
  const [selectedFileContent, setSelectedFileContent] = useState('');  // State to hold the file content

  const handleFileInFolderClick = (fileContent) => {
    setSelectedFileContent(fileContent);  // Set the file content to the editor
  };

  return (
    <div className="room-page-container">
      <div className="folder-structure">
        {/* Render folder structure and pass handler to update file content */}
        <RenderFoldersComponent handleFileInFolderClick={handleFileInFolderClick} roomId={roomId} />
      </div>

      <div className="code-editor">
        {/* Render code editor with the selected file content */}
        <CodeEditor code={selectedFileContent} onCodeChange={setSelectedFileContent} roomId={roomId} />
      </div>
    </div>
  );
};

export default RoomPage;
