const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const TEMP_DIR = path.join(__dirname, '.temp_exec');

// Ensure base temp directory exists
if (!fs.existsSync(TEMP_DIR)) {
    fs.mkdirSync(TEMP_DIR, { recursive: true });
}

function runCode(language, code, input = '') {
    return new Promise((resolve) => {
        const runId = uuidv4();
        const execDir = path.join(TEMP_DIR, runId);
        fs.mkdirSync(execDir, { recursive: true });

        let filename = '';
        let cmd = '';
        let args = [];
        let compileCmd = '';
        let compileArgs = [];
        let isCompiled = false;

        switch (language) {
            case 'javascript':
                filename = 'index.js';
                // Write a prompt() shim to support browser-style stdin prompt inputs in Node.js
                const shimContent = `const fs = require('fs');
let __stdin_buffer = '';
let __stdin_index = 0;
global.prompt = function(message) {
    if (message) {
        process.stdout.write(message + '\\n');
    }
    if (!__stdin_buffer) {
        try {
            __stdin_buffer = fs.readFileSync(0, 'utf-8');
        } catch (e) {
            __stdin_buffer = '';
        }
    }
    const lines = __stdin_buffer.split(/\\r?\\n/);
    if (__stdin_index < lines.length) {
        return lines[__stdin_index++];
    }
    return null;
};`;
                fs.writeFileSync(path.join(execDir, '__prompt_shim.js'), shimContent);
                cmd = 'node';
                args = ['-r', './__prompt_shim.js', filename];
                break;
            case 'python':
                filename = 'main.py';
                cmd = 'python';
                args = [filename];
                break;
            case 'cpp':
                filename = 'main.cpp';
                compileCmd = 'g++';
                compileArgs = ['main.cpp', '-o', 'main.exe'];
                cmd = 'main.exe'; // Executable in current directory
                args = [];
                isCompiled = true;
                break;
            case 'java':
                // Search for class name in the code
                const match = code.match(/public\s+class\s+(\w+)/) || code.match(/class\s+(\w+)/);
                const className = match ? match[1] : 'Main';
                filename = `${className}.java`;
                cmd = 'java';
                args = [filename];
                break;
            default:
                cleanup(execDir);
                return resolve({
                    success: false,
                    output: `Unsupported language: ${language}`,
                    executionTime: 0,
                    exitCode: 1
                });
        }

        const filePath = path.join(execDir, filename);
        fs.writeFileSync(filePath, code);

        const startTime = Date.now();

        if (isCompiled) {
            // Compile first
            const compileProcess = spawn(compileCmd, compileArgs, { cwd: execDir, shell: true });
            let compileStderr = '';

            compileProcess.stderr.on('data', (data) => {
                compileStderr += data.toString();
            });

            compileProcess.on('close', (code) => {
                if (code !== 0) {
                    cleanup(execDir);
                    return resolve({
                        success: false,
                        output: `Compilation Error:\n${compileStderr}`,
                        executionTime: Date.now() - startTime,
                        exitCode: code
                    });
                }
                // Run the compiled binary
                // On Windows, prefix running local executables with .\ if needed or run directly with shell: true
                const runCmd = process.platform === 'win32' ? '.\\main.exe' : './main.exe';
                executeProcess(runCmd, args, execDir, input, startTime, resolve);
            });

            compileProcess.on('error', (err) => {
                cleanup(execDir);
                resolve({
                    success: false,
                    output: `Compiler error: ${err.message}`,
                    executionTime: Date.now() - startTime,
                    exitCode: 1
                });
            });
        } else {
            // Run interpreter directly
            executeProcess(cmd, args, execDir, input, startTime, resolve);
        }
    });
}

function executeProcess(cmd, args, execDir, input, startTime, resolve) {
    let stdout = '';
    let stderr = '';
    let killed = false;

    const child = spawn(cmd, args, { cwd: execDir, shell: true });

    // Set timeout (8 seconds)
    const timeoutTimer = setTimeout(() => {
        killed = true;
        child.kill('SIGKILL');
    }, 8000);

    // Feed input
    if (input) {
        try {
            child.stdin.write(input);
        } catch (e) {
            console.error('Stdin write error', e);
        }
    }
    try {
        child.stdin.end();
    } catch (e) {
        console.error('Stdin end error', e);
    }

    child.stdout.on('data', (data) => {
        stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
        stderr += data.toString();
    });

    child.on('error', (err) => {
        clearTimeout(timeoutTimer);
        cleanup(execDir);
        resolve({
            success: false,
            output: err.message || 'Execution error',
            executionTime: Date.now() - startTime,
            exitCode: 1
        });
    });

    child.on('close', (code) => {
        clearTimeout(timeoutTimer);
        cleanup(execDir);

        const executionTime = Date.now() - startTime;
        if (killed) {
            return resolve({
                success: false,
                output: `${stdout}${stderr}\n\n[Execution Terminated: Timeout (Limit 8 seconds)]`,
                executionTime,
                exitCode: 124 // Standard timeout exit code
            });
        }

        resolve({
            success: code === 0,
            output: stdout + stderr,
            executionTime,
            exitCode: code
        });
    });
}

function cleanup(dir) {
    try {
        if (fs.existsSync(dir)) {
            fs.rmSync(dir, { recursive: true, force: true });
        }
    } catch (err) {
        console.error('Cleanup failed for dir:', dir, err);
    }
}

module.exports = { runCode };
