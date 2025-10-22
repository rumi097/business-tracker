import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

// Removed unused apiUrl prop
function AnalyticsPage({ user }) {
    const [period, setPeriod] = useState('daily');
    const [analyticsData, setAnalyticsData] = useState(null);
    const [loading, setLoading] = useState(true);

    const fetchAnalytics = useCallback(async () => {
        // Ensure user ID exists before fetching
        if (!user?.id) {
            setLoading(false); // Stop loading if no user
            return;
        }
        setLoading(true);

        // Get the live API URL from environment variables
        const liveApiUrl = process.env.REACT_APP_API_URL;

        try {
            // --- FIX: Update the API endpoint URL ---
            const response = await axios.get(`${liveApiUrl}/analytics`, {
                params: { // Send parameters using axios params config
                    user_id: user.id,
                    period: period
                }
            });
            setAnalyticsData(response.data);
        } catch (error) {
            console.error("Error fetching analytics:", error);
            // Optionally set an error state here to show a message to the user
        } finally {
            setLoading(false);
        }
    }, [user?.id, period]); // Depend on user.id

    useEffect(() => {
        fetchAnalytics();
    }, [fetchAnalytics]);

    const chartOptions = {
        responsive: true,
        plugins: {
            legend: { position: 'top' },
            title: { display: true, text: `Product Sales (${period})` },
        },
        // Optional: Ensure y-axis starts at 0
        scales: {
            y: {
                beginAtZero: true
            }
        }
    };

    const chartData = {
        // Use optional chaining and default value for safety
        labels: analyticsData?.chartData?.map(d => d.product_name) || [],
        datasets: [{
            label: 'Quantity Sold',
            data: analyticsData?.chartData?.map(d => d.total_quantity) || [],
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderColor: 'rgba(59, 130, 246, 1)', // Add border color
            borderWidth: 1 // Add border width
        }],
    };

    return (
        <div>
            <div className="page-header">
                <h2>Product Analytics</h2>
                <div className="actions">
                    {/* Use btn-group for better styling */}
                    <div className="btn-group">
                        <button className={`btn ${period === 'daily' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('daily')}>Daily</button>
                        <button className={`btn ${period === 'weekly' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('weekly')}>Weekly</button>
                        <button className={`btn ${period === 'monthly' ? 'btn-primary' : 'btn-outline-secondary'}`} onClick={() => setPeriod('monthly')}>Monthly</button>
                    </div>
                </div>
            </div>

            {loading ? <p className="text-center p-5">Loading analytics...</p> :
            (!analyticsData ? <p className="text-center p-5 text-danger">Failed to load analytics data.</p> :
            (
                <>
                    <div className="row mb-4">
                        <div className="col-md-6 mb-3 mb-md-0">
                            <div className="card h-100 shadow-sm">
                                <div className="card-body text-center">
                                    <h5 className="card-title text-muted">Highest Selling ({period})</h5>
                                    {analyticsData?.highestProduct ? (
                                        <>
                                            <h3 className="card-text">{analyticsData.highestProduct.product_name}</h3>
                                            <p className="fs-4 text-success">{analyticsData.highestProduct.total_quantity} units</p>
                                        </>
                                    ) : <p className="text-muted">No sales data.</p>}
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6">
                            <div className="card h-100 shadow-sm">
                                <div className="card-body text-center">
                                    <h5 className="card-title text-muted">Lowest Selling ({period})</h5>
                                    {analyticsData?.lowestProduct ? (
                                        <>
                                            <h3 className="card-text">{analyticsData.lowestProduct.product_name}</h3>
                                            <p className="fs-4 text-danger">{analyticsData.lowestProduct.total_quantity} units</p>
                                        </>
                                    ) : <p className="text-muted">No sales data.</p>}
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="card shadow-sm">
                        <div className="card-body">
                           {(analyticsData?.chartData?.length ?? 0) > 0 ? <Bar options={chartOptions} data={chartData} /> : <p className="text-center text-muted p-5">No chart data available for this period.</p>}
                        </div>
                    </div>
                </>
            ))}
        </div>
    );
}

export default AnalyticsPage;