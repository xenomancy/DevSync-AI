import { io } from 'socket.io-client';

export const initSocket = async () => {
    const options = {
        'force new connection': true,
        reconnectionAttempts: 'Infinity',
        timeout: 10000,
        transports: ['websocket', 'polling'],
    };
    const backendUrl = process.env.REACT_APP_BACKEND_URL || 
        (window.location.hostname === 'localhost' ? 'http://localhost:5000' : window.location.origin);
    return io(backendUrl, options);
};
