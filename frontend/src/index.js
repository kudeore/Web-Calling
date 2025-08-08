import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));

// This component will be shown if someone visits the base URL (e.g., https://call.yourapp.com)
// without a specific room ID in the link.
const HomePage = () => {
    // Basic inline styles for simplicity
    const pageStyle = {
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        backgroundColor: '#101418',
        color: '#E2E8F0',
        fontFamily: 'Poppins, sans-serif',
        textAlign: 'center'
    };
    
    const headerStyle = {
        fontSize: '2.5rem',
        fontWeight: 700
    };

    const textStyle = {
        fontSize: '1.2rem',
        color: '#718096'
    };

    return (
        <div style={pageStyle}>
            <h1 style={headerStyle}>MentorFlow Calls</h1>
            <p style={textStyle}>Please use a meeting link generated from the main application to join a call.</p>
        </div>
    );
};

root.render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        {/* This route will match any URL like "/some-unique-id" and render the App component */}
        <Route path="/:roomID" element={<App />} />
        
        {/* This is the default route for the home page */}
        <Route path="/" element={<HomePage />} /> 
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);