import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import "react-toastify/dist/ReactToastify.css";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <ToastContainer
          position="top-right"
          autoClose={2800}
          theme="light"
          hideProgressBar={false}
          newestOnTop
          closeOnClick
          pauseOnFocusLoss={false}
          draggable
          pauseOnHover
          style={{ fontFamily: "Sora, Inter, system-ui, sans-serif" }}
          toastStyle={{ borderRadius: 12, border: "1px solid #d7e8e6", boxShadow: "0 10px 30px rgba(13,110,110,0.10)" }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
