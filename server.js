require('dotenv').config();
const express = require('express');
const app = express();
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const ACTIONS = require('./src/Actions');
const { runCode } = require('./runner');

const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST'],
    },
});

app.use(express.json());

// Groq API Integration (via OpenAI SDK compatibility layer)
const { OpenAI } = require('openai');
let openai;
const apiKey = process.env.GROQ_API_KEY;
if (apiKey && !apiKey.startsWith('YOUR_')) {
    try {
        openai = new OpenAI({
            apiKey: apiKey,
            baseURL: 'https://api.groq.com/openai/v1',
        });
    } catch (err) {
        console.error('Failed to initialize OpenAI client:', err.message);
    }
}

// Helper to generate simulated responses when API key is missing or offline
function generateMockResponse(action, prompt) {
    if (action === 'explain') {
        return `### Code Explanation (Simulated Mode)

Here is a breakdown of the code you provided:

1. **Purpose**: The code represents the current workspace code structure.
2. **Key Elements**:
   - Uses modern syntax and logic.
   - Integrates with the application state.
3. **Complexity**:
   - **Time Complexity**: $O(N)$ where $N$ is the size of the inputs.
   - **Space Complexity**: $O(1)$ auxiliary space.

*Note: Please configure a valid \`GROQ_API_KEY\` in your \`.env\` file to receive real AI completions.*`;
    } else if (action === 'fix') {
        return `### Bug Analysis (Simulated Mode)

Scanning the code...
- **Issue Found**: No critical syntactical errors found in this snippet.
- **Optimization Tip**: Ensure all asynchronous calls are properly wrapped in try-catch blocks.

Here is a corrected/suggested layout:
\`\`\`javascript
// Suggested pattern:
try {
    const result = await performAction();
    console.log("Success:", result);
} catch (error) {
    console.error("Action failed:", error);
}
\`\`\`

*Note: Please configure a valid \`GROQ_API_KEY\` in your \`.env\` file to receive real AI completions.*`;
    } else if (action === 'optimize') {
        return `### Performance Optimization (Simulated Mode)

Analyzing code performance...
- **Tip 1**: Cache repetitive computations where applicable.
- **Tip 2**: Minimize DOM or state re-renders.

\`\`\`javascript
// Example of caching/memoization:
const memoizedValue = useMemo(() => computeExpensiveValue(a, b), [a, b]);
\`\`\`

*Note: Please configure a valid \`GROQ_API_KEY\` in your \`.env\` file to receive real AI completions.*`;
    } else {
        return `### AI Assistant Response (Simulated Mode)

You asked: "${prompt}"

This is a simulated response in **Simulated Mode**. The AI Assistant side panel is fully integrated with:
- Code selection capture.
- Auto-scroll and copy capabilities.
- Dracula themes.

To receive live responses from Groq, please update the \`GROQ_API_KEY\` in your \`.env\` file with a valid Groq secret key.`;
    }
}

// AI Assistant POST endpoint
app.post('/ai', async (req, res) => {
    const { code, prompt, action, language } = req.body;

    const isPlaceholderKey = !process.env.GROQ_API_KEY || process.env.GROQ_API_KEY.startsWith('YOUR_');

    if (isPlaceholderKey) {
        const mockResponse = generateMockResponse(action, prompt);
        // Add a short delay to simulate network latency and show the loading animation
        await new Promise(resolve => setTimeout(resolve, 1500));
        return res.json({ success: true, text: mockResponse });
    }

    try {
        let systemPrompt = 'You are a helpful coding assistant. Provide concise, accurate coding help and explanations using Markdown. Keep answers clear and to the point. CRITICAL: You must ONLY answer questions related to coding, computer programming, debugging, algorithms, and software development. If the user\'s query is NOT about programming, computer science, or technology (for example, queries about celebrities, biographies, movies, sports, history, general knowledge, etc., such as "who is srk" or "who is kk"), you must strictly refuse to answer and say: "I am sorry, but I can only answer coding and programming related questions."';
        
        if (action === 'explain') {
            systemPrompt = 'You are a helpful coding assistant. Explain the following code snippet clearly, describing what it does, its complexity, and how it fits into a program. Use Markdown. If the code context is not programming related, refuse to explain and say you only answer programming queries.';
        } else if (action === 'fix') {
            systemPrompt = 'You are a helpful coding assistant. Find bugs, errors, or issues in the following code. Explain the issue and provide a corrected, optimized version of the code. Use Markdown. If the code context is not programming related, refuse to analyze.';
        } else if (action === 'optimize') {
            systemPrompt = 'You are a helpful coding assistant. Analyze the following code for performance bottlenecks, redundant operations, or design issues, and provide an optimized version. Explain the optimization decisions clearly. Use Markdown. If the code context is not programming related, refuse to analyze.';
        }

        let userContent = '';
        if (code) {
            userContent += `Context Code (${language || 'unknown'}):\n\`\`\`${language || ''}\n${code}\n\`\`\`\n\n`;
        }
        userContent += `User Query: ${prompt}`;

        const modelRequested = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';
        
        async function getCompletion(modelName) {
            return await openai.chat.completions.create({
                model: modelName,
                messages: [
                    { role: 'system', content: systemPrompt },
                    { role: 'user', content: userContent }
                ],
                temperature: 0.7,
            });
        }

        let completion;
        try {
            completion = await getCompletion(modelRequested);
        } catch (err) {
            // Check if it's a model not found error (status 404/400)
            if (err.status === 404 || err.status === 400 || (err.message && err.message.toLowerCase().includes('model'))) {
                console.warn(`Model ${modelRequested} not found, falling back to llama3-8b-8192`);
                completion = await getCompletion('llama3-8b-8192');
            } else {
                throw err;
            }
        }

        const aiResponse = completion.choices[0].message.content;
        res.json({ success: true, text: aiResponse });

    } catch (error) {
        console.error('AI assistant endpoint error:', error);
        
        // Fallback to simulated response on network/API configuration errors
        const mockResponse = generateMockResponse(action, prompt);
        const errMsg = error.message || 'connection failed';
        const fallbackText = `⚠️ **Network Fallback Mode:** Unable to connect to Groq API (${errMsg}). Showing simulated response:\n\n---\n\n${mockResponse}`;
        
        // Simulate a slight delay so it feels natural
        await new Promise(resolve => setTimeout(resolve, 800));
        res.json({ success: true, text: fallbackText });
    }
});

app.use(express.static('build'));
app.use((req, res, next) => {
    res.sendFile(path.join(__dirname, 'build', 'index.html'));
});

const userSocketMap = {};
function getAllConnectedClients(roomId) {
    // Map
    return Array.from(io.sockets.adapter.rooms.get(roomId) || []).map(
        (socketId) => {
            return {
                socketId,
                username: userSocketMap[socketId],
            };
        }
    );
}

io.on('connection', (socket) => {
    console.log('socket connected', socket.id);

    socket.on(ACTIONS.JOIN, ({ roomId, username }) => {
        userSocketMap[socket.id] = username;
        socket.join(roomId);
        const clients = getAllConnectedClients(roomId);
        clients.forEach(({ socketId }) => {
            io.to(socketId).emit(ACTIONS.JOINED, {
                clients,
                username,
                socketId: socket.id,
            });
        });
    });

    socket.on(ACTIONS.CODE_CHANGE, ({ roomId, code }) => {
        socket.in(roomId).emit(ACTIONS.CODE_CHANGE, { code });
    });

    socket.on(ACTIONS.SYNC_CODE, ({ socketId, code, language, input }) => {
        io.to(socketId).emit(ACTIONS.CODE_CHANGE, { code, language, input });
    });

    socket.on(ACTIONS.LANGUAGE_CHANGE, ({ roomId, language }) => {
        socket.in(roomId).emit(ACTIONS.LANGUAGE_CHANGE, { language });
    });

    socket.on(ACTIONS.INPUT_CHANGE, ({ roomId, input }) => {
        socket.in(roomId).emit(ACTIONS.INPUT_CHANGE, { input });
    });

    socket.on(ACTIONS.RUN_CODE, ({ roomId, code, language, input }) => {
        io.to(roomId).emit(ACTIONS.RUN_STATUS, { isRunning: true });
        runCode(language, code, input).then((result) => {
            io.to(roomId).emit(ACTIONS.RUN_STATUS, {
                isRunning: false,
                result,
            });
        });
    });

    socket.on('disconnecting', () => {
        const rooms = [...socket.rooms];
        rooms.forEach((roomId) => {
            socket.in(roomId).emit(ACTIONS.DISCONNECTED, {
                socketId: socket.id,
                username: userSocketMap[socket.id],
            });
        });
        delete userSocketMap[socket.id];
        socket.leave();
    });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Listening on port ${PORT}`));
