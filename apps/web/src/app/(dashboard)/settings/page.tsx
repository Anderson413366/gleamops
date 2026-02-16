'use client';

import { useState, useEffect, useCallback } from 'react';
import { Save, Building2, Bell, Shield, Sun, Moon, Palette, Brain, Focus, Clock3, Sparkles, ScanLine, Type, Highlighter, Contrast, TextCursor, Rabbit } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardHeader, CardTitle, CardContent, Input, Button } from '@gleamops/ui';
import { useAuth } from '@/hooks/use-auth';
import { useTheme } from '@/hooks/use-theme';
import { useUiPreferences } from '@/hooks/use-ui-preferences';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function SettingsPage() {
  const { user, role, tenantId } = useAuth();
  const { resolvedTheme, trueBlack, setTheme, setTrueBlack, mounted } = useTheme();
  const { preferences, togglePreference, mounted: prefMounted } = useUiPreferences();
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchTenant = useCallback(async () => {
    const supabase = getSupabaseBrowserClient();
    if (!tenantId) return;

    const { data } = await supabase
      .from('tenants')
      .select('name, phone, email')
      .eq('id', tenantId)
      .single();

    if (data) {
      setCompanyName(data.name ?? '');
      setCompanyPhone(data.phone ?? '');
      setCompanyEmail(data.email ?? '');
    }
  }, [tenantId]);

  useEffect(() => {
    if (tenantId) fetchTenant();
  }, [tenantId, fetchTenant]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const supabase = getSupabaseBrowserClient();
      if (!tenantId) throw new Error('No tenant');

      const { error } = await supabase
        .from('tenants')
        .update({
          name: companyName.trim(),
          phone: companyPhone.trim() || null,
          email: companyEmail.trim() || null,
        })
        .eq('id', tenantId);

      if (error) throw error;
      toast.success('Settings saved');
    } catch (err: any) {
      toast.error(err?.message ?? 'Failed to save settings', { duration: Infinity });
    } finally {
      setSaving(false);
    }
  };

  const PrefRow = ({
    title,
    description,
    icon,
    onClick,
    enabled,
  }: {
    title: string;
    description: string;
    icon: React.ReactNode;
    onClick: () => void;
    enabled: boolean;
  }) => (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start justify-between gap-4 rounded-xl border border-border p-3 text-left hover:border-module-accent/40 hover:bg-muted/30 transition-colors"
    >
      <div className="min-w-0">
        <p className="text-sm font-medium text-foreground inline-flex items-center gap-2">
          <span className="text-module-accent">{icon}</span>
          {title}
        </p>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <span
        className={`shrink-0 rounded-full px-2 py-1 text-xs font-medium ${
          enabled ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300' : 'bg-muted text-muted-foreground'
        }`}
      >
        {enabled ? 'On' : 'Off'}
      </span>
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Manage your company profile and preferences</p>
      </div>

      <div className="grid gap-6 max-w-2xl">
        {/* Company Profile */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Company Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              label="Company Name"
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Your company name"
            />
            <Input
              label="Company Phone"
              value={companyPhone}
              onChange={(e) => setCompanyPhone(e.target.value)}
              placeholder="(555) 123-4567"
            />
            <Input
              label="Company Email"
              value={companyEmail}
              onChange={(e) => setCompanyEmail(e.target.value)}
              placeholder="info@company.com"
              type="email"
            />
            <div className="pt-2">
              <Button onClick={handleSave} loading={saving}>
                <Save className="h-4 w-4" />
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Appearance */}
        {mounted && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-primary" />
                Appearance
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Theme selector */}
              <div>
                <p className="text-sm font-medium text-foreground mb-2">Theme</p>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ease-in-out ${
                      resolvedTheme === 'light'
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    <Sun className="h-4 w-4" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTheme('dark'); if (trueBlack) setTrueBlack(false); }}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all duration-200 ease-in-out ${
                      resolvedTheme === 'dark' && !trueBlack
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-foreground hover:bg-muted'
                    }`}
                  >
                    <Moon className="h-4 w-4" />
                    Dark
                  </button>
                </div>
              </div>

              {/* True Black toggle */}
              <div className="flex items-center justify-between gap-4 pt-2 border-t border-border">
                <div>
                  <p className="text-sm font-medium text-foreground">True Black Mode</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Uses pure black backgrounds for OLED screens. Only applies in dark mode.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={trueBlack}
                  onClick={() => {
                    const next = !trueBlack;
                    setTrueBlack(next);
                    if (next && resolvedTheme === 'light') setTheme('dark');
                  }}
                  className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    trueBlack ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200 ease-in-out ${
                      trueBlack ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Neurodivergent Preferences */}
        {prefMounted && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-primary" />
                Neurodivergent Preferences
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PrefRow
                title="Focus Mode"
                description="Hide navigation chrome and keep one task at a time in view."
                icon={<Focus className="h-4 w-4" />}
                onClick={() => togglePreference('focus_mode')}
                enabled={preferences.focus_mode}
              />

              <PrefRow
                title="Simple View (Low-Energy Mode)"
                description="Show only the most important cards and actions on dense pages."
                icon={<ScanLine className="h-4 w-4" />}
                onClick={() => togglePreference('simple_view')}
                enabled={preferences.simple_view}
              />

              <PrefRow
                title="Time Awareness"
                description="Show subtle time context like refresh times and time-sensitive indicators."
                icon={<Clock3 className="h-4 w-4" />}
                onClick={() => togglePreference('time_awareness')}
                enabled={preferences.time_awareness}
              />

              <PrefRow
                title="Positive Completion Feedback"
                description="Enable gentle success feedback after key actions complete."
                icon={<Sparkles className="h-4 w-4" />}
                onClick={() => togglePreference('celebration_effects')}
                enabled={preferences.celebration_effects}
              />

              <PrefRow
                title="Dyslexia Font Assist"
                description="Use stronger letter shapes and spacing for easier reading (Atkinson Hyperlegible)."
                icon={<Type className="h-4 w-4" />}
                onClick={() => togglePreference('dyslexia_font')}
                enabled={preferences.dyslexia_font}
              />

              <PrefRow
                title="Reading Ruler"
                description="A subtle cursor-follow highlight to help keep your place while reading."
                icon={<Highlighter className="h-4 w-4" />}
                onClick={() => togglePreference('reading_ruler')}
                enabled={preferences.reading_ruler}
              />
            </CardContent>
          </Card>
        )}

        {/* Accessibility */}
        {prefMounted && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Accessibility
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <PrefRow
                title="Reduce Motion"
                description="Disable animations and transitions (in addition to your OS preference)."
                icon={<Rabbit className="h-4 w-4" />}
                onClick={() => togglePreference('reduce_motion')}
                enabled={preferences.reduce_motion}
              />
              <PrefRow
                title="High Contrast"
                description="Increase contrast for muted text, borders, and inputs without changing module colors."
                icon={<Contrast className="h-4 w-4" />}
                onClick={() => togglePreference('high_contrast')}
                enabled={preferences.high_contrast}
              />
              <PrefRow
                title="Large Text"
                description="Slightly increase base text size for easier scanning."
                icon={<TextCursor className="h-4 w-4" />}
                onClick={() => togglePreference('large_text')}
                enabled={preferences.large_text}
              />
            </CardContent>
          </Card>
        )}

        {/* Account Info */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Account
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p className="text-sm text-foreground">{user?.email ?? '—'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Role</p>
              <p className="text-sm text-foreground">{role ? role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) : '—'}</p>
            </div>
          </CardContent>
        </Card>

        {/* Notifications (placeholder) */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notifications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Notification preferences coming soon.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
