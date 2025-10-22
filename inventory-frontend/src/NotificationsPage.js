import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Removed apiUrl prop, added setNotificationCount prop
function NotificationsPage({ user, setNotificationCount }) {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    // Get the base API URL from environment variables
    const liveApiUrl = process.env.REACT_APP_API_URL;

    // Effect to clear notification count when component mounts
    useEffect(() => {
        // Clear the count in the parent component (App.js)
        if (setNotificationCount) {
             setNotificationCount(0);
        }
    }, [setNotificationCount]); // Run only when setNotificationCount changes (usually just once)

    const fetchNotifications = useCallback(async () => {
        // Ensure user ID and API URL exist before fetching
        if (!user?.id || !liveApiUrl) {
            setLoading(false); // Stop loading if no user or URL
            return;
        }
        setLoading(true);

        try {
            // --- FIX: Update API endpoint URL and parameters ---
            const response = await axios.get(`${liveApiUrl}/notifications`, {
                params: {
                    user_id: user.id,
                    action: 'get_all' // Node.js route still expects 'action' based on previous conversion
                }
            });
            // Ensure response.data is always an array
            setNotifications(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching notifications:", error);
            toast.error("Could not load notifications.");
            setNotifications([]); // Set to empty array on error
        } finally {
            setLoading(false);
        }
    // Include liveApiUrl in dependency array
    }, [user?.id, liveApiUrl]);

    useEffect(() => {
        fetchNotifications();
    }, [fetchNotifications]);

    return (
        <div>
            <div className="page-header">
                <h2>Stock Notifications</h2>
            </div>
            <div className="card shadow-sm"> {/* Added shadow */}
                <div className="card-body">
                    {loading ? <p className="text-center p-4">Loading notifications...</p> : (
                        notifications.length > 0 ? (
                            <ul className="list-group list-group-flush">
                                {notifications.map((item, index) => (
                                    <li key={index} className="list-group-item d-flex justify-content-between align-items-center">
                                        <div>
                                            <strong className="d-block">{item.name}</strong>
                                            <span className="text-muted">Current stock: {item.quantity}</span>
                                        </div>
                                        {/* Use consistent styling */}
                                        <span className={`badge ${parseInt(item.quantity, 10) <= 0 ? 'bg-danger' : 'bg-warning text-dark'}`}>
                                            {parseInt(item.quantity, 10) <= 0 ? 'Out of Stock' : 'Low Stock'}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="text-center text-muted p-4">No low stock notifications. Everything looks good! 👍</p>
                        )
                    )}
                </div>
            </div>
        </div>
    );
}

export default NotificationsPage;