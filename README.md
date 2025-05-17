# 🎥 S3 Multipart Upload & Media Processing with AWS

A cloud-native file upload and processing system built using **Ruby on Rails**, **AWS S3 Multipart Upload**, and **AWS MediaConvert**. This project allows users to upload large files efficiently in chunks, and automatically triggers AWS MediaConvert to process uploaded media for optimized playback or conversion.

## ☁️ Tech Stack

- **Backend:** Ruby on Rails (API)
- **Upload Handling:** Amazon S3 Multipart Upload
- **Media Processing:** AWS MediaConvert
- **Authorization:** AWS IAM with custom policies
- **Frontend:** Tailwind CSS with Stimulus
- **JavaScript:** Stimulus controllers (AbortController, progress tracking)

## ⚙️ Features

- 🚀 Upload large files in parallel using S3 Multipart Upload  
- 🎬 Automatically transcode uploaded videos using AWS MediaConvert  
- ⛔ Cancel uploads anytime with AbortController  
- 📦 Presigned URLs for secure and direct upload from client  
- 🔐 Role-based AWS IAM setup for secure operations  
- 🧩 Lightweight, database-free architecture – entirely file-based  

## 🛠 Requirements

- A valid AWS account
- AWS S3 bucket
- AWS MediaConvert job role and endpoint
- IAM user with appropriate permissions (see below)
- Ruby 3.2+, Node.js 18+, Yarn, Rails 7.1+

## 🔐 AWS Setup

### Required IAM Permissions
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "s3:PutObject",
        "s3:AbortMultipartUpload",
        "s3:ListMultipartUploadParts",
        "s3:ListBucketMultipartUploads",
        "s3:ListBucket",
        "s3:CreateMultipartUpload",
        "s3:CompleteMultipartUpload"
      ],
      "Resource": [
        "arn:aws:s3:::your-bucket-name",
        "arn:aws:s3:::your-bucket-name/*"
      ]
    },
    {
      "Effect": "Allow",
      "Action": [
        "mediaconvert:*"
      ],
      "Resource": "*"
    }
  ]
}
