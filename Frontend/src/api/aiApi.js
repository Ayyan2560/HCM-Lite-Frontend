import api from './axios';

export const aiApi = {
  // GET /api/ai/status
  async getStatus() {
    const res = await api.get('/api/ai/status');
    return res.data?.data || res.data;
  },

  // POST /api/ai/chat
  async askChat(message) {
    const res = await api.post('/api/ai/chat', { message });
    return res.data?.data || res.data;
  },

  // POST /api/ai/leave-suggestion (Smart leave form)
  async getLeaveSuggestion(message) {
    const res = await api.post('/api/ai/leave-suggestion', { message });
    return res.data?.data || res.data;
  },
};

export default aiApi;
