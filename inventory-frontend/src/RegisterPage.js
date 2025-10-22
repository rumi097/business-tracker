import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';

// Removed apiUrl prop
function RegisterPage() {
    const [formData, setFormData] = useState({
        username: '', password: '', store_name: '', email: '', location: ''
    });
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setMessage('');

        // Get the live API URL from the environment variable (set in Vercel/Render)
        // Fallback to localhost:5001 for local development
        const liveApiUrl = process.env.REACT_APP_API_URL || 'http://localhost:5001';

        // Check if the URL is available (it should be)
        if (!liveApiUrl) {
            setError("API URL is not configured. Cannot register.");
            setIsLoading(false);
            return;
        }

        try {
            // --- FIX: Update the API endpoint URL ---
            // Use the Node.js route '/auth/register'
            await axios.post(`${liveApiUrl}/auth/register`, formData);
            setMessage('Registration successful! Redirecting to login...');
            setTimeout(() => navigate('/login'), 2000);
        } catch (err) {
            // Use error message from backend if available, otherwise show generic message
            setError(err.response?.data?.message || 'Registration failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="auth-container">
            {/* Animation Section (SVG code remains the same) */}
            <div className="auth-animation-section">
                <svg viewBox="0 0 200 200" className="auth-svg-animation">
                   {/* ... SVG paths ... */}
                    <g id="dashboard-art">
                        <rect x="20" y="40" width="160" height="120" rx="10" fill="#1e1e1e" stroke="#a8d8ea" strokeWidth="2"/>
                        <path d="M 40 120 Q 60 90, 80 105 T 120 100 T 160 130" stroke="#a8e6cf" strokeWidth="3" fill="none" />
                        <rect x="50" y="70" width="10" height="25" fill="#a8d8ea" rx="2"/>
                        <rect x="70" y="60" width="10" height="35" fill="#a8d8ea" rx="2"/>
                        <rect x="90" y="80" width="10" height="15" fill="#a8d8ea" rx="2"/>
                        <path d="M 130 65 l 10 10" stroke="#a8e6cf" strokeWidth="3" strokeLinecap="round"/>
                        <path d="M 130 75 l -5 -5" stroke="#a8e6cf" strokeWidth="3" strokeLinecap="round"/>
                    </g>
                    <g id="security-art">
                        <path d="M 60 100 v -20 a 40 40 0 0 1 80 0 v 20 h 10 v 50 a 10 10 0 0 1 -10 10 h -80 a 10 10 0 0 1 -10 -10 v -50 z" fill="#1e1e1e" stroke="#a8d8ea" strokeWidth="2" />
                        <circle cx="100" cy="125" r="10" fill="#a8e6cf"/>
                        <path d="M 90 145 a 10 10 0 0 1 20 0" stroke="#a8e6cf" strokeWidth="2" fill="none"/>
                    </g>
                </svg>
            </div>
            {/* Form Section */}
            <div className="auth-form-section">
                <div className="auth-card shadow"> {/* Added shadow */}
                    <h3 className="text-center mb-4">Register New Store</h3>
                    {message && <div className="alert alert-success">{message}</div>}
                    {error && <div className="alert alert-danger">{error}</div>}
                    <form onSubmit={handleRegister}>
                        <div className="mb-3">
                            <input name="store_name" value={formData.store_name} onChange={handleChange} className="form-control" placeholder="Store Name" required />
                        </div>
                        <div className="mb-3">
                            <input name="username" value={formData.username} onChange={handleChange} className="form-control" placeholder="Username" required />
                        </div>
                        <div className="mb-3">
                            <input name="email" type="email" value={formData.email} onChange={handleChange} className="form-control" placeholder="Email Address" required />
                        </div>
                        <div className="mb-3">
                            <input name="password" type="password" value={formData.password} onChange={handleChange} className="form-control" placeholder="Password" required />
                        </div>
                        <div className="mb-3">
                            <input name="location" value={formData.location} onChange={handleChange} className="form-control" placeholder="Location (e.g., Rajshahi, Bangladesh)" />
                        </div>
                        <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
                            {isLoading ? 'Registering...' : 'Create Account'}
                        </button>
                    </form>
                    <p className="text-center mt-4 text-muted">
                        Already have an account? <Link to="/login">Login here</Link>
                    </p>
                </div>
            </div>
        </div>
    );
}

export default RegisterPage;