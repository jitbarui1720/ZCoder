# ZCoder 🚀

A **real-time collaborative coding platform** that allows multiple users to join a room, write code together, provide input, run code, view output/errors, and chat live — all in one place.

ZCoder is designed as a **full-stack system** with a modern React frontend, a Node.js + Express backend, WebSocket-based real-time collaboration, and MongoDB for persistence.

---

## ✨ Features

- 🧑‍💻 **Real-time collaborative code editor** (Monaco Editor)
- 🔄 **Live code synchronization** using Socket.IO
- 🧠 **Multiple language support** (C, C++, Python, JavaScript)
- ▶️ **Run code with custom input**
- ❌ **Compile-time & runtime error handling**
- 💬 **Live room chat with typing indicators**
- 👥 **User count & connection status**
- 🔐 **Session-based user handling**
- 🎨 **Modern UI with Tailwind CSS**

---

## 🛠 Tech Stack

### Frontend
- **React 19**
- **Vite**
- **React Router v7**
- **Tailwind CSS v4**
- **Monaco Editor** (`@monaco-editor/react`)
- **Socket.IO Client**

### Backend
- **Node.js**
- **Express 5**
- **Socket.IO**
- **MongoDB + Mongoose**
- **bcryptjs** (authentication utilities)
- **dotenv** (environment variables)

### Database
- **MongoDB Atlas (Cloud MongoDB)**

---

## 📁 Project Structure

```
ZCoder/
│
├── frontend/
│   ├── src/
│   │   ├── pages/        # Login, Signup, CodingPage, Home
│   │   ├── assets/       # Logo
│   │   ├── app.jsx
│   │   ├── index.css     # Main css file
│   │   └── main.jsx
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── backend/
│   ├── server.js
│   ├── routes/
│   ├── models/
│   ├── temp/             # Temporary code & input files
│   └── package.json
│
└── README.md
```

---

## ⚙️ Environment Variables

### Backend (`backend/.env`)

```env
PORT=5001
MONGO_URI=mongodb+srv://<username>:<password>@cluster.mongodb.net/ZCoder_DB
```

---

## 🚀 Running the Project Locally

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Biraj-Sarkar/ZCoder.git
cd zcoder
```

---

### 2️⃣ Start Backend

```bash
cd backend
npm install
npm run dev
```

Backend will run on:
```
http://localhost:5001
```

---

### 3️⃣ Start Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend will run on:
```
http://localhost:5173
```

---

## 🔄 Real-Time Collaboration Flow

1. User joins a room via URL parameters
2. Socket.IO establishes connection
3. Code, input, and output are synced across users
4. Typing events & messages broadcasted live
5. Output updates propagate to all users

---

## 🧪 Error Handling

- **Compile errors** → displayed in red output panel
- **Runtime errors** → captured via stderr & exit code
- **Network/socket errors** → handled with reconnection logic

---

## 🌐 Deployment Strategy (Recommended)

| Component | Platform |
|---------|----------|
| Frontend | Vercel |
| Backend | Render / Railway |
| Database | MongoDB Atlas |

---

## 📌 Future Improvements

- 🔒 JWT-based authentication
- 📂 File upload & saving
- 🧠 AI code assistant
- 🏆 Submission history
- 🌙 Dark mode

---

## 👨‍💻 Author

**Biraj Sarkar**  
B.Tech CSE, IIT Guwahati

---

## 📜 License

This project is licensed under the **ISC License**.

---

> **ZCoder** — *Collaborate. Code. Conquer.*