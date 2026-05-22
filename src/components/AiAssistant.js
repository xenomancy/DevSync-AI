import React, { useState, useRef, useEffect } from 'react';
import toast from 'react-hot-toast';

const AiAssistant = ({ code, getSelectedCode, language, onClose }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            text: 'Hi there! I am AI Assistance, your smart coding assistant. You can ask me coding questions, explain code, or help fix bugs. Highlight any code in the editor, and click one of the quick actions below to analyze it!',
        },
    ]);
    const [inputText, setInputText] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [copiedIndex, setCopiedIndex] = useState(null);

    const messagesEndRef = useRef(null);

    // Auto-scroll to the bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, isLoading]);

    const handleSendMessage = async (text, action = '') => {
        if (!text.trim() && !action) return;

        // Determine prompt text
        const queryText = text || (action === 'explain' ? 'Explain this code snippet' : action === 'fix' ? 'Find and fix bugs in this code' : 'Optimize this code');
        
        // Retrieve selected code or fall back to full editor code
        const selectedCode = getSelectedCode ? getSelectedCode() : '';
        const codeContext = selectedCode || code || '';

        // Add user message to chat UI
        const newUserMessage = {
            role: 'user',
            text: queryText + (selectedCode ? ' (analyzing selected code)' : ' (analyzing entire file)'),
        };

        setMessages((prev) => [...prev, newUserMessage]);
        setInputText('');
        setIsLoading(true);

        try {
            const response = await fetch('/ai', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    code: codeContext,
                    prompt: queryText,
                    action: action,
                    language: language,
                }),
            });

            const data = await response.json();

            if (response.ok && data.success) {
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', text: data.text },
                ]);
            } else {
                toast.error(data.error || 'Failed to fetch AI response.');
                setMessages((prev) => [
                    ...prev,
                    { role: 'assistant', text: `⚠️ **Error:** ${data.error || 'Something went wrong. Please check your Groq API key and try again.'}` },
                ]);
            }
        } catch (err) {
            console.error(err);
            toast.error('Network error. Unable to connect to backend.');
            setMessages((prev) => [
                ...prev,
                { role: 'assistant', text: '⚠️ **Network Error:** Could not connect to the server.' },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopy = async (text, index) => {
        try {
            await navigator.clipboard.writeText(text);
            setCopiedIndex(index);
            toast.success('Copied response to clipboard!');
            setTimeout(() => setCopiedIndex(null), 2000);
        } catch (err) {
            toast.error('Failed to copy text.');
        }
    };

    const handleQuickAction = (actionType) => {
        const selection = getSelectedCode ? getSelectedCode() : '';
        if (!selection && !code) {
            toast.error('No code available to analyze.');
            return;
        }
        handleSendMessage('', actionType);
    };

    const renderMessageContent = (text) => {
        // Splitting markdown-like code blocks (```lang code ```)
        const parts = text.split(/(```[\s\S]*?```)/g);
        return parts.map((part, index) => {
            if (part.startsWith('```')) {
                const match = part.match(/```(\w*)\n([\s\S]*?)```/);
                const lang = match ? match[1] : '';
                const codeBlock = match ? match[2] : part.slice(3, -3);
                return (
                    <div key={index} className="my-3 border border-[#2d2f3f] rounded-lg overflow-hidden shadow-inner">
                        <div className="bg-[#0f1015] text-[#6272a4] text-xs px-3 py-1 font-mono border-b border-[#2d2f3f] flex justify-between items-center select-none">
                            <span>{lang ? lang.toUpperCase() : 'CODE'}</span>
                            <button
                                onClick={() => handleCopy(codeBlock.trim(), `code-${index}`)}
                                className="hover:text-[#f8f8f2] transition-colors text-[10px] cursor-pointer bg-[#14151b] px-1.5 py-0.5 rounded border border-[#2d2f3f]"
                            >
                                Copy
                            </button>
                        </div>
                        <pre className="bg-[#14151b] text-[#f8f8f2] p-3 overflow-x-auto text-xs font-mono m-0 select-text leading-relaxed">
                            <code>{codeBlock.trim()}</code>
                        </pre>
                    </div>
                );
            } else {
                // Formatting inline code `code`
                const inlineParts = part.split(/(`[^`]+`)/g);
                return (
                    <span key={index} className="whitespace-pre-line leading-relaxed text-sm">
                        {inlineParts.map((subPart, subIndex) => {
                            if (subPart.startsWith('`') && subPart.endsWith('`')) {
                                return (
                                    <code key={subIndex} className="bg-[#0f1015] text-[#ff79c6] px-1.5 py-0.5 rounded font-mono text-xs border border-[#2d2f3f]">
                                        {subPart.slice(1, -1)}
                                    </code>
                                );
                            }
                            return subPart;
                        })}
                    </span>
                );
            }
        });
    };

    return (
        <div className="flex flex-col h-full max-h-full overflow-hidden bg-[#1c1e29] border-l border-[#2d2f3f] w-[400px] max-w-[400px] select-none text-white transition-all duration-300 ease-in-out">
            {/* Header */}
            <div className="h-[55px] bg-[#14151b] border-b border-[#2d2f3f] flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#bd93f9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    <span className="font-semibold text-sm tracking-wide uppercase text-slate-200">AI Assistance</span>
                </div>
                <button
                    onClick={onClose}
                    className="text-[#6272a4] hover:text-[#ff5555] transition-colors p-1 rounded hover:bg-[#1c1e29]"
                >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Message Area */}
            <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4 bg-[#1e1e24] select-text">
                {messages.map((msg, index) => (
                    <div
                        key={index}
                        className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                        <div
                            className={`relative group max-w-[85%] rounded-2xl p-3.5 shadow-md border ${
                                msg.role === 'user'
                                    ? 'bg-[#8b5cf6]/10 text-[#bd93f9] border-[#bd93f9]/20 rounded-br-none'
                                    : 'bg-[#14151b] text-slate-200 border-[#2d2f3f] rounded-bl-none'
                            }`}
                        >
                            {/* Content */}
                            <div className="text-sm select-text selection:bg-[#bd93f9]/30">
                                {renderMessageContent(msg.text)}
                            </div>

                            {/* Copy button overlay for AI response */}
                            {msg.role === 'assistant' && (
                                <button
                                    onClick={() => handleCopy(msg.text, index)}
                                    className="absolute right-2 bottom-2 opacity-0 group-hover:opacity-100 transition-opacity bg-[#1c1e29] border border-[#2d2f3f] hover:text-[#bd93f9] p-1 rounded-md text-xs text-[#6272a4]"
                                    title="Copy full response"
                                >
                                    {copiedIndex === index ? (
                                        <svg className="w-3.5 h-3.5 text-[#50fa7b]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                                        </svg>
                                    ) : (
                                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                                        </svg>
                                    )}
                                </button>
                            )}
                        </div>
                        <span className="text-[10px] text-[#6272a4] mt-1 px-1">
                            {msg.role === 'user' ? 'You' : 'AI Assistance'}
                        </span>
                    </div>
                ))}

                {/* Loading State */}
                {isLoading && (
                    <div className="flex flex-col items-start">
                        <div className="bg-[#14151b] border border-[#2d2f3f] rounded-2xl rounded-bl-none p-4 shadow-md max-w-[85%]">
                            <div className="flex space-x-2 justify-center items-center py-1.5 px-1">
                                <div className="h-2 w-2 bg-[#bd93f9] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                <div className="h-2 w-2 bg-[#bd93f9] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                <div className="h-2 w-2 bg-[#bd93f9] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                            </div>
                        </div>
                        <span className="text-[10px] text-[#6272a4] mt-1 px-1">AI Assistance is thinking...</span>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Quick Actions Panel */}
            <div className="px-4 py-2 bg-[#14151b] border-t border-[#2d2f3f] flex flex-wrap gap-2 justify-between">
                <button
                    onClick={() => handleQuickAction('explain')}
                    disabled={isLoading}
                    className="flex-1 bg-[#1c1e29] border border-[#2d2f3f] hover:border-[#bd93f9] text-[#8be9fd] text-xs font-semibold py-1.5 px-2 rounded-md hover:bg-[#282a36] transition-all disabled:opacity-50 disabled:pointer-events-none"
                    title="Explain highlighted editor code"
                >
                    Explain Code
                </button>
                <button
                    onClick={() => handleQuickAction('fix')}
                    disabled={isLoading}
                    className="flex-1 bg-[#1c1e29] border border-[#2d2f3f] hover:border-[#ff5555] text-[#ff5555] text-xs font-semibold py-1.5 px-2 rounded-md hover:bg-[#282a36] transition-all disabled:opacity-50 disabled:pointer-events-none"
                    title="Check highlighted editor code for bugs"
                >
                    Fix Bugs
                </button>
                <button
                    onClick={() => handleQuickAction('optimize')}
                    disabled={isLoading}
                    className="flex-1 bg-[#1c1e29] border border-[#2d2f3f] hover:border-[#50fa7b] text-[#50fa7b] text-xs font-semibold py-1.5 px-2 rounded-md hover:bg-[#282a36] transition-all disabled:opacity-50 disabled:pointer-events-none"
                    title="Optimize performance of highlighted code"
                >
                    Optimize Code
                </button>
            </div>

            {/* Input Bar */}
            <div className="p-3.5 bg-[#14151b] border-t border-[#2d2f3f]">
                <form
                    onSubmit={(e) => {
                        e.preventDefault();
                        handleSendMessage(inputText);
                    }}
                    className="flex items-center gap-2"
                >
                    <input
                        type="text"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        disabled={isLoading}
                        placeholder={
                            getSelectedCode && getSelectedCode()
                                ? "Ask about selection..."
                                : "Ask a question..."
                        }
                        className="flex-1 bg-[#1e1e24] text-white placeholder-[#6272a4] border border-[#2d2f3f] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#bd93f9] disabled:opacity-50 select-text"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !inputText.trim()}
                        className="bg-[#bd93f9] text-[#10121a] hover:bg-[#a370f7] transition-all p-2 rounded-lg disabled:bg-[#44475a] disabled:text-[#6272a4] flex items-center justify-center cursor-pointer"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                    </button>
                </form>
                {getSelectedCode && getSelectedCode() && (
                    <div className="text-[10px] text-[#bd93f9] mt-1.5 text-center truncate italic">
                        ⚡ Active Selection detected in editor
                    </div>
                )}
            </div>
        </div>
    );
};

export default AiAssistant;
