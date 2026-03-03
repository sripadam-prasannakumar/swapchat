# SwapChat 🚀 - Real-Time Communication Platform

SwapChat is a premium, full-featured real-time chat application built with **React** and **Firebase**. It offers a seamless, modern communication experience with support for personal messaging, group chats, AI interactions, and various multimedia features.

## ✨ Features

### 💬 Real-Time Messaging
*   **Instant P2P Chat**: Lightning-fast peer-to-peer messaging powered by Firebase Realtime Database.
*   **Group Conversations**: Create and manage group chats with shared media and customization.
*   **Typing & Recording Indicators**: See when your friends are typing or recording voice messages in real-time.
*   **Message Reactions & Replies**: Contextual replies and emoji reactions for expressive conversations.

### 🔍 Discovery & Focus
*   **User Discovery**: A dedicated page to find and connect with all registered users on the platform.
*   **Focused Chat Mode**: A distraction-free chatting experience that hides the sidebar for a dedicated conversation view.
*   **Back Navigation**: Seamlessly toggle between deep conversations and the discovery list.

### 🎥 Multimedia & Calls
*   **Audio/Video Calling**: Real-time high-quality calls with global notification support.
*   **Voice Messages**: Record and send voice notes with a live waveform-style indicator.
*   **Live Camera Capture**: Update your profile photo instantly using your device's camera.
*   **Image & Video Sharing**: Share memories with built-in full-screen viewing and media management.

### 🎨 Personalization & UX
*   **Dynamic Themes**: Choose from a variety of animated backgrounds and color palettes (Instagram-inspired).
*   **Dark Mode**: A beautifully crafted dark theme for comfortable night-time use.
*   **Premium Glassmorphism UI**: A modern, sleek design with smooth animations and transitions.
*   **Chat Lock**: Secure your private conversations with personal passcodes.

### 🤖 AI Integration
*   **AIChatbot**: A dedicated AI assistant integrated directly into your chat experience for help and entertainment.

---

## 🛠️ Tech Stack

*   **Frontend**: React.js 18, Tailwind CSS, Material Symbols.
*   **Backend/Database**: Firebase Realtime Database, Firebase Authentication.
*   **Storage**: Firebase Storage (for images, videos, and profile photos).
*   **Deployment**: Vercel.
*   **Communication**: WebRTC / Call Context for Voice/Video.

---

## 🚀 Getting Started

### Prerequisites
*   Node.js (v16+)
*   Firebase Project (Realtime Database, Auth, and Storage enabled)

### Installation
1.  **Clone the repository**:
    ```bash
    git clone https://github.com/[your-username]/swapchat.git
    cd swapchat
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Setup Environment Variables**:
    Create a `.env` file in the root directory and add your Firebase configurations:
    ```env
    REACT_APP_FIREBASE_API_KEY=your_api_key
    REACT_APP_FIREBASE_AUTH_DOMAIN=your_auth_domain
    REACT_APP_FIREBASE_DATABASE_URL=your_db_url
    REACT_APP_FIREBASE_PROJECT_ID=your_project_id
    REACT_APP_FIREBASE_STORAGE_BUCKET=your_storage_bucket
    REACT_APP_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
    REACT_APP_FIREBASE_APP_ID=your_app_id
    ```

4.  **Start the development server**:
    ```bash
    npm start
    ```

---

## 📦 Deployment

The project is configured for easy deployment to **Vercel**:
```bash
vercel --prod
```
Ensure that the Firebase rules and CORS settings are correctly configured for your production domain.

---

## 🛡️ Security
*   Firebase Authentication for secure user login/signup.
*   Realtime Database rules to protect user data and ensure privacy.
*   Chat Lock feature for an extra layer of privacy within the UI.

---

## 📄 License
This project is for educational and portfolio purposes. Feel free to explore and build upon it!

---
*Created with ❤️ by the SwapChat Team.*
