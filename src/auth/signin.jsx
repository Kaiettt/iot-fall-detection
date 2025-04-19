import React, { useState } from "react";
import { ref, set, get, getDatabase } from "firebase/database";
import { LogIn, User, Lock } from "lucide-react";
import { useNavigate } from 'react-router-dom';
import { realtime_db } from "../config/firebase";

function SignIn() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [isSignUp, setIsSignUp] = useState(false);
    const navigate = useNavigate();

    const handleSignIn = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setLoading(true);

            // Check if username exists
            const userRef = ref(realtime_db, `emails/${username}`);
            const snapshot = await get(userRef);

            if (!snapshot.exists()) {
                setError('Username not found. Please check your username or sign up.');
                setLoading(false);
                return;
            }

            const userId = snapshot.val();

            // Get user data including password
            const userDataRef = ref(realtime_db, `users/${userId}`);
            const userSnapshot = await get(userDataRef);

            if (!userSnapshot.exists()) {
                setError('User data not found.');
                setLoading(false);
                return;
            }

            const userData = userSnapshot.val();

            // Check password (in a real app, this should be securely hashed)
            if (userData.password !== password) {
                setError('Invalid password. Please try again.');
                setLoading(false);
                return;
            }

            // Save user data in localStorage
            localStorage.setItem("email", username);
            localStorage.setItem("userId", userId);

            navigate('/voice');
        } catch (error) {
            console.error("Error signing in:", error);
            setError('An error occurred during sign in. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleSignUp = async (e) => {
        e.preventDefault();
        setError('');

        if (!username || !password) {
            setError('Please fill in all fields');
            return;
        }

        try {
            setLoading(true);

            // Check if username already exists
            const usernameRef = ref(realtime_db, `emails/${username}`);
            const usernameSnapshot = await get(usernameRef);

            if (usernameSnapshot.exists()) {
                setError('Username already exists. Please choose another one.');
                setLoading(false);
                return;
            }

            // Generate a unique userId
            const userId = `user_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

            // Store username to userId mapping
            await set(ref(realtime_db, `emails/${username}`), userId);

            // Create user entry in realtime_db
            await set(ref(realtime_db, `users/${userId}`), {
                email: username,
                password: password, // In a real app, this should be securely hashed
                fallData: {}
            });

            // Save user data in localStorage
            localStorage.setItem("email", username);
            localStorage.setItem("userId", userId);

            navigate('/');
        } catch (error) {
            console.error("Error signing up:", error);
            setError('Failed to create account. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const toggleMode = () => {
        setIsSignUp(!isSignUp);
        setError('');
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
            <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-xl">
                <div className="p-8">
                    <div className="text-center">
                        <h2 className="text-2xl font-bold text-gray-900">
                            {isSignUp ? "Create Account" : "Welcome Back"}
                        </h2>
                        <p className="mt-2 text-sm text-gray-600">
                            {isSignUp ? "Sign up to get started" : "Sign in to continue to the application"}
                        </p>
                    </div>

                    <form className="mt-8 space-y-4" onSubmit={isSignUp ? handleSignUp : handleSignIn}>
                        <div>
                            <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                                Username
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <User className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="username"
                                    name="username"
                                    type="text"
                                    value={username}
                                    onChange={(e) => setUsername(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Enter username"
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                                Password
                            </label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="password"
                                    name="password"
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                                    placeholder="Enter password"
                                />
                            </div>
                        </div>

                        {!isSignUp && (
                            <div className="flex items-center justify-end">
                                <div className="text-sm">
                                    <a href="#" className="font-medium text-indigo-600 hover:text-indigo-500">
                                        Forgot your password?
                                    </a>
                                </div>
                            </div>
                        )}

                        {error && (
                            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
                                {error}
                            </div>
                        )}

                        <div>
                            <button
                                type="submit"
                                disabled={loading}
                                className="flex w-full items-center justify-center rounded-lg bg-indigo-600 px-4 py-3 font-medium text-white shadow-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-70"
                            >
                                {loading ? (
                                    <svg className="h-5 w-5 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                ) : (
                                    <>
                                        <LogIn className="mr-2 h-5 w-5" />
                                        {isSignUp ? "Sign Up" : "Sign In"}
                                    </>
                                )}
                            </button>
                        </div>
                    </form>

                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="bg-white px-2 text-gray-500">or</span>
                            </div>
                        </div>

                        <div className="mt-6 text-center">
                            <button
                                type="button"
                                onClick={toggleMode}
                                className="font-medium text-indigo-600 hover:text-indigo-500"
                            >
                                {isSignUp ? "Already have an account? Sign In" : "Don't have an account? Sign Up"}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="border-t border-gray-200 bg-gray-50 p-4 text-center text-xs text-gray-600">
                    By continuing, you agree to our Terms of Service and Privacy Policy
                </div>
            </div>
        </div>
    );
}

export default SignIn;