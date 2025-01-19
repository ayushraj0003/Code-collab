  import React, { useState } from 'react';
  import { useNavigate } from 'react-router-dom';
  import axios from 'axios';

  // Define the buildFolderTree function before using it
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

  const RenderFoldersComponent = ({ folders = [], roomId }) => {
    const [expandedFolders, setExpandedFolders] = useState({});
    const [draggedFile, setDraggedFile] = useState(null);
    const [isDropInProgress, setIsDropInProgress] = useState(false);
    const [folderTree, setFolderTree] = useState(buildFolderTree(folders));
    const [editing, setEditing] = useState({ type: '', path: '', name: '' });
    const [singleFile, setSingleFile] = useState(null);
    const navigate = useNavigate();

    const handleFolderClick = (folderPath) => {
      setExpandedFolders((prevExpandedFolders) => ({
        ...prevExpandedFolders,
        [folderPath]: !prevExpandedFolders[folderPath],
      }));
    };

    const API_URL = process.env.REACT_APP_BACKEND_URL;

    const handleFileDragStart = (file, folderPaths) => {
      setDraggedFile({ file, folderPaths });
    };

    const handleFolderDrop = async (e, folderPaths) => {
      e.stopPropagation();
      e.preventDefault();

      if (!isDropInProgress && draggedFile) {
        setIsDropInProgress(true);

        try {
          await axios.post(`${API_URL}/api/rooms/move-file`, {
            roomId,
            fileId: draggedFile.file._id,
            oldFolderPath: draggedFile.folderPaths,
            newFolderPath: folderPaths,
          });

          console.log('File moved successfully');

          const updatedTree = { ...folderTree };

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

          const addFile = (tree, path, file) => {
            const parts = path.split('/').filter(Boolean);
            let current = tree;

            parts.forEach((part, index) => {
              if (!current[part]) current[part] = { files: [], subfolders: {} };
              if (index === parts.length - 1) current[part].files.push(file);
              current = current[part].subfolders;
            });
          };

          removeFile(updatedTree, draggedFile.folderPaths, draggedFile.file._id);
          addFile(updatedTree, folderPaths, draggedFile.file);

          setFolderTree(updatedTree);
        } catch (error) {
          console.error('Error moving file:', error);
        } finally {
          setIsDropInProgress(false);
        }
      }

      setDraggedFile(null);
    };

    const handleFileInFolderClick = (file, folderPaths) => {
      navigate(`/code-editor`, { state: { file, roomId, folderPaths } });
    };

    const handleDeleteFile = async (e, file, folderPaths) => {
      e.stopPropagation();

      if (window.confirm(`Are you sure you want to delete the file: ${file.filename}?`)) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(
            `${API_URL}/api/rooms/${roomId}/file/${encodeURIComponent(folderPaths)}/${file.filename}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

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

    const handleDeleteFolder = async (e, folderPath) => {
      e.stopPropagation();

      if (window.confirm(`Are you sure you want to delete the folder: ${folderPath}?`)) {
        try {
          const token = localStorage.getItem('token');
          await axios.delete(
            `${API_URL}/api/rooms/${roomId}/folder/${encodeURIComponent(folderPath)}`,
            {
              headers: { Authorization: `Bearer ${token}` },
            }
          );

          const updatedTree = { ...folderTree };

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

          deleteFolder(updatedTree, folderPath);

          setFolderTree(updatedTree);
        } catch (error) {
          console.error('Error deleting folder:', error);
        }
      }
    };

    const handleRename = async () => {
      try {
        if (editing.type === 'file') {
          await axios.put(
            `${API_URL}/api/rooms/${roomId}/file/${encodeURIComponent(editing.path)}/file/${encodeURIComponent(editing.name)}`,
            {
              newName: editing.name,  // Ensure the key is `newName` to match backend
            }
          );
        } else if (editing.type === 'folder') {
          await axios.put(
            `${API_URL}/api/rooms/${roomId}/folder/${encodeURIComponent(editing.path)}`,
            {
              newName: editing.name,
            }
          );
        }
    
        // Update the folder tree after renaming
        const updatedTree = { ...folderTree };
        const rename = (tree, path, newName) => {
          const parts = path.split('/').filter(Boolean);
          let current = tree;
    
          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) return;
            current = current[part].subfolders;
          }
    
          const lastPath = parts[parts.length - 1];
          if (current[lastPath]) {
            if (editing.type === 'file') {
              const file = current[lastPath].files.find((f) => f._id === editing.fileId);
              if (file) file.filename = newName;
            } else if (editing.type === 'folder') {
              current[newName] = { ...current[lastPath] };
              delete current[lastPath];
            }
          }
        };
    
        rename(updatedTree, editing.path, editing.name);
        setFolderTree(updatedTree);
        setEditing({ type: '', path: '', name: '' });
      } catch (error) {
        console.error('Error renaming:', error);
      }
    };
    

    const handleStartEditing = (type, path, currentName, fileId) => {
      setEditing({ type, path, name: currentName, fileId });
    };

    const handleSingleFileUpload = async (folderPath) => {
      if (!singleFile) return;
    
      const formData = new FormData();
      formData.append('file', singleFile);
      formData.append('folderPath', folderPath); // Include the folder path
    
      try {
        const token = localStorage.getItem('token');
        await axios.post(
          `${API_URL}/api/rooms/${roomId}/upload-file`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        alert('File uploaded successfully');
        setSingleFile(null); // Reset single file input
    
        // Optionally, update the folder tree with the new file after successful upload
        const updatedTree = { ...folderTree };
        const addFileToTree = (tree, path, file) => {
          const parts = path.split('/').filter(Boolean);
          let current = tree;
    
          parts.forEach((part, index) => {
            if (!current[part]) current[part] = { files: [], subfolders: {} };
            if (index === parts.length - 1) current[part].files.push(file);
            current = current[part].subfolders;
          });
        };
    
        // Assume server response includes the uploaded file data
        const newFile = { filename: singleFile.name, _id: 'newFileId' }; // Update with actual file ID from server response
        addFileToTree(updatedTree, folderPath, newFile);
        setFolderTree(updatedTree);
      } catch (err) {
        console.error('Error uploading file:', err);
        alert('Failed to upload file');
      }
    };
    

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
                  {editing.type === 'folder' && editing.path === fullPath ? (
                    <input
                      type="text"
                      value={editing.name}
                      onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                    />
                  ) : (
                    <strong>{folderName}</strong>
                  )}
                  <button onClick={(e) => handleDeleteFolder(e, fullPath)}>Delete Folder</button>
                  {editing.type === 'folder' && editing.path === fullPath && (
                    <button onClick={handleRename}>Rename Folder</button>
                  )}
                  {editing.type !== 'folder' && (
                    <button onClick={() => handleStartEditing('folder', fullPath, folderName)}>Rename Folder</button>
                  )}
                  <button onClick={() => handleSingleFileUpload(fullPath)}>Upload File</button>

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
                            {editing.type === 'file' && editing.path === fullPath && editing.fileId === file._id ? (
                              <input
                                type="text"
                                value={editing.name}
                                onChange={(e) => setEditing({ ...editing, name: e.target.value })}
                              />
                            ) : (
                              file.filename
                            )}
                            <button onClick={(e) => handleDeleteFile(e, file, fullPath)}>Delete</button>
                            {editing.type === 'file' && editing.path === fullPath && editing.fileId === file._id && (
                              <button onClick={handleRename}>Rename File</button>
                            )}
                            {editing.type !== 'file' && (
                              <button onClick={() => handleStartEditing('file', fullPath, file.filename, file._id)}>Rename File</button>
                            )}
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

    return <div>{renderTree(folderTree)}</div>;
  };

  export default RenderFoldersComponent;
    