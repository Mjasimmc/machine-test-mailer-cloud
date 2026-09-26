import { api } from './api';
import {
  CreateFormDto,
  CreateVersionDto,
  FormDataViewDto,
  FormDto,
  FormVersionDto,
  GetFormDataQueryDto,
  PublicFormDto,
  UpdateDraftDto,
  UpdateVersionDto,
} from '@saas/shared';

export const formsService = {
  create: async (dto: CreateFormDto): Promise<FormDto> => {
    return api.post<FormDto>('/forms', dto);
  },

  getAll: async (): Promise<FormDto[]> => {
    return api.get<FormDto[]>('/forms');
  },

  getOne: async (id: string): Promise<FormDto> => {
    return api.get<FormDto>(`/forms/${id}`);
  },

  updateDraft: async (id: string, dto: UpdateDraftDto): Promise<FormDto> => {
    return api.patch<FormDto>(`/forms/${id}/draft`, dto);
  },

  deploy: async (id: string): Promise<FormDto> => {
    return api.post<FormDto>(`/forms/${id}/deploy`);
  },

  createVersion: async (id: string, dto?: CreateVersionDto): Promise<FormVersionDto> => {
    return api.post<FormVersionDto>(`/forms/${id}/versions`, dto || {});
  },

  updateVersion: async (
    id: string,
    versionId: string,
    dto: UpdateVersionDto,
  ): Promise<FormVersionDto> => {
    return api.patch<FormVersionDto>(`/forms/${id}/versions/${versionId}`, dto);
  },

  deployVersion: async (id: string, versionId?: string): Promise<FormDto> => {
    if (versionId) {
      return api.post<FormDto>(`/forms/${id}/versions/${versionId}/deploy`);
    }
    return api.post<FormDto>(`/forms/${id}/deploy`);
  },

  duplicateVersion: async (id: string, versionId: string): Promise<FormVersionDto> => {
    return api.post<FormVersionDto>(`/forms/${id}/versions/${versionId}/duplicate`);
  },

  updateSettings: async (
    id: string,
    dto: { name?: string; settings?: any },
  ): Promise<FormDto> => {
    return api.patch<FormDto>(`/forms/${id}/settings`, dto);
  },

  getDataView: async (id: string, query?: GetFormDataQueryDto): Promise<FormDataViewDto> => {
    const params = new URLSearchParams();
    if (query?.page) params.append('page', query.page.toString());
    if (query?.limit) params.append('limit', query.limit.toString());
    if (query?.sortField) params.append('sortField', query.sortField);
    if (query?.sortDirection) params.append('sortDirection', query.sortDirection);
    if (query?.versionFilter && query.versionFilter !== 'all') params.append('versionFilter', query.versionFilter);
    if (query?.search) params.append('search', query.search);

    const queryString = params.toString();
    const url = `/forms/${id}/data${queryString ? `?${queryString}` : ''}`;
    return api.get<FormDataViewDto>(url);
  },

  getPublic: async (publicId: string): Promise<PublicFormDto> => {
    return api.get<PublicFormDto>(`/public/forms/${publicId}`);
  },

  submitPublic: async (
    publicId: string,
    data: Record<string, any>,
    idempotencyKey?: string,
  ): Promise<{ message: string; id: string }> => {
    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['Idempotency-Key'] = idempotencyKey;
    }
    return api.post<{ message: string; id: string }>(
      `/public/forms/${publicId}/submissions`,
      { data },
      headers,
    );
  },
};
