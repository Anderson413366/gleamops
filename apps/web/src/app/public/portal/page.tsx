'use client';

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button, Card, CardContent, CardHeader, CardTitle, Input } from '@gleamops/ui';

export default function CustomerPortalLoginPage() {
  const router = useRouter();
  const [token, setToken] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedToken = token.trim();
    if (!normalizedToken) {
      toast.error('Access code is required.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/public/portal/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: normalizedToken }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(body.error ?? 'Access code is invalid or expired.');
      }

      router.push(`/public/portal/${encodeURIComponent(normalizedToken)}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Unable to open portal.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto flex min-h-[calc(100vh-6rem)] w-full max-w-3xl items-center px-4 py-10">
      <Card className="w-full rounded-xl border border-border bg-card shadow-xl">
        <CardHeader>
          <CardTitle className="text-2xl text-foreground">Customer Portal</CardTitle>
          <p className="text-sm text-muted-foreground">
            Enter your access code to view inspections and service updates.
          </p>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <Input
              label="Access code"
              value={token}
              onChange={(event) => setToken(event.target.value)}
              placeholder="Paste your portal code"
              autoComplete="off"
            />
            <div className="flex justify-end">
              <Button type="submit" loading={submitting}>
                Open Portal
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
