import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const RenderFoldersComponent = ({ folders = [], roomId }) => {
  const [expandedFolders, setExpandedFolders] = useState({});
  const [draggedFile, setDraggedFile] = useState(null); // Track the dragged file
  const [isDropInProgress, setIsDropInProgress] = useState(false); // Prevent multiple API calls
  const navigate = useNavigate();

  // Toggle folder expansion state
  const handleFolderClick = (folderPath) => {
    setExpandedFolders((prevExpandedFolders) => ({
      ...prevExpandedFolders,
      [folderPath]: !prevExpandedFolders[folderPath],
    }));
  };

  // Handle file drag start
  const handleFileDragStart = (file, folderPaths) => {
    setDraggedFile({ file, folderPaths }); // Set the dragged file
  };

  // Handle drop event on a folder
  const handleFolderDrop = async (e, folderPaths) => {
    e.stopPropagation(); // Prevent the event from bubbling up to parent folders
    e.preventDefault(); // Prevent default drop behavior

    if (!isDropInProgress && draggedFile) {
      setIsDropInProgress(true); // Lock the drop to prevent multiple calls

      try {
        // Call the backend to update the file location
        console.log('Moving file to:', folderPaths, 'from this path', draggedFile.folderPaths);
        await axios.post(`http://localhost:5000/api/rooms/move-file`, {
          roomId,
          fileId: draggedFile.file._id,
          oldFolderPath: draggedFile.folderPaths,
          newFolderPath: folderPaths,
        });

        console.log('File moved successfully');

        // Update the folder tree state after the move
        const updatedTree = { ...folderTree };

        // Remove the file from the old folder
        const removeFile = (tree, path, fileId) => {
          const parts = path.split('/').filter(Boolean);
          let current = tree;

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) return;
            current = current[part].subfolders;
          }

          const lastPath = parts[parts.length - 1];
          if (current[lastPath]) {
            current[lastPath].files = current[lastPath].files.filter((f) => f._id !== fileId);
          }
        };

        // Add the file to the new folder
        const addFile = (tree, path, file) => {
          const parts = path.split('/').filter(Boolean);
          let current = tree;

          parts.forEach((part, index) => {
            if (!current[part]) current[part] = { files: [], subfolders: {} };
            if (index === parts.length - 1) current[part].files.push(file);
            current = current[part].subfolders;
          });
        };

        // Remove the file from the old location
        removeFile(updatedTree, draggedFile.folderPaths, draggedFile.file._id);
        // Add the file to the new location
        addFile(updatedTree, folderPaths, draggedFile.file);

        setFolderTree(updatedTree);
      } catch (error) {
        console.error('Error moving file:', error);
      } finally {
        setIsDropInProgress(false); // Unlock after the drop action is complete
      }
    }

    setDraggedFile(null); // Clear the dragged file
  };

  // Handle file click and navigate to the CodeEditor page with folderPath
  const handleFileInFolderClick = (file, folderPaths) => {
    navigate(`/code-editor`, { state: { file, roomId, folderPaths } });
  };

  // Handle file deletion
  const handleDeleteFile = async (e, file, folderPaths) => {
    e.stopPropagation(); // Prevent the click event from bubbling up to parent elements

    if (window.confirm(`Are you sure you want to delete the file: ${file.filename}?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `http://localhost:5000/api/rooms/${roomId}/file/${encodeURIComponent(folderPaths)}/${file.filename}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Update the folder tree state after deletion
        const updatedTree = { ...folderTree };
        const paths = folderPaths.split('/').filter(Boolean);
        let current = updatedTree;

        for (let i = 0; i < paths.length - 1; i++) {
          const part = paths[i];
          if (!current[part] || !current[part].subfolders) {
            console.error(`Path "${paths.slice(0, i + 1).join('/')}" is invalid in the folder tree.`);
            return;
          }
          current = current[part].subfolders;
        }

        const lastPath = paths[paths.length - 1];
        if (current[lastPath]) {
          current[lastPath].files = current[lastPath].files.filter((f) => f.filename !== file.filename);
        } else {
          console.error(`Folder "${lastPath}" not found in the folder tree.`);
          return;
        }

        setFolderTree(updatedTree);
      } catch (error) {
        console.error('Error deleting file:', error);
      }
    }
  };

  // Handle folder deletion
  const handleDeleteFolder = async (e, folderPath) => {
    e.stopPropagation(); // Prevent the click event from bubbling up to parent elements

    if (window.confirm(`Are you sure you want to delete the folder: ${folderPath}?`)) {
      try {
        const token = localStorage.getItem('token');
        await axios.delete(
          `http://localhost:5000/api/rooms/${roomId}/folder/${encodeURIComponent(folderPath)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        // Update the folder tree state after deletion
        const updatedTree = { ...folderTree };

        // Function to delete folder from the tree
        const deleteFolder = (tree, path) => {
          const parts = path.split('/').filter(Boolean);
          let current = tree;

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) return;
            current = current[part].subfolders;
          }

          const lastPath = parts[parts.length - 1];
          if (current[lastPath]) {
            delete current[lastPath];
          } else {
            console.error(`Folder "${lastPath}" not found in the folder tree.`);
          }
        };

        // Delete the folder
        deleteFolder(updatedTree, folderPath);

        setFolderTree(updatedTree);
      } catch (error) {
        console.error('Error deleting folder:', error);
      }
    }
  };

  // Build the folder tree from the folder paths
  const buildFolderTree = (folders) => {
    const tree = {};

    folders.forEach((folder) => {
      const parts = folder.path.split('/').filter(Boolean);
      let current = tree;

      parts.forEach((part, index) => {
        if (!current[part]) {
          current[part] = { files: [], subfolders: {} };
        }

        if (index === parts.length - 1) {
          current[part].files = folder.files;
          current[part].folderName = folder.folderName;
        }

        current = current[part].subfolders;
      });
    });

    return tree;
  };

  // Render the folder tree recursively
  const renderTree = (node, path = '') => {
    return (
      <ul>
        {Object.keys(node).map((folderName, index) => {
          const fullPath = `${path}/${folderName}`.replace(/^\/+/, '');
          const isExpanded = expandedFolders[fullPath];

          return (
            <li
              key={index}
              onDrop={(e) => handleFolderDrop(e, fullPath)}
              onDragOver={(e) => e.preventDefault()}
            >
              <span onClick={() => handleFolderClick(fullPath)}>
                <img src="/images/folder.png" alt="Folder" className="folder-icon" />
                <strong>{folderName}</strong>
                <button onClick={(e) => handleDeleteFolder(e, fullPath)}>Delete Folder</button> {/* Add Delete Folder Button */}
              </span>

              {isExpanded && (
                <>
                  {node[folderName].files.length > 0 && (
                    <ul>
                      {node[folderName].files.map((file, fileIndex) => (
                        <li
                          key={fileIndex}
                          draggable
                          onDragStart={() => handleFileDragStart(file, fullPath)}
                          onClick={() => handleFileInFolderClick(file, fullPath)}
                        >
                          <img src="/images/file.png" alt="File" className="folder-icon" />
                          {file.filename}
                          <button onClick={(e) => handleDeleteFile(e, file, fullPath)}>Delete</button> {/* Add Delete Button */}
                        </li>
                      ))}
                    </ul>
                  )}
                  {renderTree(node[folderName].subfolders, fullPath)}
                </>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  const [folderTree, setFolderTree] = useState(buildFolderTree(folders));

  return <div>{renderTree(folderTree)}</div>;
};

export default RenderFoldersComponent;
