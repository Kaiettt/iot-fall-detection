// src/pages/Dashboard.jsx
import React, { useState, useEffect } from "react";
import { ref, onValue, query, orderByChild, limitToLast, get } from "firebase/database";
import { realtime_db } from "../config/firebase";
import { useNavigate } from "react-router-dom";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";
import { Activity, Calendar, Clock, Heart, AlertTriangle, UserCheck } from "lucide-react";


function sanitizeEmail(email) {
    return email.split('@')[0];
}

function Dashboard() {
    const [fallData, setFallData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState({
        totalFalls: 0,
        avgHeartRate: 0,
        latestHeartRate: 0,
        lastFallTime: null
    });
    const navigate = useNavigate();

    useEffect(() => {
        const email = localStorage.getItem("email");
        if (!email) {
            navigate("/auth");
            return;
        }

        const sanitizedEmail = sanitizeEmail(email);
        console.log("sanitized email:", sanitizedEmail);

        // Using async function inside useEffect
        const fetchData = async () => {
            try {
                // Reference the email path
                const emailRef = ref(realtime_db, `emails/${sanitizedEmail}`);

                const snapshot = await get(emailRef);
                if (!snapshot.exists()) {
                    console.error("No user found for this email");
                    setLoading(false);
                    return;
                }

                const userId = snapshot.val();
                console.log("userId:", userId);

                // Reference to the user's fall detection data
                const fallDataRef = query(
                    ref(realtime_db, `users/${userId}/fallData`),
                    orderByChild("timestamp"),
                    limitToLast(100)
                );

                const unsubscribe = onValue(fallDataRef, (snapshot) => {
                    const data = snapshot.val();
                    if (data) {
                        // Convert object to array and add key
                        const dataArray = Object.entries(data).map(([key, value]) => ({
                            id: key,
                            ...value,
                            // Convert timestamp to readable date
                            formattedTime: new Date(value.timestamp).toLocaleString()
                        }));

                        // Sort by timestamp (newest first)
                        const sortedData = dataArray.sort((a, b) => b.timestamp - a.timestamp);

                        setFallData(sortedData);

                        // Calculate statistics
                        const totalFalls = sortedData.filter(item => item.fallDetected).length;
                        const avgHeartRate = sortedData.reduce((sum, item) => sum + item.heartRate, 0) / sortedData.length;
                        const latestHeartRate = sortedData[0]?.heartRate || 0;
                        const lastFall = sortedData.find(item => item.fallDetected);

                        setStats({
                            totalFalls,
                            avgHeartRate: Math.round(avgHeartRate),
                            latestHeartRate,
                            lastFallTime: lastFall ? new Date(lastFall.timestamp).toLocaleString() : "No falls detected"
                        });
                    }
                    setLoading(false);
                });

                // Return unsubscribe function for cleanup
                return () => unsubscribe();
            } catch (error) {
                console.error("Error fetching data:", error);
                setLoading(false);
            }
        };

        // Execute the async function
        const unsubscribe = fetchData();

        // Return cleanup function
        return () => {
            if (unsubscribe && typeof unsubscribe === 'function') {
                unsubscribe();
            }
        };
    }, [navigate]);

    const logout = () => {
        localStorage.clear();
        navigate("/auth");
    };
    const voice_assistant = () => {
        navigate("/voice")
    }
    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-50">
                <div className="text-center">
                    <div className="w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="mt-4 text-gray-700">Loading dashboard data...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <header className="bg-gradient-to-r from-blue-600 to-blue-800 text-white shadow-md">
                <div className="container mx-auto px-4 py-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-2xl font-bold">Fall Detection Dashboard</h1>
                        <p className="text-blue-100">Welcome: {localStorage.getItem("email")}</p>
                    </div>
                    <div className="flex gap-2"> {/* Wrap buttons and reduce spacing */}
                        <button
                            onClick={voice_assistant}
                            className="bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            Voice Chat
                        </button>
                        <button
                            onClick={logout}
                            className="bg-white text-blue-700 px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors"
                        >
                            Logout
                        </button>
                    </div>
                </div>

            </header>

            <main className="container mx-auto px-4 py-8">
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    {/* Total Falls Card */}
                    <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
                        <div className="bg-red-100 p-3 rounded-full">
                            <AlertTriangle size={24} className="text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-500">Total Falls</p>
                            <p className="text-2xl font-bold">{stats.totalFalls}</p>
                        </div>
                    </div>

                    {/* Current Heart Rate */}
                    <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
                        <div className="bg-pink-100 p-3 rounded-full">
                            <Heart size={24} className="text-pink-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-500">Latest Heart Rate</p>
                            <p className="text-2xl font-bold">{stats.latestHeartRate} <span className="text-sm font-normal">BPM</span></p>
                        </div>
                    </div>

                    {/* Average Heart Rate */}
                    <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
                        <div className="bg-purple-100 p-3 rounded-full">
                            <Activity size={24} className="text-purple-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-500">Average Heart Rate</p>
                            <p className="text-2xl font-bold">{stats.avgHeartRate} <span className="text-sm font-normal">BPM</span></p>
                        </div>
                    </div>

                    {/* Last Fall */}
                    <div className="bg-white rounded-lg shadow-md p-6 flex items-center">
                        <div className="bg-orange-100 p-3 rounded-full">
                            <Clock size={24} className="text-orange-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm text-gray-500">Last Fall Event</p>
                            <p className="text-sm font-semibold text-gray-700">{stats.lastFallTime}</p>
                        </div>
                    </div>
                </div>

                {/* Heart Rate Chart */}
                <div className="bg-white rounded-lg shadow-md p-6 mb-8">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Heart Rate History</h2>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                                data={[...fallData].reverse().slice(0, 20)} // Get last 20 entries, reversed for chronological order
                            >
                                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                <XAxis
                                    dataKey="formattedTime"
                                    tick={{ fontSize: 10 }}
                                    tickFormatter={(value) => {
                                        const date = new Date(value);
                                        return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
                                    }}
                                />
                                <YAxis
                                    domain={['dataMin - 10', 'dataMax + 10']}
                                    label={{ value: 'BPM', angle: -90, position: 'insideLeft' }}
                                />
                                <Tooltip />
                                <Legend />
                                <Line
                                    type="monotone"
                                    dataKey="heartRate"
                                    stroke="#8884d8"
                                    strokeWidth={2}
                                    name="Heart Rate"
                                    dot={{ stroke: '#8884d8', strokeWidth: 2, r: 4 }}
                                    activeDot={{ r: 6 }}
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* Fall Detection History Table */}
                <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4 text-gray-800">Fall Detection History</h2>

                    <div className="overflow-x-auto">
                        <table className="min-w-full bg-white">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Heart Rate</th>
                                    <th className="py-3 px-4 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200">
                                {fallData.length > 0 ? (
                                    fallData.map((event) => (
                                        <tr key={event.id} className={event.fallDetected ? "bg-red-50" : ""}>
                                            <td className="py-4 px-4 text-sm text-gray-700">{event.formattedTime}</td>
                                            <td className="py-4 px-4">
                                                <div className="flex items-center">
                                                    <Heart size={16} className="text-pink-500 mr-2" />
                                                    <span className="text-sm text-gray-700">{event.heartRate} BPM</span>
                                                </div>
                                            </td>
                                            <td className="py-4 px-4">
                                                {event.fallDetected ? (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                                                        <AlertTriangle size={12} className="mr-1" /> Fall Detected
                                                    </span>
                                                ) : (
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                        <UserCheck size={12} className="mr-1" /> Normal
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="3" className="py-8 text-center text-gray-500">
                                            No fall detection data available yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </main>
        </div>
    );
}

export default Dashboard;