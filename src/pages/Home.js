/* eslint-disable react-hooks/exhaustive-deps, jsx-a11y/anchor-is-valid */
import React, { useState, useEffect } from 'react';
import { v4 as uuidV4 } from 'uuid';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

const Logo = () => (
    <div className="logoWrapper">
        <svg className="synapseLogo" width="55" height="55" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
                <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8be9fd" />
                    <stop offset="50%" stopColor="#bd93f9" />
                    <stop offset="100%" stopColor="#ff79c6" />
                </linearGradient>
            </defs>
            <path d="M30,30 L15,50 L30,70" stroke="url(#logoGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M70,30 L85,50 L70,70" stroke="url(#logoGrad)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="42" y1="75" x2="58" y2="25" stroke="url(#logoGrad)" strokeWidth="8" strokeLinecap="round"/>
            <circle cx="50" cy="50" r="10" fill="#0f1015" stroke="url(#logoGrad)" strokeWidth="4" />
        </svg>
        <span className="logoText">DEVSYNC AI</span>
    </div>
);

const Typewriter = ({ words }) => {
    const [index, setIndex] = useState(0);
    const [subIndex, setSubIndex] = useState(0);
    const [reverse, setReverse] = useState(false);
    const [text, setText] = useState('');

    useEffect(() => {
        if (subIndex === words[index].length + 1 && !reverse) {
            const t = setTimeout(() => setReverse(true), 2500);
            return () => clearTimeout(t);
        }

        if (subIndex === 0 && reverse) {
            setReverse(false);
            setIndex((prev) => (prev + 1) % words.length);
            return;
        }

        const timeout = setTimeout(() => {
            setSubIndex((prev) => prev + (reverse ? -1 : 1));
        }, reverse ? 40 : 80);

        return () => clearTimeout(timeout);
    }, [subIndex, reverse, index, words]);

    useEffect(() => {
        setText(words[index].substring(0, subIndex));
    }, [subIndex, index, words]);

    return (
        <span className="typewriterText">
            {text}
            <span className="typewriterCursor">|</span>
        </span>
    );
};

const Home = () => {
    const typewriterWords = [
        'Real-time collaborative code sharing',
        'Intelligent assistance with AI Assistance',
        'Instantly compile & execute code',
        'Solve bugs and learn together'
    ];

    const navigate = useNavigate();

    const [roomId, setRoomId] = useState('');
    const [username, setUsername] = useState('');
    const createNewRoom = (e) => {
        e.preventDefault();
        const id = uuidV4();
        setRoomId(id);
        toast.success('Created a new room');
    };

    const joinRoom = () => {
        if (!roomId || !username) {
            toast.error('ROOM ID & username is required');
            return;
        }

        // Redirect
        navigate(`/editor/${roomId}`, {
            state: {
                username,
            },
        });
    };

    const handleInputEnter = (e) => {
        if (e.code === 'Enter') {
            joinRoom();
        }
    };
    return (
        <div className="homePageWrapper">
            {/* Animated Background Blobs */}
            <div className="bgBlob blob1"></div>
            <div className="bgBlob blob2"></div>

            <div className="heroSection">
                <div className="formWrapper">
                    <Logo />
                    <div className="typewriterContainer">
                        <Typewriter words={typewriterWords} />
                    </div>
                    <h4 className="mainLabel">Enter Workspace Room ID</h4>
                    <div className="inputGroup">
                        <input
                            type="text"
                            className="inputBox"
                            placeholder="ROOM ID"
                            onChange={(e) => setRoomId(e.target.value)}
                            value={roomId}
                            onKeyUp={handleInputEnter}
                        />
                        <input
                            type="text"
                            className="inputBox"
                            placeholder="USERNAME"
                            onChange={(e) => setUsername(e.target.value)}
                            value={username}
                            onKeyUp={handleInputEnter}
                        />
                        <button className="btn joinBtn" onClick={joinRoom}>
                            Join Workspace
                        </button>
                        <span className="createInfo">
                            Need a collaborative space? Create a &nbsp;
                            <a
                                onClick={createNewRoom}
                                href="#"
                                className="createNewBtn"
                            >
                                new room
                            </a>
                        </span>
                    </div>
                </div>
            </div>
            {/* 4-Step Architecture Section */}
            <div className="architectureSection">
                <h2 className="architectureTitle">ARCHITECTURE</h2>
                <div className="architectureGrid">
                    <div className="archCard">
                        <div className="archNumber">01</div>
                        <h3>ROOM CREATION</h3>
                        <p>Users create or join coding rooms instantly with a unique shareable session link.</p>
                    </div>
                    <div className="archCard">
                        <div className="archNumber">02</div>
                        <h3>REAL-TIME SYNC</h3>
                        <p>Code changes, cursor movements, and edits sync live across all connected users.</p>
                    </div>
                    <div className="archCard">
                        <div className="archNumber">03</div>
                        <h3>AI CODE ANALYSIS</h3>
                        <p>AI continuously analyzes code for bugs, optimization, and syntax issues in real time.</p>
                    </div>
                    <div className="archCard">
                        <div className="archNumber">04</div>
                        <h3>LIVE EXECUTION</h3>
                        <p>Run code directly inside the browser and get instant output, console logs, and error tracing.</p>
                    </div>
                </div>
            </div>
            <footer>
                <h4>
                    DevSync AI
                </h4>
            </footer>
        </div>
    );
};

export default Home;
