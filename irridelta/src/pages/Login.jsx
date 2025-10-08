import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

function Login({ setIsLoggedIn }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = (e) => {
    e.preventDefault();
    setError('');

    // VALIDACIÓN MÍNIMA
    if (username === import.meta.env.VITE_LOGIN_USERNAME && password === import.meta.env.VITE_LOGIN_PASSWORD) {
      setIsLoggedIn(true); // Cambia el estado en App.jsx
      navigate('/admin/productos'); // Redirige a la página protegida
    } else {
      setError('Credenciales incorrectas.');
    }
  };

  return (
    <div className="w-full bg-gray-50 py-16 flex justify-center min-h-screen">
      <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-2xl">
        <h2 className="text-3xl font-bold text-center text-gray-800 mb-8">
          Acceso de Administrador
        </h2>
        <form onSubmit={handleLogin} className="space-y-6">
          
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative" role="alert">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">Usuario</label>
            <input
              type="text"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-green-500 focus:border-green-500"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Contraseña</label>
            <input
              type="password"
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-3 focus:ring-green-500 focus:border-green-500"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-green-600 text-white py-3 rounded-lg font-semibold hover:bg-green-700 transition duration-200"
          >
            Ingresar
          </button>
        </form>
      </div>
    </div>
  );
}

export default Login;