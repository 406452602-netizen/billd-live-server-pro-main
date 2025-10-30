export interface ISysLanguage {
  code: string;
  label: string;
  is_active: boolean;
  desc: string;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}

export interface ISysTranslationsDict {
  lg_code: string;
  lg_key: string;
  dict_value: string;

  created_at?: string;
  updated_at?: string;
  deleted_at?: string;
}
