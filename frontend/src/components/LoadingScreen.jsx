// src/components/LoadingScreen.jsx
import React from 'react';
import './LoadingScreen.css';

const LoadingScreen = () => {
  return (
    <div className="loading-screen">
      <div className="loading-content">
        <div className="logo-container">
          <h1>Sistema de Gestión</h1>
          <h2>Servicio Técnico</h2>
        </div>
        
        <div className="loading-spinner-large"></div>
        
        <p className="loading-text">Verificando estado del sistema...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;