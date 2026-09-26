export type FormDetailTab =
  | 'overview'
  | 'fields'
  | 'data'
  | 'versions'
  | 'deployments'
  | 'activity'
  | 'settings';

export interface FormTabItem {
  id: FormDetailTab;
  label: string;
  icon: string;
  badge?: string | number;
}
