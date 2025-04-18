// app.js
import config from "./config.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Initialize AWS SDK
  AWS.config.update({
    region: config.region,
    credentials: new AWS.Credentials(
      config.credentials.accessKeyId,
      config.credentials.secretAccessKey
    ),
  });

  const s3 = new AWS.S3();
  const selectedFiles = [];

  // Verify S3 access
  try {
    console.log("Verifying S3 bucket access...");
    await s3.headBucket({ Bucket: config.bucketName }).promise();
    console.log("Successfully connected to S3 bucket");
  } catch (error) {
    console.error("Error accessing S3 bucket:", error);
    showNotification("Error accessing S3 bucket: " + error.message, "error");
    return;
  }

  // DOM Elements
  const uploadArea = document.getElementById("upload-area");
  const fileInput = document.getElementById("file-input");
  const fileList = document.getElementById("file-list");
  const uploadButton = document.getElementById("upload-button");
  const s3FileList = document.getElementById("s3-file-list");
  const loading = document.getElementById("loading");
  const searchInput = document.getElementById("search-input");
  const refreshButton = document.getElementById("refresh-button");
  const notification = document.getElementById("notification");
  const notificationMessage = document.getElementById("notification-message");

  // Add S3 directory input
  const directoryInput = document.createElement("input");
  directoryInput.id = "s3-directory-input";
  directoryInput.type = "text";
  directoryInput.placeholder = "S3 Directory (e.g., documents/projects/)";
  directoryInput.value = config.defaultUploadPrefix;
  directoryInput.className = "directory-input";
  uploadArea.appendChild(directoryInput);

  // Event Listeners
  uploadArea.addEventListener("click", (e) => {
    // Only trigger file input if not clicking the directory input
    if (e.target !== directoryInput) {
      fileInput.click();
    }
  });
  uploadArea.addEventListener("dragover", handleDragOver);
  uploadArea.addEventListener("dragleave", handleDragLeave);
  uploadArea.addEventListener("drop", handleDrop);
  fileInput.addEventListener("change", handleFileSelect);
  uploadButton.addEventListener("click", uploadFiles);
  refreshButton.addEventListener("click", loadS3Files);
  searchInput.addEventListener("input", filterFiles);

  // Prevent click propagation from directory input
  directoryInput.addEventListener("click", (e) => {
    e.stopPropagation();
  });

  // Initialize the app
  loadS3Files();

  // Functions
  function handleDragOver(e) {
    e.preventDefault();
    uploadArea.classList.add("dragover");
  }

  function handleDragLeave(e) {
    e.preventDefault();
    uploadArea.classList.remove("dragover");
  }

  function handleDrop(e) {
    e.preventDefault();
    uploadArea.classList.remove("dragover");

    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleFileSelect(e) {
    if (e.target.files.length > 0) {
      addFiles(e.target.files);
    }
  }

  function addFiles(filesList) {
    for (const file of filesList) {
      if (!selectedFiles.some((f) => f.name === file.name)) {
        selectedFiles.push(file);
        addFileToList(file);
      }
    }

    updateUploadButton();
  }

  function addFileToList(file) {
    const fileSize = formatFileSize(file.size);
    const fileType = getFileType(file.name);

    const li = document.createElement("li");
    li.innerHTML = `
            <div class="file-info">
                <i class="file-icon fas ${getFileIcon(fileType)}"></i>
                <div>
                    <div class="file-name">${file.name}</div>
                    <div class="file-size">${fileSize}</div>
                </div>
            </div>
            <button class="remove-file" data-name="${file.name}">
                <i class="fas fa-times"></i>
            </button>
        `;

    li.querySelector(".remove-file").addEventListener("click", function () {
      const fileName = this.getAttribute("data-name");
      removeFile(fileName);
    });

    fileList.appendChild(li);
  }

  function removeFile(fileName) {
    const index = selectedFiles.findIndex((file) => file.name === fileName);
    if (index !== -1) {
      selectedFiles.splice(index, 1);
      updateFileList();
      updateUploadButton();
    }
  }

  function updateFileList() {
    fileList.innerHTML = "";
    selectedFiles.forEach((file) => addFileToList(file));
  }

  function updateUploadButton() {
    uploadButton.disabled = selectedFiles.length === 0;
  }

  async function uploadFiles() {
    if (selectedFiles.length === 0) return;

    uploadButton.disabled = true;
    let successCount = 0;
    let errorCount = 0;

    let s3Prefix = directoryInput.value.trim();
    if (!s3Prefix) {
      s3Prefix = config.defaultUploadPrefix;
    }
    s3Prefix = s3Prefix.replace(/^\/+/, "").replace(/\/+$/, "") + "/";

    try {
      for (const file of selectedFiles) {
        try {
          const params = {
            Bucket: config.bucketName,
            Key: `${s3Prefix}${file.name}`,
            Body: file,
            ContentType: file.type,
          };

          console.log("Uploading to S3:", params.Key);
          await s3.upload(params).promise();
          console.log("Successfully uploaded:", file.name);
          successCount++;
        } catch (error) {
          console.error(`Error uploading ${file.name} to S3:`, error);
          showNotification(
            `Error uploading ${file.name}: ${error.message}`,
            "error"
          );
          errorCount++;
        }
      }

      if (successCount > 0) {
        showNotification(`Successfully uploaded ${successCount} file(s) to S3`);
        selectedFiles.length = 0;
        updateFileList();
        updateUploadButton();
        fileInput.value = "";
        loading.style.display = "block";
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await loadS3Files();
      }

      if (errorCount > 0) {
        showNotification(
          `Failed to upload ${errorCount} file(s) to S3`,
          "error"
        );
      }
    } finally {
      uploadButton.disabled = false;
    }
  }

  async function loadS3Files() {
    loading.style.display = "block";
    s3FileList.innerHTML = "";

    try {
      console.log("Loading files from S3 bucket:", config.bucketName);
      const params = {
        Bucket: config.bucketName,
        Prefix: "",
      };

      const data = await s3.listObjectsV2(params).promise();
      console.log("S3 Response:", data);

      if (!data.Contents || data.Contents.length === 0) {
        console.log("No files found in S3");
        s3FileList.innerHTML = `<div class="no-files">
                <i class="fas fa-folder-open"></i>
                <p>No files found in S3</p>
            </div>`;
      } else {
        const files = data.Contents.filter(
          (item) => item.Key && !item.Key.endsWith("/") && item.Size > 0
        );

        files.forEach((file) => {
          const fileName = file.Key.split("/").pop();
          const filePath = file.Key;
          const fileType = getFileType(fileName);
          const fileSize = formatFileSize(file.Size);
          const lastModified = new Date(file.LastModified).toLocaleDateString();

          const fileCard = document.createElement("div");
          fileCard.className = "file-card";
          fileCard.dataset.name = fileName.toLowerCase();
          fileCard.innerHTML = `
                    <div class="file-card-header">
                        <i class="fas ${getFileIcon(fileType)}"></i>
                    </div>
                    <div class="file-card-body">
                        <div class="file-card-name">${fileName}</div>
                        <div class="file-card-info">
                            <div>${fileSize}</div>
                            <div>S3 Path: ${filePath}</div>
                            <div>Last modified: ${lastModified}</div>
                        </div>
                        <div class="file-card-actions">
                            <button class="file-action-button download-button" data-key="${
                              file.Key
                            }">
                                <i class="fas fa-download"></i> Download
                            </button>
                            <div class="secondary-actions">
                                <button class="file-action-button open-button" data-key="${
                                  file.Key
                                }">
                                    <i class="fas fa-eye"></i> Open
                                </button>
                                <button class="file-action-button delete-button" data-key="${
                                  file.Key
                                }">
                                    <i class="fas fa-trash"></i> Delete
                                </button>
                            </div>
                        </div>
                    </div>
                `;

          fileCard
            .querySelector(".open-button")
            .addEventListener("click", function () {
              openFile(this.getAttribute("data-key"));
            });

          fileCard
            .querySelector(".download-button")
            .addEventListener("click", function () {
              downloadFile(this.getAttribute("data-key"));
            });

          fileCard
            .querySelector(".delete-button")
            .addEventListener("click", function () {
              deleteFile(this.getAttribute("data-key"));
            });

          s3FileList.appendChild(fileCard);
        });
      }
    } catch (error) {
      console.error("Error loading files from S3:", error);
      s3FileList.innerHTML = `<div class="no-files">
            <i class="fas fa-exclamation-triangle"></i>
            <p>Error loading S3 files: ${error.message}</p>
        </div>`;
    } finally {
      loading.style.display = "none";
    }
  }

  async function downloadFile(key) {
    try {
      const params = {
        Bucket: config.bucketName,
        Key: key,
        Expires: 60,
      };

      const url = await s3.getSignedUrlPromise("getObject", params);
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = downloadUrl;
      a.download = key.split("/").pop();
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(downloadUrl);

      showNotification("Download started from S3");
    } catch (error) {
      console.error("Error downloading file from S3:", error);
      showNotification("Error downloading file from S3", "error");
    }
  }

  async function openFile(key) {
    try {
      const params = {
        Bucket: config.bucketName,
        Key: key,
        Expires: 60,
      };

      const url = await s3.getSignedUrlPromise("getObject", params);
      window.open(url, "_blank");
      showNotification("Opening file from S3");
    } catch (error) {
      console.error("Error opening file from S3:", error);
      showNotification("Error opening file from S3", "error");
    }
  }

  async function deleteFile(key) {
    if (
      !confirm(
        `Are you sure you want to delete "${key.split("/").pop()}" from S3?`
      )
    ) {
      return;
    }

    try {
      const params = {
        Bucket: config.bucketName,
        Key: key,
      };

      await s3.deleteObject(params).promise();
      showNotification("File deleted from S3 successfully");
      loadS3Files();
    } catch (error) {
      console.error("Error deleting file from S3:", error);
      showNotification("Error deleting file from S3", "error");
    }
  }

  function filterFiles() {
    const searchTerm = searchInput.value.toLowerCase();
    const files = s3FileList.querySelectorAll(".file-card");

    files.forEach((file) => {
      const fileName = file.dataset.name;
      if (fileName.includes(searchTerm)) {
        file.style.display = "";
      } else {
        file.style.display = "none";
      }
    });
  }

  function showNotification(message, type = "success") {
    notificationMessage.textContent = message;
    notification.className = "notification";
    notification.classList.add(type);
    notification.classList.add("show");

    setTimeout(() => {
      notification.classList.remove("show");
    }, 3000);
  }

  function getFileType(fileName) {
    const extension = fileName.split(".").pop().toLowerCase();

    const imageTypes = ["jpg", "jpeg", "png", "gif", "bmp", "svg", "webp"];
    const documentTypes = [
      "pdf",
      "doc",
      "docx",
      "xls",
      "xlsx",
      "ppt",
      "pptx",
      "txt",
      "rtf",
      "csv",
    ];
    const videoTypes = ["mp4", "avi", "mov", "wmv", "flv", "webm", "mkv"];
    const audioTypes = ["mp3", "wav", "ogg", "flac", "aac", "m4a"];
    const archiveTypes = ["zip", "rar", "7z", "tar", "gz"];
    const codeTypes = [
      "html",
      "css",
      "js",
      "json",
      "xml",
      "py",
      "java",
      "cpp",
      "c",
      "php",
      "rb",
    ];

    if (imageTypes.includes(extension)) return "image";
    if (documentTypes.includes(extension)) return "document";
    if (videoTypes.includes(extension)) return "video";
    if (audioTypes.includes(extension)) return "audio";
    if (archiveTypes.includes(extension)) return "archive";
    if (codeTypes.includes(extension)) return "code";

    return "other";
  }

  function getFileIcon(fileType) {
    switch (fileType) {
      case "image":
        return "fa-file-image";
      case "document":
        return "fa-file-alt";
      case "video":
        return "fa-file-video";
      case "audio":
        return "fa-file-audio";
      case "archive":
        return "fa-file-archive";
      case "code":
        return "fa-file-code";
      default:
        return "fa-file";
    }
  }

  function formatFileSize(bytes) {
    if (bytes === 0) return "0 Bytes";

    const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));

    return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
  }
});
