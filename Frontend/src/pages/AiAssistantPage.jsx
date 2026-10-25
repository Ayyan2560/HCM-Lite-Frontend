import React, { useState, useEffect, useRef } from 'react';
import {
  Box, Card, Typography, Stack, TextField, Button, Paper, Avatar,
  CircularProgress, Alert, Chip, Divider,
} from '@mui/material';
import SmartToyRoundedIcon from '@mui/icons-material/SmartToyRounded';
import PersonRoundedIcon from '@mui/icons-material/PersonRounded';
import SendRoundedIcon from '@mui/icons-material/SendRounded';
import AutoAwesomeRoundedIcon from '@mui/icons-material/AutoAwesomeRounded';

import aiApi from '../api/aiApi';
import { useAuth } from '../context/AuthContext';
import { brandColors } from '../theme/theme';

export const AiAssistantPage = () => {
  const { user } = useAuth();
  const [messages, setMessages] = useState([
    { role: 'assistant', content: 'Hello! I\'m your HCM AI assistant. I can help with HR policy questions, leave information, attendance queries, and more. How can I help you today?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    aiApi.getStatus().then(res => setAiStatus(res?.data || res)).catch(() => setAiStatus({ configured: false }));
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userMsg = { role: 'user', content: input };
    setMessages(m => [...m, userMsg]);
    setInput('');
    setLoading(true);
    try {
      const res = await aiApi.askChat(input);
      const reply = res?.data?.message || res?.data?.reply || res?.message || 'I processed your request.';
      setMessages(m => [...m, { role: 'assistant', content: reply }]);
    } catch (e) {
      setMessages(m => [...m, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
    } finally { setLoading(false); }
  };

  const handleKeyDown = (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } };

  const suggestions = ['What is the leave policy?', 'How many days off do I have?', 'Explain attendance rules', 'Show me today\'s attendance summary'];

  return (
    <Box sx={{ pb: 4 }}>
      <Stack direction="row" alignItems="center" spacing={1.5} sx={{ mb: 3 }}>
        <SmartToyRoundedIcon color="primary" sx={{ fontSize: 28 }} />
        <Box>
          <Typography variant="h5" fontWeight={700}>AI Assistant</Typography>
          <Typography variant="caption" color="text.secondary">Powered by HCM Intelligence</Typography>
        </Box>
        <Chip
          label={aiStatus?.configured ? 'AI Active' : 'Fallback Mode'}
          color={aiStatus?.configured ? 'success' : 'warning'}
          size="small"
          icon={<AutoAwesomeRoundedIcon />}
        />
      </Stack>

      {!aiStatus?.configured && (
        <Alert severity="info" sx={{ mb: 2 }}>AI is running in fallback mode. For full AI capabilities, configure an AI_API_KEY in the backend.</Alert>
      )}

      <Card sx={{ display: 'flex', flexDirection: 'column', height: 580 }}>
        {/* Messages */}
        <Box sx={{ flex: 1, overflowY: 'auto', p: 2.5, '&::-webkit-scrollbar': { width: 4 }, '&::-webkit-scrollbar-thumb': { backgroundColor: brandColors.slate[300], borderRadius: 2 } }}>
          {messages.map((msg, i) => (
            <Stack key={i} direction="row" spacing={1.5} sx={{ mb: 2.5, justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start' }}>
              {msg.role === 'assistant' && (
                <Avatar sx={{ width: 34, height: 34, backgroundColor: brandColors.primary.main, flexShrink: 0 }}>
                  <SmartToyRoundedIcon fontSize="small" />
                </Avatar>
              )}
              <Paper
                elevation={0}
                sx={{
                  p: 1.75, maxWidth: '75%', borderRadius: 3,
                  backgroundColor: msg.role === 'user' ? brandColors.primary.main : brandColors.slate[100],
                  color: msg.role === 'user' ? '#fff' : 'inherit',
                  borderTopRightRadius: msg.role === 'user' ? 4 : 16,
                  borderTopLeftRadius: msg.role === 'assistant' ? 4 : 16,
                }}
              >
                <Typography variant="body2" sx={{ lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{msg.content}</Typography>
              </Paper>
              {msg.role === 'user' && (
                <Avatar src={user?.avatarUrl} sx={{ width: 34, height: 34, flexShrink: 0 }}>
                  <PersonRoundedIcon fontSize="small" />
                </Avatar>
              )}
            </Stack>
          ))}
          {loading && (
            <Stack direction="row" spacing={1.5} sx={{ mb: 2 }}>
              <Avatar sx={{ width: 34, height: 34, backgroundColor: brandColors.primary.main }}>
                <SmartToyRoundedIcon fontSize="small" />
              </Avatar>
              <Paper elevation={0} sx={{ p: 1.75, borderRadius: 3, backgroundColor: brandColors.slate[100] }}>
                <Stack direction="row" spacing={0.5} alignItems="center">
                  <CircularProgress size={14} />
                  <Typography variant="body2" color="text.secondary">Thinking...</Typography>
                </Stack>
              </Paper>
            </Stack>
          )}
          <div ref={bottomRef} />
        </Box>

        {/* Suggestions */}
        {messages.length <= 1 && (
          <Box sx={{ px: 2, pb: 1.5 }}>
            <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>Try asking:</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {suggestions.map(s => (
                <Chip key={s} label={s} size="small" clickable onClick={() => setInput(s)} sx={{ mb: 0.5 }} />
              ))}
            </Stack>
          </Box>
        )}

        <Divider />

        {/* Input */}
        <Stack direction="row" spacing={1.5} sx={{ p: 2, alignItems: 'flex-end' }}>
          <TextField
            fullWidth multiline maxRows={4} placeholder="Ask anything about HR policies, attendance, leaves..."
            value={input} onChange={e => setInput(e.target.value)} onKeyDown={handleKeyDown}
            variant="outlined" size="small"
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 3 } }}
          />
          <Button variant="contained" onClick={handleSend} disabled={loading || !input.trim()}
            sx={{ borderRadius: 3, minWidth: 48, height: 40, px: 2 }}>
            <SendRoundedIcon fontSize="small" />
          </Button>
        </Stack>
      </Card>
    </Box>
  );
};

export default AiAssistantPage;
