import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';
import ACTIONS from '../Actions';
import Client from '../components/Client';
import Editor from '../components/Editor';
import AiAssistant from '../components/AiAssistant';
import { initSocket } from '../socket';
import {
    useLocation,
    useNavigate,
    Navigate,
    useParams,
} from 'react-router-dom';

const EditorPage = () => {
    const socketRef = useRef(null);
    const codeRef = useRef(null);
    const location = useLocation();
    const { roomId } = useParams();
    const reactNavigator = useNavigate();
    
    const [clients, setClients] = useState([]);
    const [language, setLanguage] = useState('javascript');
    const [stdin, setStdin] = useState('');
    const [output, setOutput] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [stats, setStats] = useState(null);
    const [isAiOpen, setIsAiOpen] = useState(false);
    
    const languageRef = useRef('javascript');
    const inputRef = useRef('');
    const outputRef = useRef('');
    const editorInstanceRef = useRef(null);

    useEffect(() => {
        languageRef.current = language;
    }, [language]);

    useEffect(() => {
        inputRef.current = stdin;
    }, [stdin]);

    useEffect(() => {
        outputRef.current = output;
    }, [output]);

    const getSelectedCode = () => {
        if (editorInstanceRef.current) {
            return editorInstanceRef.current.getSelection();
        }
        return '';
    };

    useEffect(() => {
        const init = async () => {
            socketRef.current = await initSocket();
            socketRef.current.on('connect_error', (err) => handleErrors(err));
            socketRef.current.on('connect_failed', (err) => handleErrors(err));

            function handleErrors(e) {
                console.log('socket error', e);
                toast.error('Socket connection failed, try again later.');
                reactNavigator('/');
            }

            socketRef.current.emit(ACTIONS.JOIN, {
                roomId,
                username: location.state?.username,
            });

            // Listening for joined event
            socketRef.current.on(
                ACTIONS.JOINED,
                ({ clients, username, socketId }) => {
                    if (username !== location.state?.username) {
                        toast.success(`${username} joined the room.`);
                        socketRef.current.emit(ACTIONS.SYNC_CODE, {
                            code: codeRef.current,
                            language: languageRef.current,
                            input: inputRef.current,
                            socketId,
                        });
                    }
                    setClients(clients);
                }
            );

            // Listening for disconnected
            socketRef.current.on(
                ACTIONS.DISCONNECTED,
                ({ socketId, username }) => {
                    toast.success(`${username} left the room.`);
                    setClients((prev) => {
                        return prev.filter(
                            (client) => client.socketId !== socketId
                        );
                    });
                }
            );

            // Listeners for code editor and state syncs
            socketRef.current.on(
                ACTIONS.CODE_CHANGE,
                ({ language: syncLang, input: syncInput }) => {
                    if (syncLang) {
                        setLanguage(syncLang);
                    }
                    if (syncInput !== undefined) {
                        setStdin(syncInput);
                    }
                }
            );

            socketRef.current.on(ACTIONS.LANGUAGE_CHANGE, ({ language: syncLang }) => {
                setLanguage(syncLang);
            });

            socketRef.current.on(ACTIONS.INPUT_CHANGE, ({ input: syncInput }) => {
                setStdin(syncInput);
            });

            socketRef.current.on(ACTIONS.RUN_STATUS, ({ isRunning: syncIsRunning, result }) => {
                setIsRunning(syncIsRunning);
                if (result) {
                    setOutput(result.output);
                    outputRef.current = result.output;
                    setStats({
                        executionTime: result.executionTime,
                        exitCode: result.exitCode,
                        success: result.success,
                    });
                }
            });
        };
        init();
        return () => {
            if (socketRef.current) {
                socketRef.current.disconnect();
                socketRef.current.off(ACTIONS.JOINED);
                socketRef.current.off(ACTIONS.DISCONNECTED);
                socketRef.current.off(ACTIONS.CODE_CHANGE);
                socketRef.current.off(ACTIONS.LANGUAGE_CHANGE);
                socketRef.current.off(ACTIONS.INPUT_CHANGE);
                socketRef.current.off(ACTIONS.RUN_STATUS);
            }
        };
    }, []);

    const handleLanguageChange = (e) => {
        const newLang = e.target.value;
        setLanguage(newLang);
        socketRef.current.emit(ACTIONS.LANGUAGE_CHANGE, {
            roomId,
            language: newLang,
        });
    };

    const handleInputChange = (e) => {
        const newInput = e.target.value;
        setStdin(newInput);
        socketRef.current.emit(ACTIONS.INPUT_CHANGE, {
            roomId,
            input: newInput,
        });
    };

    const handleRunCode = () => {
        if (isRunning) return;

        setOutput('');
        setStats(null);
        outputRef.current = '';

        socketRef.current.emit(ACTIONS.RUN_CODE, {
            roomId,
            code: codeRef.current,
            language: languageRef.current,
            input: inputRef.current,
        });
    };

    async function copyRoomId() {
        try {
            await navigator.clipboard.writeText(roomId);
            toast.success('Room ID has been copied to your clipboard');
        } catch (err) {
            toast.error('Could not copy the Room ID');
            console.error(err);
        }
    }

    function leaveRoom() {
        reactNavigator('/');
    }

    if (!location.state) {
        return <Navigate to="/" />;
    }

    return (
        <div
            className="mainWrap"
            style={{
                gridTemplateColumns: isAiOpen
                    ? '230px 1fr 400px'
                    : '230px 1fr',
            }}
        >
            <div className="aside">
                <div className="asideInner">
                    <div className="logo">
                        <svg className="synapseLogo" width="36" height="36" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <defs>
                                <linearGradient id="logoGradSide" x1="0%" y1="0%" x2="100%" y2="100%">
                                    <stop offset="0%" stopColor="#8be9fd" />
                                    <stop offset="50%" stopColor="#bd93f9" />
                                    <stop offset="100%" stopColor="#ff79c6" />
                                </linearGradient>
                            </defs>
                            <path d="M30,30 L15,50 L30,70" stroke="url(#logoGradSide)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                            <path d="M70,30 L85,50 L70,70" stroke="url(#logoGradSide)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
                            <line x1="42" y1="75" x2="58" y2="25" stroke="url(#logoGradSide)" strokeWidth="8" strokeLinecap="round"/>
                            <circle cx="50" cy="50" r="10" fill="#0f1015" stroke="url(#logoGradSide)" strokeWidth="4" />
                        </svg>
                        <span className="logoText sidebarLogoText">DEVSYNC AI</span>
                    </div>
                    <h3>Connected</h3>
                    <div className="clientsList">
                        {clients.map((client) => (
                            <Client
                                key={client.socketId}
                                username={client.username}
                            />
                        ))}
                    </div>
                </div>
                <button className="btn copyBtn" onClick={copyRoomId}>
                    Copy ROOM ID
                </button>
                <button className="btn leaveBtn" onClick={leaveRoom}>
                    Leave
                </button>
            </div>
            <div className="editorWrap">
                <div className="toolbar">
                    <div className="toolbarLeft">
                        <label className="selectLabel">Language:</label>
                        <select
                            className="languageSelect"
                            value={language}
                            onChange={handleLanguageChange}
                        >
                            <option value="javascript">JavaScript (Node)</option>
                            <option value="python">Python 3</option>
                            <option value="cpp">C++ (GCC)</option>
                            <option value="java">Java (JDK 21)</option>
                        </select>
                    </div>
                    <div className="toolbarRight">
                        {stats && (
                            <div className="statsWrap">
                                <span className={`statusBadge ${stats.success ? 'badgeSuccess' : 'badgeError'}`}>
                                    {stats.success ? 'Success' : `Error (Exit ${stats.exitCode})`}
                                </span>
                                <span className="timeStat">{stats.executionTime}ms</span>
                            </div>
                        )}
                        <button
                            className={`runBtn ${isRunning ? 'running' : ''}`}
                            onClick={handleRunCode}
                            disabled={isRunning}
                        >
                            {isRunning ? (
                                <>
                                    <div className="spinner"></div>
                                    Running...
                                </>
                            ) : (
                                'Run Code'
                            )}
                        </button>
                        <button
                            className={`runBtn bg-[#bd93f9] text-[#1c1e29] hover:bg-[#a370f7] transition-all flex items-center gap-2 ${
                                isAiOpen ? 'ring-2 ring-purple-400' : ''
                            }`}
                            onClick={() => {
                                setIsAiOpen((prev) => !prev);
                            }}
                        >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                            {isAiOpen ? 'Close AI Assistance' : 'AI Assistance'}
                        </button>
                    </div>
                </div>
                <div className="editorContainer">
                    <Editor
                        socketRef={socketRef}
                        roomId={roomId}
                        language={language}
                        onCodeChange={(code) => {
                            codeRef.current = code;
                        }}
                        editorInstanceRef={editorInstanceRef}
                    />
                </div>
                <div className="consoleContainer">
                    <div className="consoleHeader">
                        <span>Console Terminal</span>
                        <div className="consoleHeaderActions">
                            <button className="clearBtn" onClick={() => { setOutput(''); setStats(null); }}>
                                Clear Console
                            </button>
                        </div>
                    </div>
                    <div className="consoleContent">
                        <div className="consolePanel">
                            <div className="panelHeader">Input (Stdin)</div>
                            <textarea
                                className="stdinArea"
                                placeholder="Provide standard input here..."
                                value={stdin}
                                onChange={handleInputChange}
                            ></textarea>
                        </div>
                        <div className="consolePanel">
                            <div className="panelHeader">Output (Stdout / Stderr)</div>
                            <pre className="stdoutArea">
                                {output || 'Run your code to see the output here...'}
                            </pre>
                        </div>
                    </div>
                </div>
            </div>
            {/* Right Panel: AI Assistance */}
            {isAiOpen && (
                <AiAssistant
                    code={codeRef.current}
                    getSelectedCode={getSelectedCode}
                    language={language}
                    onClose={() => {
                        setIsAiOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default EditorPage;
