import api from '@/lib/api';

export const SearchService = {
  search: (query: string) =>
    api.get('/search/', { params: { q: query } }),
};
