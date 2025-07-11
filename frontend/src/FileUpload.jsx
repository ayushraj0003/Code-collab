import React, { useState } from "react";
import axios from "axios";
import "./FileUpload.css";

function FileUpload({ roomId }) {
  const [files, setFiles] = useState([]);
  const [singleFile, setSingleFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const API_URL = process.env.REACT_APP_BACKEND_URL;

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

    setIsUploading(true);
    const formData = new FormData();
    const folderStructure = {};

    files.forEach((file) => {
      const pathParts = file.webkitRelativePath.split("/");
      let currentDir = folderStructure;

      pathParts.slice(0, -1).forEach((dir) => {
        if (!currentDir[dir]) {
          currentDir[dir] = { files: [] };
        }
        currentDir = currentDir[dir];
      });

      currentDir.files.push({ name: file.name, file });
      formData.append("files", file); // Append the file itself to the formData
    });

    formData.append("folderStructure", JSON.stringify(folderStructure)); // Convert folderStructure to JSON string

    try {
      const token = localStorage.getItem("token");
      await axios.post(
        `${API_URL}/api/rooms/${roomId}/upload-folder`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      alert("Folder uploaded successfully");
      setFiles([]);
    } catch (err) {
      console.error("Error uploading folder:", err);
      alert("Failed to upload folder");
    } finally {
      setIsUploading(false);
    }
  };

  const handleSingleFileUpload = async () => {
    if (!singleFile) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append("file", singleFile);

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${API_URL}/api/rooms/${roomId}/upload-file`, formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      alert("File uploaded successfully");
      setSingleFile(null); // Reset single file input
    } catch (err) {
      console.error("Error uploading file:", err);
      alert("Failed to upload file");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFiles = Array.from(e.dataTransfer.files);
    if (droppedFiles.length === 1) {
      setSingleFile(droppedFiles[0]);
    } else {
      setFiles(droppedFiles);
    }
  };

  return (
    <div className="file-upload-container">
      <div className="upload-header">
        <h2 className="upload-title">📁 File & Folder Upload</h2>
        <p className="upload-subtitle">
          Upload your files and folders to the workspace
        </p>
      </div>

      <div className="upload-sections">
        {/* Folder Upload Section */}
        <div className="upload-section">
          <div className="section-header">
            <p className="section-title">
              <span className="section-icon">📂</span>
              Upload Folder
            </p>
          </div>

          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""} ${
              files.length > 0 ? "has-files" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">📁</div>
              <p className="drop-text">
                {files.length > 0
                  ? `${files.length} files selected`
                  // : "Drag & drop a folder here or click to browse"}
                  : "Upload Folder"}
              </p>
              <input
                type="file"
                webkitdirectory="true"
                onChange={handleFileChange}
                multiple
                className="file-input"
                id="folder-input"
              />
              <label htmlFor="folder-input" className="file-input-label">
                Choose Folder
              </label>
            </div>
          </div>

          {files.length > 0 && (
            <div className="file-preview">
              <h4>Selected Files ({files.length})</h4>
              <div className="file-list">
                {files.slice(0, 5).map((file, index) => (
                  <div key={index} className="file-item">
                    <span className="file-icon">📄</span>
                    <span className="file-name">{file.name}</span>
                    <span className="file-size">
                      {(file.size / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
                {files.length > 5 && (
                  <div className="file-item more-files">
                    <span>+{files.length - 5} more files...</span>
                  </div>
                )}
              </div>
            </div>
          )}

          <button
            onClick={handleFileUpload}
            disabled={files.length === 0 || isUploading}
            className={`upload-btn ${files.length === 0 ? "disabled" : ""}`}
          >
            {isUploading ? (
              <>
                <span className="spinner"></span>
                Uploading Folder...
              </>
            ) : (
              <>
                <span className="btn-icon">⬆️</span>
                Upload Folder
              </>
            )}
          </button>
        </div>

        {/* Single File Upload Section */}
        <div className="upload-section">
          <div className="section-header">
            <p className="section-title">
              <span className="section-icon">📄</span>
              Upload File
            </p>
          </div>

          <div
            className={`drop-zone ${dragOver ? "drag-over" : ""} ${
              singleFile ? "has-files" : ""
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="drop-zone-content">
              <div className="upload-icon">📄</div>
              <p className="drop-text">
                {singleFile
                  ? `${singleFile.name} selected`
                  // : "Drag & drop a file here or click to browse"}
                  : "Upload File"}
              </p>
              <input
                type="file"
                onChange={handleSingleFileChange}
                className="file-input"
                id="single-file-input"
              />
              <label htmlFor="single-file-input" className="file-input-label">
                Choose File
              </label>
            </div>
          </div>

          {singleFile && (
            <div className="file-preview">
              <h4>Selected File</h4>
              <div className="file-list">
                <div className="file-item">
                  <span className="file-icon">📄</span>
                  <span className="file-name">{singleFile.name}</span>
                  <span className="file-size">
                    {(singleFile.size / 1024).toFixed(1)} KB
                  </span>
                </div>
              </div>
            </div>
          )}

          <button
            onClick={handleSingleFileUpload}
            disabled={!singleFile || isUploading}
            className={`upload-btn ${!singleFile ? "disabled" : ""}`}
          >
            {isUploading ? (
              <>
                <span className="spinner"></span>
                Uploading File...
              </>
            ) : (
              <>
                <span className="btn-icon">⬆️</span>
                Upload File
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

export default FileUpload;
