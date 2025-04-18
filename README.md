# 📁 S3 Document Management App

A web application for managing documents with AWS S3 integration. This application allows users to upload, download, and manage documents stored in an AWS S3 bucket.

## 🚀 Features

- 📤 Upload documents to S3
- 📥 Download documents from S3
- 🔍 View document list
- 🗑️ Delete documents
- 🔒 Secure file handling

## 🛠️ Prerequisites

- Node.js (v14 or higher)
- AWS Account with S3 access
- AWS CLI configured locally

## ⚙️ Setup Instructions

1. **Clone the repository**

   ```bash
   git clone git@github.com:Yaswanth6303/S3-Document-Manager.git
   cd S3-Document-Manager
   ```

2. **Configure AWS credentials**

   - Create a `config.js` file in the root directory
   - Add your AWS credentials and S3 bucket configuration:

   ```javascript
   const config = {
     region: "YOUR_REGION", // e.g., "ap-south-1"
     bucketName: "YOUR_BUCKET_NAME",
     credentials: {
       accessKeyId: "YOUR_ACCESS_KEY_ID",
       secretAccessKey: "YOUR_SECRET_ACCESS_KEY",
     },
     defaultUploadPrefix: "uploads/userUploads/",
   };

   // Validate configuration
   const validateConfig = () => {
     if (!config.bucketName) {
       throw new Error("Bucket name is required");
     }
     if (
       !config.credentials.accessKeyId ||
       !config.credentials.secretAccessKey
     ) {
       throw new Error("AWS credentials are required");
     }
     if (!config.region) {
       throw new Error("AWS region is required");
     }
   };

   validateConfig();

   export default config;
   ```

## 🔒 Security Note

- The `config.js` file is included in `.gitignore` to protect your AWS credentials
- Never commit your AWS credentials to version control
- Use environment variables or AWS IAM roles for production deployments

## 📝 Project Structure

```
S3-Document-Manager/
├── assets/          # Static assets
├── server.js        # Backend server
├── index.html       # Frontend
├── styles.css       # Styling
└── config.js        # Configuration (not tracked by git)
```

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.