'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, FileDropzone, Input, Select, Textarea } from '@gleamops/ui';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

interface SiteRow {
  id: string;
  name: string;
  site_code: string;
}

interface DashboardPayload {
  sites: SiteRow[];
}

const FEEDBACK_TYPES = [
  { value: 'KUDOS', label: 'Kudos' },
  { value: 'SUGGESTION', label: 'Suggestion' },
  { value: 'QUESTION', label: 'Question' },
];

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 80);
}

export default function PortalFeedbackPage() {
  const router = useRouter();
  const { token } = useParams<{ token: string }>();

  const [sites, setSites] = useState<SiteRow[]>([]);
  const [loadingSites, setLoadingSites] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackType, setFeedbackType] = useState('KUDOS');
  const [siteId, setSiteId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [message, setMessage] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;

    async function loadSites() {
      setLoadingSites(true);
      try {
        const response = await fetch(`/api/public/portal/${encodeURIComponent(token)}/dashboard`, { cache: 'no-store' });
        const body = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(body.error ?? 'Unable to load portal context.');
        if (!cancelled) {
          const payload = body.data as DashboardPayload;
          setSites(payload.sites ?? []);
          setSiteId((payload.sites ?? [])[0]?.id ?? '');
        }
      } catch (error) {
        if (!cancelled) toast.error(error instanceof Error ? error.message : 'Unable to load sites.');
      } finally {
        if (!cancelled) setLoadingSites(false);
      }
    }

    void loadSites();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const siteOptions = useMemo(() => sites.map((site) => ({
    value: site.id,
    label: site.site_code ? `${site.site_code} - ${site.name}` : site.name,
  })), [sites]);

  const uploadPhoto = async (file: File) => {
    if (!token) return;
    setUploading(true);
    try {
      const supabase = getSupabaseBrowserClient();
      const path = `public/customer-portal/${encodeURIComponent(token)}/${crypto.randomUUID()}-${safeFilename(file.name)}`;
      const { error } = await supabase.storage.from('documents').upload(path, file, {
        upsert: false,
        contentType: file.type || 'application/octet-stream',
      });
      if (error) throw new Error(error.message);
      const { data } = supabase.storage.from('documents').getPublicUrl(path);
      if (!data?.publicUrl) throw new Error('Could not retrieve uploaded photo URL.');
      setPhotos((prev) => [...prev, data.publicUrl]);
      toast.success('Photo uploaded.');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Photo upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) return;
    if (!message.trim()) {
      toast.error('Please enter your message.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`/api/public/portal/${encodeURIComponent(token)}/feedback`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          feedback_type: feedbackType,
          site_id: siteId || null,
          contact_name: contactName || null,
          contact_email: contactEmail || null,
          message: message.trim(),
          photos,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? 'Unable to submit feedback.');
      }
      toast.success('Feedback submitted successfully.');
      router.push(`/public/portal/${encodeURIComponent(token)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="rounded-xl border border-border bg-card shadow-sm">
      <CardHeader>
        <CardTitle>Send Feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Link href={`/public/portal/${encodeURIComponent(token)}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Back to Dashboard
        </Link>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <Select
            label="Feedback Type"
            value={feedbackType}
            onChange={(event) => setFeedbackType(event.target.value)}
            options={FEEDBACK_TYPES}
          />
          <Select
            label="Site (optional)"
            value={siteId}
            onChange={(event) => setSiteId(event.target.value)}
            options={siteOptions}
            disabled={loadingSites}
          />
          <Input
            label="Contact Name (optional)"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="Your name"
          />
          <Input
            label="Contact Email (optional)"
            type="email"
            value={contactEmail}
            onChange={(event) => setContactEmail(event.target.value)}
            placeholder="name@company.com"
          />
          <Textarea
            label="Message"
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            rows={5}
            placeholder="Share your feedback."
          />

          <div className="space-y-2">
            <p className="text-xs font-medium text-muted-foreground">Photos (optional)</p>
            <FileDropzone
              onFileSelect={(file) => { void uploadPhoto(file); }}
              accept="image/*"
              maxSizeMB={10}
              uploading={uploading}
              label="Drop a photo here or click to browse"
            />
            {photos.length > 0 ? (
              <div className="space-y-1">
                {photos.map((url) => (
                  <div key={url} className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-xs">
                    <span className="truncate">{url}</span>
                    <button
                      type="button"
                      className="text-destructive"
                      onClick={() => setPhotos((prev) => prev.filter((entry) => entry !== url))}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="flex justify-end">
            <Button type="submit" loading={submitting} disabled={uploading}>
              <Send className="h-4 w-4" />
              Submit
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
