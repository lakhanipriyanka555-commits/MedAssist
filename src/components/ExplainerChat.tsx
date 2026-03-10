'use client';

import { useState, useRef, useEffect } from 'react';

interface ChatMessage {
    role: 'user' | 'assistant';
    content: string;
}

interface ExplainerChatProps {
    patientRecordsContext: any;
    medicinesContext?: any[];
}

const LANGUAGES = [
    { code: 'en', label: 'English' },
    { code: 'es', label: 'Español' },
    { code: 'hi', label: 'हिंदी' },
];

export default function ExplainerChat({ patientRecordsContext, medicinesContext = [] }: ExplainerChatProps) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [language, setLanguage] = useState('en');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage = input.trim();
        setInput('');
        setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);
        setIsLoading(true);

        try {
            const res = await fetch('/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: userMessage,
                    language: LANGUAGES.find((l) => l.code === language)?.label || 'English',
                    records: patientRecordsContext,
                    medicines: medicinesContext,
                }),
            });

            if (!res.ok) throw new Error('Failed to fetch AI response');
            const data = await res.json();

            setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
        } catch (error) {
            console.error(error);
            setMessages((prev) => [...prev, { role: 'assistant', content: "Sorry, I encountered an error connecting to the explainer network." }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div style={{ marginTop: '32px', borderTop: '2px solid var(--color-border)', paddingTop: '24px' }}>

            {/* Header & Language Toggle */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <div>
                    <h3 className="font-bold" style={{ fontSize: '18px', color: 'var(--color-primary)' }}>MedAssist AI Explainer</h3>
                    <p className="text-muted" style={{ fontSize: '13px' }}>Ask simple questions about your lab results below.</p>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <label htmlFor="lang-select" className="text-muted" style={{ fontSize: '12px', fontWeight: 'bold' }}>🌐 Language:</label>
                    <select
                        id="lang-select"
                        value={language}
                        onChange={(e) => setLanguage(e.target.value)}
                        style={{ padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', fontSize: '13px', background: 'var(--color-surface)', outline: 'none', cursor: 'pointer' }}
                    >
                        {LANGUAGES.map((lang) => (
                            <option key={lang.code} value={lang.code}>{lang.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Chat Window */}
            <div className="clinical-card" style={{ height: '350px', display: 'flex', flexDirection: 'column', padding: '0', overflow: 'hidden' }}>
                <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {/* Welcome Message */}
                    <div style={{ alignSelf: 'flex-start', background: 'var(--color-primary-light)', padding: '12px 16px', borderRadius: '16px 16px 16px 0', maxWidth: '85%' }}>
                        <p style={{ fontSize: '14px', color: 'var(--color-text-main)' }}>
                            Hello! I've loaded your {patientRecordsContext.length} medical records and {medicinesContext.length} medicine(s). Ask me anything about your health data!
                        </p>
                    </div>

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            style={{
                                alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                background: msg.role === 'user' ? 'var(--color-primary)' : 'var(--color-primary-light)',
                                color: msg.role === 'user' ? 'white' : 'var(--color-text-main)',
                                padding: '12px 16px',
                                borderRadius: msg.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                                maxWidth: '85%'
                            }}
                        >
                            <p style={{ fontSize: '14px', whiteSpace: 'pre-wrap' }}>{msg.content}</p>
                        </div>
                    ))}
                    {isLoading && (
                        <div style={{ alignSelf: 'flex-start', background: 'var(--color-primary-light)', padding: '12px 16px', borderRadius: '16px 16px 16px 0' }}>
                            <p style={{ fontSize: '14px', fontStyle: 'italic', color: 'var(--color-text-muted)' }}>Analyzing records...</p>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Form */}
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', padding: '16px', background: 'var(--color-surface)', borderTop: '1px solid var(--color-border)' }}>
                    <input
                        type="text"
                        placeholder="e.g., What does my high LDL mean?"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        style={{ flex: 1, padding: '10px 16px', borderRadius: 'var(--radius-full)', border: '1px solid var(--color-border)', outline: 'none', fontSize: '14px' }}
                        disabled={isLoading}
                    />
                    <button
                        type="submit"
                        className="btn-primary"
                        style={{ width: 'auto', padding: '10px 20px', opacity: isLoading || !input.trim() ? 0.6 : 1 }}
                        disabled={isLoading || !input.trim()}
                    >
                        Send
                    </button>
                </form>
            </div>

            {/* Required Disclaimer */}
            <div style={{ marginTop: '12px', textAlign: 'center' }}>
                <p style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                    <strong>Disclaimer:</strong> I am an AI assistant, not a doctor. I can only explain data currently in your records. Always consult your healthcare provider for medical advice, diagnoses, or treatment options.
                </p>
            </div>

        </div>
    );
}
