import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

// Assuming AddIcon is defined elsewhere or imported
const AddIcon = () => <svg className="icon" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>;

// Removed unused apiUrl prop
function ExpensesPage({ user }) {
    const [summary, setSummary] = useState({ daily: 0, weekly: 0, monthly: 0 });
    const [newExpense, setNewExpense] = useState({ title: '', amount: '' });
    const [loadingSummary, setLoadingSummary] = useState(true); // Added loading state

    const fetchSummary = useCallback(async () => {
        // Ensure user ID exists before fetching
        if (!user?.id) {
            setLoadingSummary(false); // Stop loading if no user
            return;
        }
        setLoadingSummary(true);

        // Get the live API URL from environment variables
        const liveApiUrl = process.env.REACT_APP_API_URL;

        try {
            // --- FIX: Update API endpoint URL and parameters ---
            const response = await axios.get(`${liveApiUrl}/expenses/summary`, {
                params: { user_id: user.id } // Send user_id as query parameter
            });
            setSummary(response.data);
        } catch (error) {
            console.error("Error fetching expense summary:", error);
            toast.error("Could not load expense summary.");
        } finally {
            setLoadingSummary(false);
        }
    }, [user?.id]); // Depend on user.id

    useEffect(() => {
        fetchSummary();
    }, [fetchSummary]);

    const handleInputChange = (e) => {
        const { name, value } = e.target;
        setNewExpense({ ...newExpense, [name]: value });
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();
        if (!newExpense.title || !newExpense.amount) {
            return toast.error("Please fill in both fields.");
        }

        const liveApiUrl = process.env.REACT_APP_API_URL;

        // --- FIX: Update API endpoint URL and request body ---
        const promise = axios.post(`${liveApiUrl}/expenses`, { // Use the base /expenses route
            user_id: user.id,
            title: newExpense.title,
            amount: newExpense.amount,
        });

        toast.promise(promise, {
            loading: 'Adding expense...',
            success: () => {
                fetchSummary(); // Refresh summary after adding
                setNewExpense({ title: '', amount: '' }); // Clear form
                return 'Expense added successfully!';
            },
            error: (err) => err.response?.data?.message || 'Failed to add expense.',
        });
    };

    const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

    return (
        <div>
            <div className="page-header">
                <h2>Additional Expenses</h2>
            </div>

            <div className="row">
                {/* Add New Expense Card */}
                <div className="col-lg-5 mb-4">
                    <div className="card h-100 shadow-sm">
                        <div className="card-header bg-light">
                            <h5 className="card-title mb-0">Add New Expense</h5>
                        </div>
                        <div className="card-body">
                            <form onSubmit={handleAddExpense}>
                                <div className="mb-3">
                                    <label className="form-label">Expense Title</label>
                                    <input type="text" name="title" className="form-control" placeholder="e.g., Office Rent, Utilities" value={newExpense.title} onChange={handleInputChange} required />
                                </div>
                                <div className="mb-3">
                                    <label className="form-label">Amount ($)</label>
                                    <input type="number" step="0.01" name="amount" className="form-control" placeholder="e.g., 500.00" value={newExpense.amount} onChange={handleInputChange} required />
                                </div>
                                <button type="submit" className="btn btn-primary w-100">
                                    <AddIcon /> Add Expense
                                </button>
                            </form>
                        </div>
                    </div>
                </div>

                {/* Expense Summary Card */}
                <div className="col-lg-7 mb-4">
                    <div className="card h-100 shadow-sm">
                         <div className="card-header bg-light">
                            <h5 className="card-title mb-0">Expense Summary</h5>
                        </div>
                        <div className="card-body">
                            {loadingSummary ? <p className="text-center">Loading summary...</p> : (
                                <div className="summary-cards">
                                    {/* These could be styled better */}
                                    <div className="summary-card p-3 mb-2 bg-light border rounded">
                                        <h4>Today's Expenses</h4>
                                        <p className="fs-3">{formatCurrency(summary.daily)}</p>
                                    </div>
                                    <div className="summary-card p-3 mb-2 bg-light border rounded">
                                        <h4>This Week's Expenses</h4>
                                        <p className="fs-3">{formatCurrency(summary.weekly)}</p>
                                    </div>
                                    <div className="summary-card p-3 bg-light border rounded">
                                        <h4>This Month's Expenses</h4>
                                        <p className="fs-3">{formatCurrency(summary.monthly)}</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default ExpensesPage;