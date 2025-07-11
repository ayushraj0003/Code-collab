import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "./RenderFoldersComponent.css";

// Define the buildFolderTree function before using it
const buildFolderTree = (folders) => {
  const tree = {};

  folders.forEach((folder) => {
    const parts = folder.path.split("/").filter(Boolean);
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
  const [editing, setEditing] = useState({ type: "", path: "", name: "" });
  const [singleFile, setSingleFile] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);
  const [fileInputPath, setFileInputPath] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setActiveMenu(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleFolderClick = (folderPath) => {
    setExpandedFolders((prevExpandedFolders) => ({
      ...prevExpandedFolders,
      [folderPath]: !prevExpandedFolders[folderPath],
    }));
  };

  const toggleMenu = (itemPath, itemType, event) => {
    event.preventDefault();
    event.stopPropagation();

    const menuKey = `${itemType}-${itemPath}`;

    if (activeMenu === menuKey) {
      setActiveMenu(null);
      return;
    }

    // Get viewport dimensions
    const viewport = {
      width: window.innerWidth,
      height: window.innerHeight,
    };

    // Calculate position relative to the button
    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 180; // Reduced width
    const menuHeight = 120;

    // Position menu to the left of the button by default (since button is on the right)
    let top = rect.top;
    let left = rect.left - menuWidth - 5; // Position to the left with small gap

    // If menu would go off the left edge, position it to the right
    if (left < 10) {
      left = rect.right + 5;
    }

    // If still off screen on the right, position it within viewport
    if (left + menuWidth > viewport.width - 10) {
      left = viewport.width - menuWidth - 10;
    }

    // Ensure menu doesn't go off the top or bottom
    if (top < 10) {
      top = 10;
    }

    if (top + menuHeight > viewport.height - 10) {
      top = rect.bottom - menuHeight;
      // If still off screen, position above the button
      if (top < 10) {
        top = rect.top - menuHeight - 5;
      }
    }

    // Final bounds checking
    top = Math.max(10, Math.min(top, viewport.height - menuHeight - 10));
    left = Math.max(10, Math.min(left, viewport.width - menuWidth - 10));

    console.log("Menu position:", { top, left, buttonRect: rect }); // Debug

    setMenuPosition({ top, left });
    setActiveMenu(menuKey);
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

        console.log("File moved successfully");

        const updatedTree = { ...folderTree };

        const removeFile = (tree, path, fileId) => {
          const parts = path.split("/").filter(Boolean);
          let current = tree;

          for (let i = 0; i < parts.length - 1; i++) {
            const part = parts[i];
            if (!current[part]) return;
            current = current[part].subfolders;
          }

          const lastPath = parts[parts.length - 1];
          if (current[lastPath]) {
            current[lastPath].files = current[lastPath].files.filter(
              (f) => f._id !== fileId
            );
          }
        };

        const addFile = (tree, path, file) => {
          const parts = path.split("/").filter(Boolean);
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
        console.error("Error moving file:", error);
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

    if (
      window.confirm(
        `Are you sure you want to delete the file: ${file.filename}?`
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(
          `${API_URL}/api/rooms/${roomId}/file/${encodeURIComponent(
            folderPaths
          )}/${file.filename}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const updatedTree = { ...folderTree };
        const paths = folderPaths.split("/").filter(Boolean);
        let current = updatedTree;

        for (let i = 0; i < paths.length - 1; i++) {
          const part = paths[i];
          if (!current[part] || !current[part].subfolders) {
            console.error(
              `Path "${paths
                .slice(0, i + 1)
                .join("/")}" is invalid in the folder tree.`
            );
            return;
          }
          current = current[part].subfolders;
        }

        const lastPath = paths[paths.length - 1];
        if (current[lastPath]) {
          current[lastPath].files = current[lastPath].files.filter(
            (f) => f.filename !== file.filename
          );
        } else {
          console.error(`Folder "${lastPath}" not found in the folder tree.`);
          return;
        }

        setFolderTree(updatedTree);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
    }
  };

  const handleDeleteFolder = async (e, folderPath) => {
    e.stopPropagation();

    if (
      window.confirm(
        `Are you sure you want to delete the folder: ${folderPath}?`
      )
    ) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(
          `${API_URL}/api/rooms/${roomId}/folder/${encodeURIComponent(
            folderPath
          )}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const updatedTree = { ...folderTree };

        const deleteFolder = (tree, path) => {
          const parts = path.split("/").filter(Boolean);
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
        console.error("Error deleting folder:", error);
      }
    }
  };

  const handleRename = async () => {
    try {
      if (editing.type === "file") {
        await axios.put(
          `${API_URL}/api/rooms/${roomId}/file/${encodeURIComponent(
            editing.path
          )}/file/${encodeURIComponent(editing.name)}`,
          {
            newName: editing.name, // Ensure the key is `newName` to match backend
          }
        );
      } else if (editing.type === "folder") {
        await axios.put(
          `${API_URL}/api/rooms/${roomId}/folder/${encodeURIComponent(
            editing.path
          )}`,
          {
            newName: editing.name,
          }
        );
      }

      // Update the folder tree after renaming
      const updatedTree = { ...folderTree };
      const rename = (tree, path, newName) => {
        const parts = path.split("/").filter(Boolean);
        let current = tree;

        for (let i = 0; i < parts.length - 1; i++) {
          const part = parts[i];
          if (!current[part]) return;
          current = current[part].subfolders;
        }

        const lastPath = parts[parts.length - 1];
        if (current[lastPath]) {
          if (editing.type === "file") {
            const file = current[lastPath].files.find(
              (f) => f._id === editing.fileId
            );
            if (file) file.filename = newName;
          } else if (editing.type === "folder") {
            current[newName] = { ...current[lastPath] };
            delete current[lastPath];
          }
        }
      };

      rename(updatedTree, editing.path, editing.name);
      setFolderTree(updatedTree);
      setEditing({ type: "", path: "", name: "" });
    } catch (error) {
      console.error("Error renaming:", error);
    }
  };

  const handleStartEditing = (type, path, currentName, fileId) => {
    setEditing({ type, path, name: currentName, fileId });
  };

  const handleSingleFileUpload = async (folderPath) => {
    if (!singleFile) {
      // Trigger file input
      setFileInputPath(folderPath);
      document.getElementById(`file-input-${folderPath}`).click();
      return;
    }

    const formData = new FormData();
    formData.append("file", singleFile);
    formData.append("folderPath", folderPath);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/rooms/${roomId}/upload-file`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });

      // Success notification
      const notification = document.createElement("div");
      notification.className = "upload-notification success";
      notification.textContent = "✅ File uploaded successfully";
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);

      setSingleFile(null);
      setActiveMenu(null);

      const updatedTree = { ...folderTree };
      const addFileToTree = (tree, path, file) => {
        const parts = path.split("/").filter(Boolean);
        let current = tree;

        parts.forEach((part, index) => {
          if (!current[part]) current[part] = { files: [], subfolders: {} };
          if (index === parts.length - 1) current[part].files.push(file);
          current = current[part].subfolders;
        });
      };

      const newFile = { filename: singleFile.name, _id: Date.now().toString() };
      addFileToTree(updatedTree, folderPath, newFile);
      setFolderTree(updatedTree);
    } catch (err) {
      console.error("Error uploading file:", err);
      const notification = document.createElement("div");
      notification.className = "upload-notification error";
      notification.textContent = "❌ Failed to upload file";
      document.body.appendChild(notification);
      setTimeout(() => notification.remove(), 3000);
    }
  };

  const handleFileInputChange = (e, folderPath) => {
    const file = e.target.files[0];
    if (file) {
      setSingleFile(file);
      handleSingleFileUpload(folderPath);
    }
  };

  const renderTree = (node, path = "") => {
    return (
      <ul className="folder-tree">
        {Object.keys(node).map((folderName, index) => {
          const fullPath = `${path}/${folderName}`.replace(/^\/+/, "");
          const isExpanded = expandedFolders[fullPath];
          const folderMenuKey = `folder-${fullPath}`;

          return (
            <li
              key={index}
              className="folder-item"
              onDrop={(e) => handleFolderDrop(e, fullPath)}
              onDragOver={(e) => e.preventDefault()}
            >
              <div className="item-container">
                <div
                  className="item-content"
                  onClick={() => handleFolderClick(fullPath)}
                >
                  <div className="item-info">
                    <span
                      className={`expand-icon ${isExpanded ? "expanded" : ""}`}
                    >
                      {Object.keys(node[folderName].subfolders).length > 0 ||
                      node[folderName].files.length > 0
                        ? "▶"
                        : ""}
                    </span>
                    <img
                      src="/images/folder.png"
                      alt="Folder"
                      className="item-icon folder-icon"
                    />
                    {editing.type === "folder" && editing.path === fullPath ? (
                      <input
                        type="text"
                        value={editing.name}
                        onChange={(e) =>
                          setEditing({ ...editing, name: e.target.value })
                        }
                        onKeyPress={(e) => e.key === "Enter" && handleRename()}
                        onBlur={handleRename}
                        className="edit-input"
                        autoFocus
                      />
                    ) : (
                      <span className="item-name">{folderName}</span>
                    )}
                  </div>
                </div>

                <div className="item-actions">
                  <button
                    className="menu-trigger"
                    onClick={(e) => {
                      console.log("Folder menu clicked"); // Debug
                      e.preventDefault();
                      e.stopPropagation();
                      toggleMenu(fullPath, "folder", e);
                    }}
                    onMouseDown={(e) => e.stopPropagation()}
                  >
                    ⋮
                  </button>

                  {activeMenu === folderMenuKey && (
                    <div
                      className="dropdown-menu"
                      ref={menuRef}
                      style={{
                        top: `${menuPosition.top}px`,
                        left: `${menuPosition.left}px`,
                      }}
                    >
                      <button
                        className="menu-item upload"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleSingleFileUpload(fullPath);
                        }}
                      >
                        <span className="menu-icon">📁</span>
                        Upload File
                      </button>
                      <button
                        className="menu-item rename"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartEditing("folder", fullPath, folderName);
                          setActiveMenu(null);
                        }}
                      >
                        <span className="menu-icon">✏️</span>
                        Rename
                      </button>
                      <button
                        className="menu-item delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteFolder(e, fullPath);
                          setActiveMenu(null);
                        }}
                      >
                        <span className="menu-icon">🗑️</span>
                        Delete
                      </button>
                    </div>
                  )}
                </div>

                <input
                  type="file"
                  id={`file-input-${fullPath}`}
                  style={{ display: "none" }}
                  onChange={(e) => handleFileInputChange(e, fullPath)}
                />
              </div>

              {isExpanded && (
                <div className="folder-content">
                  {node[folderName].files.length > 0 && (
                    <ul className="file-list">
                      {node[folderName].files.map((file, fileIndex) => {
                        const fileMenuKey = `file-${fullPath}-${file._id}`;

                        return (
                          <li
                            key={fileIndex}
                            className="file-item"
                            draggable
                            onDragStart={() =>
                              handleFileDragStart(file, fullPath)
                            }
                          >
                            <div className="item-container">
                              <div
                                className="item-content"
                                onClick={() =>
                                  handleFileInFolderClick(file, fullPath)
                                }
                              >
                                <div className="item-info">
                                  <img
                                    src="/images/file.png"
                                    alt="File"
                                    className="item-icon file-icon"
                                    height={50}
                                    weidth={50}
                                  />
                                  {editing.type === "file" &&
                                  editing.path === fullPath &&
                                  editing.fileId === file._id ? (
                                    <input
                                      type="text"
                                      value={editing.name}
                                      onChange={(e) =>
                                        setEditing({
                                          ...editing,
                                          name: e.target.value,
                                        })
                                      }
                                      onKeyPress={(e) =>
                                        e.key === "Enter" && handleRename()
                                      }
                                      onBlur={handleRename}
                                      className="edit-input"
                                      autoFocus
                                    />
                                  ) : (
                                    <span className="item-name">
                                      {file.filename}
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="item-actions">
                                <button
                                  className="menu-trigger"
                                  onClick={(e) => {
                                    console.log(
                                      "File menu clicked for:",
                                      file.filename
                                    ); // Debug
                                    e.preventDefault();
                                    e.stopPropagation();
                                    toggleMenu(
                                      `${fullPath}-${file._id}`,
                                      "file",
                                      e
                                    );
                                  }}
                                  onMouseDown={(e) => e.stopPropagation()}
                                >
                                  ⋮
                                </button>

                                {activeMenu === fileMenuKey && (
                                  <div
                                    className="dropdown-menu"
                                    ref={menuRef}
                                    style={{
                                      top: `${menuPosition.top}px`,
                                      left: `${menuPosition.left}px`,
                                    }}
                                  >
                                    <button
                                      className="menu-item rename"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleStartEditing(
                                          "file",
                                          fullPath,
                                          file.filename,
                                          file._id
                                        );
                                        setActiveMenu(null);
                                      }}
                                    >
                                      <span className="menu-icon">✏️</span>
                                      Rename
                                    </button>
                                    <button
                                      className="menu-item delete"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteFile(e, file, fullPath);
                                        setActiveMenu(null);
                                      }}
                                    >
                                      <span className="menu-icon">🗑️</span>
                                      Delete
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  {renderTree(node[folderName].subfolders, fullPath)}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="folder-explorer">
      <div className="explorer-header">
        <h3 className="explorer-title">
          <span className="explorer-icon">📁</span>
          File Explorer
        </h3>
      </div>
      <div className="explorer-content">
        <div className="tree-container">
          {Object.keys(folderTree).length > 0 ? (
            renderTree(folderTree)
          ) : (
            <div className="empty-state">
              <div className="empty-icon">📂</div>
              <p className="empty-text">No folders or files yet</p>
              <p className="empty-subtext">Upload some files to get started</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RenderFoldersComponent;
