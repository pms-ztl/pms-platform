import { useQuery } from '@tanstack/react-query';
import { CalendarDaysIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

import { oneOnOnesApi, type OneOnOne } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

function UpcomingOneOnOnes() {
  const { user } = useAuthStore();
  const { data: upcoming } = useQuery({
    queryKey: ['one-on-ones-upcoming'],
    queryFn: () => oneOnOnesApi.getUpcoming(),
  });

  if (!upcoming || upcoming.length === 0) return null;

  return (
    <div className="glass-deep rounded-2xl overflow-hidden">
      <div className="card-header bg-gradient-to-r from-teal-50/80 to-cyan-50/50 dark:from-teal-500/[0.06] dark:to-cyan-500/[0.03]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-xl shadow-lg group-hover:shadow-glow-accent transition-shadow duration-300">
              <CalendarDaysIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-secondary-900 dark:text-white">Upcoming 1-on-1s</h2>
              <p className="text-xs text-secondary-500 dark:text-secondary-400">Your next scheduled meetings</p>
            </div>
          </div>
          <a href="/one-on-ones" className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 flex items-center gap-1">
            View all &rarr;
          </a>
        </div>
      </div>
      <div className="card-body">
        <div className="space-y-3">
          {upcoming.slice(0, 3).map((meeting: OneOnOne) => {
            const otherPerson = meeting.managerId === user?.id ? meeting.employee : meeting.manager;
            const meetingDate = new Date(meeting.scheduledAt);
            const isToday = new Date().toDateString() === meetingDate.toDateString();

            return (
              <a
                key={meeting.id}
                href={`/one-on-ones/${meeting.id}`}
                className="flex items-center gap-4 p-3 rounded-xl bg-secondary-50 dark:bg-secondary-800/50 hover:bg-white dark:hover:bg-secondary-800 hover:shadow-md transition-all border border-transparent hover:border-secondary-200 dark:hover:border-secondary-700"
              >
                <div className={clsx(
                  'flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm',
                  isToday ? 'bg-gradient-to-br from-teal-500 to-cyan-500' : 'bg-gradient-to-br from-secondary-400 to-secondary-500'
                )}>
                  {otherPerson.firstName[0]}{otherPerson.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-secondary-900 dark:text-white break-words">
                    {otherPerson.firstName} {otherPerson.lastName}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-secondary-500 dark:text-secondary-400">
                    <span>{isToday ? 'Today' : meetingDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
                    <span>&middot;</span>
                    <span>{meetingDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}</span>
                    <span>&middot;</span>
                    <span>{meeting.duration} min</span>
                  </div>
                  {meeting.agenda && meeting.agenda.length > 0 && (
                    <p className="text-xs text-secondary-400 dark:text-secondary-500 mt-0.5 break-words">
                      {meeting.agenda[0].topic}
                    </p>
                  )}
                </div>
                <div className="flex-shrink-0">
                  {isToday && (
                    <span className="bg-teal-100 dark:bg-teal-900/30 text-teal-700 dark:text-teal-300 rounded-full px-2 py-0.5 text-xs font-medium">
                      Today
                    </span>
                  )}
                  {meeting.status === 'IN_PROGRESS' && (
                    <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 rounded-full px-2 py-0.5 text-xs font-medium animate-pulse">
                      Live
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default UpcomingOneOnOnes;
