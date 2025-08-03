
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-gray-800/50 backdrop-blur-sm shadow-md w-full p-4 z-10 border-b border-gray-700">
      <div className="flex items-center justify-center">
        <h1 className="text-xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-teal-300">
          Gemini Chatbot
        </h1>
      </div>
    </header>
  );
};

export default Header;
