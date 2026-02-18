import { execFileSync } from 'node:child_process';
import { resolve4, resolve6, resolveCname } from 'node:dns/promises';

type DeploymentInspect = {
  id: string;
  name: string;
  target: string;
  aliases?: string[];
  url: string;
};

function runCli(command: string, args: string[]) {
  return execFileSync(command, args, {
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function parseJsonFromCli<T>(output: string): T {
  const start = output.indexOf('{');
  const end = output.lastIndexOf('}');
  if (start < 0 || end < start) {
    throw new Error(`CLI output did not contain JSON:\n${output}`);
  }
  return JSON.parse(output.slice(start, end + 1)) as T;
}

async function resolveDns(hostname: string) {
  const [a, aaaa, cname] = await Promise.all([
    resolve4(hostname).catch(() => [] as string[]),
    resolve6(hostname).catch(() => [] as string[]),
    resolveCname(hostname).catch(() => [] as string[]),
  ]);
  return { a, aaaa, cname };
}

async function head(url: string) {
  try {
    return await fetch(url, { method: 'HEAD', redirect: 'manual' });
  } catch {
    return null;
  }
}

async function main() {
  const canonicalDomain = (process.env.CANONICAL_DOMAIN ?? process.env.NEXT_PUBLIC_CANONICAL_HOST ?? 'gleamops.vercel.app').trim();
  const project = (process.env.VERCEL_PROJECT ?? 'gleamops').trim();
  const extraAllowed = (process.env.ALLOWED_EXTRA_PUBLIC_DOMAINS ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);

  if (!canonicalDomain) {
    throw new Error('Missing canonical domain. Set CANONICAL_DOMAIN or NEXT_PUBLIC_CANONICAL_HOST.');
  }
  if (!project) {
    throw new Error('Missing project. Set VERCEL_PROJECT.');
  }

  console.log(`Checking project "${project}" with canonical domain "${canonicalDomain}"`);

  runCli('vercel', ['project', 'inspect', project]);

  const deployment = parseJsonFromCli<DeploymentInspect>(
    runCli('vercel', ['inspect', `https://${canonicalDomain}`, '--format=json'])
  );
  const aliases = deployment.aliases ?? [];
  const customAliases = aliases.filter((alias) => !alias.endsWith('.vercel.app'));
  const allowedCustom = new Set([canonicalDomain, ...extraAllowed]);
  const unexpectedCustomAliases = customAliases.filter((alias) => !allowedCustom.has(alias));

  if (deployment.name !== project) {
    throw new Error(
      `Canonical domain points to project "${deployment.name}", expected "${project}".`
    );
  }
  if (deployment.target !== 'production') {
    throw new Error(
      `Canonical domain points to target "${deployment.target}", expected "production".`
    );
  }
  if (!aliases.includes(canonicalDomain)) {
    throw new Error(`Canonical domain "${canonicalDomain}" is not an alias on the active production deployment.`);
  }
  if (unexpectedCustomAliases.length > 0) {
    throw new Error(
      `Unexpected custom public domains found: ${unexpectedCustomAliases.join(', ')}`
    );
  }

  const dns = await resolveDns(canonicalDomain);
  if (dns.a.length === 0 && dns.aaaa.length === 0 && dns.cname.length === 0) {
    throw new Error(`No DNS records resolved for ${canonicalDomain}.`);
  }

  const canonicalHead = await head(`https://${canonicalDomain}`);
  if (!canonicalHead) {
    throw new Error(`Unable to reach https://${canonicalDomain}`);
  }
  if (canonicalHead.status >= 500) {
    throw new Error(`Canonical domain returned server error status ${canonicalHead.status}.`);
  }

  const alternateAlias = aliases.find((alias) => alias !== canonicalDomain && alias.endsWith('.vercel.app'));
  if (alternateAlias) {
    const alternateHead = await head(`https://${alternateAlias}`);
    if (!alternateHead) {
      throw new Error(`Unable to reach alternate alias https://${alternateAlias}`);
    }
    if (alternateHead.status === 401 || alternateHead.status === 403) {
      console.log(
        `Alternate alias "${alternateAlias}" is access-protected (${alternateHead.status}); treating as non-public entrypoint.`
      );
    } else {
      const location = alternateHead.headers.get('location') ?? '';
      if (!location.includes(canonicalDomain)) {
        throw new Error(
          `Alternate alias "${alternateAlias}" does not redirect to canonical "${canonicalDomain}".`
        );
      }
    }
  }

  console.log('Domain mapping check passed.');
  console.log(`Deployment: ${deployment.id}`);
  console.log(`Aliases: ${aliases.join(', ')}`);
  console.log(`DNS A: ${dns.a.join(', ') || '(none)'}`);
  console.log(`DNS AAAA: ${dns.aaaa.join(', ') || '(none)'}`);
  console.log(`DNS CNAME: ${dns.cname.join(', ') || '(none)'}`);
}

main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Domain mapping check failed: ${message}`);
  process.exit(1);
});
