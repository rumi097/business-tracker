import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Removed apiUrl prop
function SalesHistoryPage({ user }) {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);

    // Get the base API URL from environment variables
    const liveApiUrl = process.env.REACT_APP_API_URL;

    const fetchHistory = useCallback(async () => {
        // Ensure user ID and API URL exist before fetching
        if (!user?.id || !liveApiUrl) {
            setLoading(false); // Stop loading if no user or URL
            return;
        }
        setLoading(true);
        try {
            // --- FIX: Update API endpoint URL and parameters ---
            const response = await axios.get(`${liveApiUrl}/sales-history`, {
                params: { user_id: user.id } // Send user_id as query parameter
            });
            // Ensure response.data is always an array
            setHistory(Array.isArray(response.data) ? response.data : []);
        } catch (error) {
            console.error("Error fetching sales history:", error);
            setHistory([]); // Set to empty array on error
            // Optionally: Set an error state to show a message
        } finally {
            setLoading(false);
        }
    // Include liveApiUrl in dependency array
    }, [user?.id, liveApiUrl]);

    useEffect(() => {
        fetchHistory();
    }, [fetchHistory]);

    const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;
    // Helper to format date/time nicely
    const formatDateTime = (isoString) => {
        if (!isoString) return 'N/A';
        try {
            // Use Intl.DateTimeFormat for better locale support
            return new Intl.DateTimeFormat(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: 'numeric', minute: '2-digit', hour12: true
            }).format(new Date(isoString));
        } catch (e) {
            return isoString; // Fallback if date is invalid
        }
    };


    return (
        <div>
            <h2 className="mb-4">Sales History</h2>
            {loading ? <p className="text-center p-5">Loading history...</p> : (
            <div className="card shadow-sm"> {/* Added card wrapper */}
                <div className="table-responsive">
                    <table className="table table-hover table-striped mb-0"> {/* Added striped */}
                        <thead className="table-light">
                            <tr>
                                <th>Invoice ID</th>
                                <th>Date</th>
                                <th>Product Name</th>
                                <th className="text-center">Quantity</th>
                                <th className="text-end">Unit Price</th>
                                <th className="text-end">Total Amount</th>
                            </tr>
                        </thead>
                        <tbody>
                            {history.length > 0 ? history.map((item, index) => (
                                <tr key={item.invoice_id + index}> {/* Use a more unique key if possible */}
                                    <td>{item.invoice_id}</td>
                                    <td>{formatDateTime(item.sale_date)}</td>
                                    <td>{item.product_name}</td>
                                    <td className="text-center">{item.quantity_sold}</td>
                                    <td className="text-end">{formatCurrency(item.sale_price_each)}</td>
                                    <td className="text-end">{formatCurrency(item.total_amount)}</td>
                                </tr>
                            )) : (
                                <tr><td colSpan="6" className="text-center text-muted p-4">No sales recorded yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
            )}
        </div>
    );
}

export default SalesHistoryPage;