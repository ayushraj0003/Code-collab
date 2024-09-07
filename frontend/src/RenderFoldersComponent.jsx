import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const RenderFoldersComponent = ({ folders = [], roomId }) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const navigate = useNavigate(); // useNavigate hook to handle navigation

  // Toggle folder expansion state
  const handleFolderClick = (folderPath) => {
    setExpandedFolders((prevExpandedFolders) => ({
      ...prevExpandedFolders,
      [folderPath]: !prevExpandedFolders[folderPath], // Toggle the expansion state
    }));
  };

  // Handle file click and navigate to the CodeEditor page with folderPath
  const handleFileInFolderClick = (file, folderPaths) => {
    navigate(`/code-editor`, { state: { file, roomId, folderPaths } }); // Pass file, roomId, and folderPath via state
  };

  // Build the folder tree from the folder paths
  const buildFolderTree = (folders) => {
    const tree = {};

    folders.forEach((folder) => {
      const parts = folder.path.split('/').filter(Boolean); // Split path into parts
      let current = tree;

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = { files: [], subfolders: {} };
        }

        if (index === parts.length - 1) {
          current[part].files = folder.files; // Assign files to the last part of the path
          current[part].folderName = folder.folderName; // Assign folder name
        }

        current = current[part].subfolders; // Move to the next subfolder level
      });
    });

    return tree;
  };

  // Render the folder tree recursively
  const renderTree = (node, path = '') => {
    return (
      <ul>
        {Object.keys(node).map((folderName, index) => {
          const fullPath = `${path}/${folderName}`.replace(/^\/+/, ''); // Full path to the folder
          const isExpanded = expandedFolders[fullPath]; // Check if the folder is expanded

          return (
            <li key={index}>
              {/* Folder Click Handler */}
              <span onClick={() => handleFolderClick(fullPath)}>
                <img src="/images/folder.png" alt="Folder" className="folder-icon" />
                <strong>{folderName}</strong>
              </span>

              {/* Render Subfolders and Files if Folder is Expanded */}
              {isExpanded && (
                <>
                  {/* Render Files in the Current Folder */}
                  {node[folderName].files.length > 0 && (
                    <ul>
                      {node[folderName].files.map((file, fileIndex) => (
                        <li key={fileIndex} onClick={() => handleFileInFolderClick(file, fullPath)}>
                            <p>{fullPath}</p>
                          <img src="/images/file.png" alt="File" className="folder-icon" />
                          {file.filename}
                        </li>
                      ))}
                    </ul>
                  )}

                  {/* Recursively Render Subfolders */}
                  {renderTree(node[folderName].subfolders, fullPath)}
                </>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const folderTree = buildFolderTree(folders); // Build the folder tree from the provided data
  return <div>{renderTree(folderTree)}</div>; // Render the folder structure
};

export default RenderFoldersComponent;
