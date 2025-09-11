import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { t } = useTranslation();

  useEffect(() => {
    // If already logged in, redirect to home
    const user = localStorage.getItem('user');
    if (user) {
      navigate('/');
    }
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    try {
      const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t('login_failed'));
        return;
      }
      // Store user info in localStorage for demo
      localStorage.setItem('user', JSON.stringify(data));
      if (data.role === 'employee') {
        navigate('/schedule');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(t('network_error'));
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <form onSubmit={handleSubmit} className="bg-white p-8 rounded shadow w-80">
        <h2 className="text-2xl mb-4">{t('login')}</h2>
        <input
          type="text"
          placeholder={t('username')}
          value={username}
          onChange={e => setUsername(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        <input
          type="password"
          placeholder={t('password')}
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="w-full mb-2 p-2 border rounded"
          required
        />
        {error && <div className="text-red-500 mb-2">{error}</div>}
        <button type="submit" className="w-full bg-blue-500 text-white py-2 rounded hover:bg-blue-600 transition">{t('login')}</button>
      </form>
    </div>
  );
};

export default LoginPage;
