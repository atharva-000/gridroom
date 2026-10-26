const STAR = 'M8 1.5l1.9 4.1 4.4.5-3.3 3 .9 4.4L8 11.3l-3.9 2.2.9-4.4-3.3-3 4.4-.5z';

export function Star({ on = true, size = 14 }: { on?: boolean; size?: number }) {
  return (
    <svg className={`star-icon${on ? '' : ' off'}`} width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
      <path d={STAR} fill="currentColor" />
    </svg>
  );
}

export function Stars({ count, max = 3, size = 14 }: { count: number; max?: number; size?: number }) {
  return (
    <span className="star-row" role="img" aria-label={`${count} of ${max} stars`}>
      {Array.from({ length: max }, (_, i) => <Star key={i} on={i < count} size={size} />)}
    </span>
  );
}
