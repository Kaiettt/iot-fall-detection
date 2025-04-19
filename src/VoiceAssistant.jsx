import { useState, useEffect, useRef } from 'react';
import { ref, query, orderByChild, limitToLast, get } from 'firebase/database';
import { getAuth } from 'firebase/auth';
import { realtime_db } from './config/firebase';
import { Mic, MicOff, User, VolumeX, Volume2 } from 'lucide-react';

import { useNavigate } from "react-router-dom";
export default function VoiceAssistant() {
    const [isListening, setIsListening] = useState(false);
    const [transcript, setTranscript] = useState('');
    const [response, setResponse] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [fallData, setFallData] = useState(null);
    const [isSpeaking, setIsSpeaking] = useState(false);
    const [manualInput, setManualInput] = useState('');
    const [isMobile, setIsMobile] = useState(false);
    const navigate = useNavigate();
    const recognitionRef = useRef(null);
    const synthRef = useRef(typeof window !== 'undefined' ? window.speechSynthesis : null);

    // Check if mobile device
    useEffect(() => {
        const checkIfMobile = () => {
            const userAgent = navigator.userAgent;
            const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
            setIsMobile(isMobile);
        };
        checkIfMobile();
    }, []);

    // Initialize speech recognition
    useEffect(() => {
        if (typeof window !== 'undefined' && ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            recognitionRef.current = new SpeechRecognition();
            recognitionRef.current.continuous = false;
            recognitionRef.current.interimResults = false;
            recognitionRef.current.lang = 'en-US';

            recognitionRef.current.onresult = (event) => {
                const transcriptText = event.results[0][0].transcript.toLowerCase();
                setTranscript(transcriptText);

                // Handle greetings
                if (transcriptText.includes('hello') ||
                    transcriptText.includes('hi') ||
                    transcriptText.includes('hey')) {
                    const greetingResponse = "How can I help you?";
                    setResponse(greetingResponse);
                    speakResponse(greetingResponse);
                    return;
                }

                // Handle grandparent status query
                if (transcriptText.includes('grandpa') ||
                    transcriptText.includes('grandma') ||
                    transcriptText.includes('grandmother') ||
                    transcriptText.includes('grandfather') ||
                    transcriptText.includes('oke')) {
                    fetchFallData();
                }
            };

            recognitionRef.current.onerror = (event) => {
                console.error('Speech recognition error', event.error);
                if (event.error === 'not-allowed') {
                    setError("Microphone access was denied. Please enable microphone permissions in your browser settings.");
                } else if (event.error === 'aborted') {
                    setError("Speech recognition was aborted. Please try again or use text input.");
                } else {
                    setError("Couldn't understand. Please try again or use text input.");
                }
                setIsListening(false);
            };

            recognitionRef.current.onend = () => {
                setIsListening(false);
            };
        } else {
            setError("Your browser doesn't support speech recognition. Please use text input.");
        }

        return () => {
            if (recognitionRef.current) {
                try {
                    recognitionRef.current.abort();
                } catch (err) {
                    console.error("Error while cleaning up speech recognition:", err);
                }
            }
            if (synthRef.current) {
                synthRef.current.cancel();
            }
        };
    }, []);

    const toggleListening = () => {
        if (isListening) {
            recognitionRef.current.abort();
            setIsListening(false);
        } else {
            setTranscript('');
            setResponse('');
            setError(null);
            try {
                recognitionRef.current.start();
                setIsListening(true);
            } catch (err) {
                console.error("Error starting speech recognition:", err);
                setError("Couldn't start microphone. Please check permissions and try again.");
            }
        }
    };

    const speakResponse = (text) => {
        if (synthRef.current) {
            synthRef.current.cancel();
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.rate = 0.9; // Slightly slower for mobile
            utterance.onstart = () => setIsSpeaking(true);
            utterance.onend = () => setIsSpeaking(false);
            synthRef.current.speak(utterance);
        }
    };

    const stopSpeaking = () => {
        if (synthRef.current) {
            synthRef.current.cancel();
            setIsSpeaking(false);
        }
    };

    const handleManualSubmit = () => {
        if (!manualInput.trim()) return;

        const input = manualInput.toLowerCase();
        setTranscript(manualInput);

        // Handle greetings in manual input
        if (input.includes('hello') ||
            input.includes('hi') ||
            input.includes('hey')) {
            const greetingResponse = "How can I help you?";
            setResponse(greetingResponse);
            speakResponse(greetingResponse);
        } else if (input.includes('grandpa') ||
            input.includes('grandma') ||
            input.includes('grandmother') ||
            input.includes('grandfather') ||
            input.includes('oke')) {
            fetchFallData();
        }

        setManualInput('');
    };

    const fetchFallData = async () => {
        try {
            setLoading(true);
            setError(null);

            const email = localStorage.getItem("email");
            if (!email) {
                throw new Error("No authenticated user found");
            }

            const emailRef = ref(realtime_db, `emails/${email}`);
            const snapshot = await get(emailRef);

            if (!snapshot.exists()) {
                const noUserResponse = "I couldn't find your account information. Please make sure you're logged in.";
                setResponse(noUserResponse);
                speakResponse(noUserResponse);
                setLoading(false);
                return;
            }

            const userId = snapshot.val();
            const fallDataRef = query(
                ref(realtime_db, `users/${userId}/fallData`),
                orderByChild("timestamp"),
                limitToLast(1) // Only fetch the latest event
            );
            const fallSnapshot = await get(fallDataRef);

            if (!fallSnapshot.exists()) {
                const noDataResponse = "I don't have any fall data for your family member at the moment.";
                setResponse(noDataResponse);
                speakResponse(noDataResponse);
                setLoading(false);
                return;
            }

            let latestFall = null;
            fallSnapshot.forEach((childSnapshot) => {
                latestFall = {
                    id: childSnapshot.key,
                    ...childSnapshot.val()
                };
            });

            // Store only the latest event in fallData for display
            setFallData([latestFall]);

            const fallTime = new Date(latestFall.timestamp).toLocaleString();

            let responseText = "";
            if (latestFall.fallDetected === true) {
                responseText = `I'm concerned. There was a fall detected at ${fallTime}. Heart rate was ${latestFall.heartRate} BPM. You might want to check on them.`;
            } else {
                responseText = `Based on the latest data from ${fallTime}, everything seems okay. No falls were detected and heart rate was ${latestFall.heartRate} BPM.`;
            }

            setResponse(responseText);
            speakResponse(responseText);

        } catch (error) {
            console.error("Error fetching fall data:", error);
            const errorResponse = "Sorry, I couldn't access the fall detection data. Please try again later.";
            setResponse(errorResponse);
            speakResponse(errorResponse);
            setError(error.message);
        } finally {
            setLoading(false);
        }
    };

    const formatTimestamp = (timestamp) => {
        return new Date(timestamp).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const handleOpenDashBoard = () => {
        navigate("/");
    };

    return (
        <div className="max-w-md mx-auto bg-white rounded-xl shadow-md overflow-hidden md:max-w-2xl m-2">
            <div className="p-4 sm:p-6">
                <div className="flex justify-between items-center mb-4">
                    <button
                        className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r-lg text-sm sm:text-base"
                        onClick={handleOpenDashBoard}
                    >
                        Dashboard
                    </button>
                    <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Voice Assistant</h2>
                    <div className="flex space-x-1 sm:space-x-2">
                        {isSpeaking ? (
                            <button
                                onClick={stopSpeaking}
                                className="bg-red-500 text-white p-1 sm:p-2 rounded-full hover:bg-red-600"
                                aria-label="Stop speaking"
                            >
                                <VolumeX size={isMobile ? 16 : 20} />
                            </button>
                        ) : (
                            <button
                                onClick={() => response && speakResponse(response)}
                                className="bg-green-500 text-white p-1 sm:p-2 rounded-full hover:bg-green-600 disabled:bg-gray-300"
                                disabled={!response}
                                aria-label="Speak response"
                            >
                                <Volume2 size={isMobile ? 16 : 20} />
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col items-center mb-4">
                    <button
                        onClick={toggleListening}
                        className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full flex items-center justify-center shadow-lg mb-2 transition-all ${isListening
                            ? 'bg-red-500 hover:bg-red-600 animate-pulse'
                            : 'bg-blue-500 hover:bg-blue-600'
                            }`}
                        disabled={loading}
                        aria-label={isListening ? 'Stop listening' : 'Start listening'}
                    >
                        {isListening ?
                            <MicOff size={isMobile ? 24 : 32} className="text-white" /> :
                            <Mic size={isMobile ? 24 : 32} className="text-white" />
                        }
                    </button>
                    <p className="text-gray-500 text-xs sm:text-sm">
                        {isListening ? 'Listening...' : 'Tap to speak'}
                    </p>
                </div>

                {/* Manual text input */}
                <div className="mb-3">
                    <div className="flex">
                        <input
                            type="text"
                            className="flex-1 p-2 border rounded-l-lg text-sm sm:text-base"
                            placeholder="Type 'Is my grandpa okay?' or 'Hello'"
                            value={manualInput}
                            onChange={(e) => setManualInput(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                    handleManualSubmit();
                                }
                            }}
                        />
                        <button
                            className="bg-blue-500 hover:bg-blue-600 text-white p-2 rounded-r-lg text-sm sm:text-base"
                            onClick={handleManualSubmit}
                        >
                            Send
                        </button>
                    </div>
                </div>

                {transcript && (
                    <div className="mb-3 p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <p className="font-medium text-gray-700 text-sm sm:text-base">You said:</p>
                        <p className="text-gray-600 text-sm sm:text-base">{transcript}</p>
                    </div>
                )}

                {loading && (
                    <div className="flex justify-center mb-3">
                        <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-blue-500"></div>
                    </div>
                )}

                {response && (
                    <div className="p-2 sm:p-3 bg-blue-50 rounded-lg mb-4">
                        <p className="font-medium text-blue-700 text-sm sm:text-base">Assistant:</p>
                        <p className="text-gray-800 text-sm sm:text-base">{response}</p>
                    </div>
                )}

                {error && (
                    <div className="p-2 sm:p-3 bg-red-50 rounded-lg mb-4">
                        <p className="text-red-700 text-sm sm:text-base">{error}</p>
                    </div>
                )}

                {fallData && fallData.length > 0 && (
                    <div className="mt-4">
                        <h3 className="text-md sm:text-lg font-semibold text-gray-700 mb-2">Latest Event</h3>
                        <div className="max-h-48 sm:max-h-64 overflow-y-auto text-xs sm:text-sm">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Time</th>
                                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                        <th className="px-2 py-1 sm:px-4 sm:py-2 text-left font-medium text-gray-500 uppercase tracking-wider">Heart Rate</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {fallData.map((event) => (
                                        <tr key={event.id}>
                                            <td className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap text-gray-600">
                                                {formatTimestamp(event.timestamp)}
                                            </td>
                                            <td className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap">
                                                <span className={`px-1 py-0.5 sm:px-2 sm:py-1 text-xs rounded-full ${event.fallDetected ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'
                                                    }`}>
                                                    {event.fallDetected ? 'Fall' : 'Normal'}
                                                </span>
                                            </td>
                                            <td className="px-2 py-1 sm:px-4 sm:py-2 whitespace-nowrap text-gray-600">
                                                {event.heartRate} BPM
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                <div className="mt-4 flex items-center text-gray-500 text-xs sm:text-sm">
                    <User size={isMobile ? 12 : 16} className="mr-1" />
                    <span>Try: "Is my grandpa okay?" or "Hello"</span>
                </div>
            </div>
        </div>
    );
}