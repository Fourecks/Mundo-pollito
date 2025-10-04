import React from 'react';

const Header: React.FC = () => {
  return (
    <div className="text-center mb-6">
        <h1 className="text-4xl md:text-5xl font-bold text-primary-dark dark:text-primary drop-shadow-sm">
            Lista de Tareas
        </h1>
    </div>
  );
};

export default Header;