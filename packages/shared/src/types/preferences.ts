export interface UiPreferences {
  focus_mode: boolean;
  simple_view: boolean;
  time_awareness: boolean;
  celebration_effects: boolean;
  reading_ruler: boolean;
  dyslexia_font: boolean;
  reduce_motion: boolean;
  high_contrast: boolean;
  large_text: boolean;
}

export const DEFAULT_UI_PREFERENCES: UiPreferences = {
  focus_mode: false,
  simple_view: false,
  time_awareness: true,
  celebration_effects: true,
  reading_ruler: false,
  dyslexia_font: false,
  reduce_motion: false,
  high_contrast: false,
  large_text: false,
};
