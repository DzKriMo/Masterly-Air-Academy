import api from '@/lib/api';

export interface SearchHit {
  id: string;
  type: string;
  title: string;
  subtitle?: string;
  status?: string;
}

export const SearchService = {
  search: async (query: string): Promise<SearchHit[]> => {
    const res = await api.get<{ results: SearchHit[]; source: string }>('/search/', {
      params: { q: query },
    });
    return res.data?.results ?? [];
  },
};
