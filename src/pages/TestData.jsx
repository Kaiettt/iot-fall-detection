import React from "react";
import { ref, set } from "firebase/database";
import { realtime_db } from "../config/firebase";

function TestData() {
    // Function to add fall data to the specific user
    function addFallData() {
        const userId = "user_1744991502564_eat0v1b";

        // Create new fall data entries
        const newFallData = {
            fallId1: {
                timestamp: 1627896521000,
                fallDetected: true,
                heartRate: 75
            },
            fallId2: {
                timestamp: 1627898521000,
                fallDetected: false,
                heartRate: 72
            },
            fallId3: {
                timestamp: Date.now() - 86400000, // Yesterday
                fallDetected: true,
                heartRate: 85
            },
            fallId4: {
                timestamp: Date.now(), // Current timestamp
                fallDetected: true,
                heartRate: 100
            }
        };

        // Set the fallData for the specific user
        const fallDataRef = ref(realtime_db, `users/${userId}/fallData`);
        set(fallDataRef, newFallData)
            .then(() => {
                alert("Fall data added successfully!");
            })
            .catch((error) => {
                console.error("Error adding fall data:", error);
                alert("Error adding fall data. Check console for details.");
            });
    }

    return (
        <div className="flex justify-center items-center h-screen bg-gray-100">
            <button
                onClick={addFallData}
                className="px-6 py-3 bg-blue-600 text-white rounded-2xl shadow-md hover:bg-blue-700 transition duration-300"
            >
                Add Fall Data to Specific User
            </button>
        </div>
    );
}

export default TestData;