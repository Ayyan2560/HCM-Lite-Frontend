import api from './client';

export const aiApi = {
  status: () => api.get('/ai/status'),
  chat: (payload) => api.post('/ai/chat', payload),
  leaveSuggestion: (text) => api.post('/ai/leave-suggestion', { text }),
};

export default aiApi;
