import React, { useEffect, useRef } from 'react';
import Codemirror from 'codemirror';
import 'codemirror/lib/codemirror.css';
import 'codemirror/theme/dracula.css';
import 'codemirror/mode/javascript/javascript';
import 'codemirror/mode/python/python';
import 'codemirror/mode/clike/clike';
import 'codemirror/addon/edit/closetag';
import 'codemirror/addon/edit/closebrackets';
import ACTIONS from '../Actions';

const getMimeType = (lang) => {
    switch (lang) {
        case 'javascript':
            return { name: 'javascript', json: true };
        case 'python':
            return { name: 'python' };
        case 'cpp':
            return { name: 'text/x-c++src' };
        case 'java':
            return { name: 'text/x-java' };
        default:
            return { name: 'javascript', json: true };
    }
};

const Editor = ({ socketRef, roomId, onCodeChange, language, editorInstanceRef }) => {
    const editorRef = useRef(null);
    useEffect(() => {
        async function init() {
            editorRef.current = Codemirror.fromTextArea(
                document.getElementById('realtimeEditor'),
                {
                    mode: getMimeType(language),
                    theme: 'dracula',
                    autoCloseTags: true,
                    autoCloseBrackets: true,
                    lineNumbers: true,
                }
            );

            if (editorInstanceRef) {
                editorInstanceRef.current = editorRef.current;
            }

            onCodeChange(editorRef.current.getValue());

            editorRef.current.on('change', (instance, changes) => {
                const { origin } = changes;
                const code = instance.getValue();
                onCodeChange(code);
                if (origin !== 'setValue') {
                    socketRef.current.emit(ACTIONS.CODE_CHANGE, {
                        roomId,
                        code,
                    });
                }
            });
        }
        init();
    }, []);

    useEffect(() => {
        if (editorRef.current && language) {
            editorRef.current.setOption('mode', getMimeType(language));
        }
    }, [language]);

    useEffect(() => {
        if (socketRef.current) {
            socketRef.current.on(ACTIONS.CODE_CHANGE, ({ code }) => {
                if (code !== null && code !== undefined) {
                    if (editorRef.current.getValue() !== code) {
                        editorRef.current.setValue(code);
                    }
                }
            });
        }

        return () => {
            if (socketRef.current) {
                socketRef.current.off(ACTIONS.CODE_CHANGE);
            }
        };
    }, [socketRef.current]);

    return <textarea id="realtimeEditor"></textarea>;
};

export default Editor;
