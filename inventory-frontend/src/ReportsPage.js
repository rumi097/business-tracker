import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

// Removed apiUrl prop
function ReportsPage({ user }) {
    const [reportData, setReportData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [filter, setFilter] = useState('daily'); // Default filter
    // Default month to current YYYY-MM
    const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));

    // Get the base API URL from environment variables
    const liveApiUrl = process.env.REACT_APP_API_URL;

    const fetchReports = useCallback(async () => {
        // Ensure user ID and API URL exist before fetching
        if (!user?.id || !liveApiUrl) {
            setIsLoading(false); // Stop loading if no user or URL
            return;
        }
        setIsLoading(true);
        try {
            // --- FIX: Update API endpoint and parameters ---
            const response = await axios.get(`${liveApiUrl}/reports`, {
                params: { // Send parameters using axios params config
                    user_id: user.id,
                    filter: filter,
                    month: month // Send month even if filter isn't monthly, backend handles it
                }
            });
            setReportData(response.data);
        } catch (error) {
            console.error("Error fetching reports:", error);
            setReportData(null); // Clear data on error
            // Optionally: Set an error state to show a message
        } finally {
            setIsLoading(false);
        }
    // Include liveApiUrl in dependency array
    }, [user?.id, liveApiUrl, filter, month]);

    useEffect(() => {
        fetchReports();
    }, [fetchReports]); // This effect re-runs whenever filter or month changes

    // Reset filters back to daily
    const handleReset = () => {
        setFilter('daily');
        setMonth(new Date().toISOString().slice(0, 7));
        // fetchReports will be called automatically due to the useEffect dependency
    };

    const formatCurrency = (value) => `$${parseFloat(value || 0).toFixed(2)}`;

    return (
        <div>
            <div className="page-header">
                <h2>Reports</h2>
            </div>

            {/* Filter Controls Card */}
            <div className="card shadow-sm p-3 mb-4">
                <div className="row g-3 align-items-center">
                    <div className="col-auto">
                        <label className="col-form-label">Report Period:</label>
                    </div>
                    <div className="col-auto">
                        <select className="form-select form-select-sm" value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="daily">Daily</option>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                        </select>
                    </div>
                    {/* Show month input only when filter is monthly */}
                    {filter === 'monthly' && (
                        <div className="col-auto">
                             <label className="col-form-label me-2">Month:</label>
                            <input
                                type="month"
                                className="form-control form-control-sm"
                                value={month}
                                onChange={(e) => setMonth(e.target.value)}
                                // Optional: Set max month to current month
                                max={new Date().toISOString().slice(0, 7)}
                             />
                        </div>
                    )}
                    <div className="col-auto ms-auto"> {/* Push reset button to the right */}
                        <button className="btn btn-sm btn-outline-secondary" onClick={handleReset}>Reset Filters</button>
                    </div>
                </div>
            </div>

            {/* Report Data Display */}
            {isLoading ? <p className="text-center p-5">Generating report...</p> : (
            <div className="row">
                {/* Sales Report Card */}
                <div className="col-lg-6 mb-4">
                    <div className="card h-100 shadow-sm">
                        <div className="card-header bg-light">
                             <h5 className="card-title mb-0">Sales Report ({filter === 'monthly' ? month : filter})</h5>
                        </div>
                        <div className="card-body">
                            {/* Use optional chaining and default values */}
                            {reportData?.sales_report ? (
                                <>
                                    <p><strong>Total Sales:</strong> {formatCurrency(reportData.sales_report.total_sales)}</p>
                                    <p><strong>Cost of Goods Sold:</strong> {formatCurrency(reportData.sales_report.total_investment)}</p>
                                    <hr/>
                                    <h4 className={parseFloat(reportData.sales_report.total_profit) >= 0 ? 'text-success' : 'text-danger'}>
                                        <strong>Profit:</strong> {formatCurrency(reportData.sales_report.total_profit)}
                                    </h4>
                                </>
                            ) : <p className="text-muted">No sales data found for this period.</p>}
                        </div>
                    </div>
                </div>

                {/* Investment Overview Card */}
                <div className="col-lg-6 mb-4">
                    <div className="card h-100 shadow-sm">
                        <div className="card-header bg-light">
                            <h5 className="card-title mb-0">Investment Overview</h5>
                        </div>
                        <div className="card-body">
                             {reportData ? (
                                <>
                                    <p><strong>Value of Current Stock:</strong> {formatCurrency(reportData.current_stock_value)}</p>
                                    <hr/>
                                    <p><strong>Monthly Investment ({month}):</strong> {formatCurrency(reportData.monthly_investment)}</p>
                                    <p><strong>Total Investment (All-Time):</strong> {formatCurrency(reportData.total_investment)}</p>
                                </>
                            ) : <p className="text-muted">No investment data available.</p>}
                        </div>
                    </div>
                </div>
            </div>
            )}
        </div>
    );
}

export default ReportsPage;