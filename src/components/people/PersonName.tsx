import { Link } from 'react-router-dom';
import { getPerson, currentAppointments, previousAppointments } from '../../data/persons';

export const personPath = (id: string) => `/people/${encodeURIComponent(id)}`;

/** "Director at 4 companies, previously 7" */
export function appointmentSummary(id: string): string {
  const p = getPerson(id);
  if (!p) return '';
  const cur = currentAppointments(p).length, prev = previousAppointments(p).length;
  const parts = [cur ? `Director at ${cur} compan${cur === 1 ? 'y' : 'ies'}` : 'No current directorships', prev ? `previously ${prev}` : ''];
  return parts.filter(Boolean).join(', ');
}

/** Link to a person profile with a hover/focus mini card. Falls back to plain text when the person is unknown. */
export function PersonName({ id, name, className = '' }: { id?: string; name: string; className?: string }) {
  if (!id || !getPerson(id)) return <span className={className}>{name}</span>;
  const summary = appointmentSummary(id);
  return (
    <span className="relative inline-flex group/person">
      <Link to={personPath(id)} className={`text-primary underline underline-offset-2 decoration-primary/40 hover:decoration-primary ${className}`} data-person-link={id} aria-describedby={`pc-${id}`}>{name}</Link>
      <span id={`pc-${id}`} role="tooltip" className="pointer-events-none absolute z-40 left-0 top-[calc(100%+4px)] w-max max-w-[280px] px-[10px] py-[7px] rounded-[4px] bg-white border border-border shadow text-[12px] text-ink font-normal opacity-0 group-hover/person:opacity-100 group-focus-within/person:opacity-100 transition-opacity" data-person-card>
        <strong className="block text-[13px]">{name}</strong>{summary}
      </span>
    </span>
  );
}
