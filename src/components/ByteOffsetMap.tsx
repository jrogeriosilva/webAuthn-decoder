import type { DecodedAuthData } from "@/lib/types";

export interface ByteOffsetMapProps {
  authData: DecodedAuthData;
  rawAuthDataLength: number;
}

interface Segment {
  name: string;
  start: number;
  end: number;
}

function computeSegments(authData: DecodedAuthData, total: number): Segment[] {
  const segments: Segment[] = [
    { name: "rpIdHash", start: 0, end: 31 },
    { name: "flags", start: 32, end: 32 },
    { name: "signCount", start: 33, end: 36 },
  ];
  const acd = authData.attestedCredentialData;
  if (acd && total > 37) {
    segments.push({ name: "AAGUID", start: 37, end: 52 });
    segments.push({ name: "credIdLen", start: 53, end: 54 });
    const credIdEnd = 55 + acd.credentialIdLength - 1;
    if (acd.credentialIdLength > 0 && credIdEnd < total) {
      segments.push({ name: "credentialId", start: 55, end: credIdEnd });
    }
    const coseStart = 55 + acd.credentialIdLength;
    if (coseStart < total) {
      segments.push({ name: "COSE key", start: coseStart, end: total - 1 });
    }
  }
  return segments;
}

function rangeLabel(s: Segment): string {
  return s.start === s.end ? `${s.start}` : `${s.start}-${s.end}`;
}

export function ByteOffsetMap({ authData, rawAuthDataLength }: ByteOffsetMapProps) {
  const segments = computeSegments(authData, rawAuthDataLength);
  const total = Math.max(rawAuthDataLength, 1);
  return (
    <section data-testid="byte-offset-map" className="mb-6 flex flex-col gap-2">
      <h3 className="text-xl font-semibold leading-tight">
        authenticatorData byte layout
      </h3>
      <ul className="flex w-full overflow-hidden rounded-md border border-border bg-muted">
        {segments.map((s) => {
          const width = Math.max(((s.end - s.start + 1) / total) * 100, 4);
          return (
            <li
              key={s.name}
              role="listitem"
              data-testid="byte-segment"
              title={`${s.name} (${rangeLabel(s)})`}
              className="flex min-w-[32px] flex-col items-center gap-0.5 border-r border-border px-2 py-1 last:border-r-0 hover:border-accent"
              style={{ width: `${width}%` }}
            >
              <span className="text-xs leading-tight text-muted-foreground">
                {rangeLabel(s)}
              </span>
              <span className="text-xs leading-tight">{s.name}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
