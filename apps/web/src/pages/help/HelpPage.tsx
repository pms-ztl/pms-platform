import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  BookOpenIcon,
  AcademicCapIcon,
  ChatBubbleLeftRightIcon,
  ChevronDownIcon,
  RocketLaunchIcon,
  LightBulbIcon,
  ClipboardDocumentCheckIcon,
  UserGroupIcon,
  CalendarDaysIcon,
  ChartBarIcon,
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  FlagIcon,
  ArrowRightIcon,
} from '@heroicons/react/24/outline';
import clsx from 'clsx';
import { usePageTitle } from '@/hooks/usePageTitle';

// ── Types ────────────────────────────────────────────────────────────────────

interface Guide {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  content: string[];
}

interface FAQItem {
  question: string;
  answer: string;
}

interface FAQCategory {
  name: string;
  items: FAQItem[];
}

// ── Data ─────────────────────────────────────────────────────────────────────

const guides: Guide[] = [
  {
    id: 'getting-started',
    icon: RocketLaunchIcon,
    title: 'Getting Started',
    description: 'Steps to set up your profile and get oriented with the platform.',
    content: [
      'Log in with the credentials provided by your HR administrator. On first login you will be prompted to update your password.',
      'Navigate to Profile and fill in your personal details, job title, department, and upload a profile photo.',
      'Review your reporting structure under your profile to ensure your manager and team are correctly assigned.',
      'Visit the Dashboard to see an overview of your current goals, upcoming reviews, and pending feedback requests.',
      'Explore the left sidebar to familiarize yourself with Goals, Reviews, Feedback, 1-on-1s, and Development sections.',
      'Enable push notifications in Settings so you never miss a deadline or feedback request.',
    ],
  },
  {
    id: 'self-assessment',
    icon: ClipboardDocumentCheckIcon,
    title: 'Completing Self-Assessment',
    description: 'How to fill out your self-appraisal form before a review cycle.',
    content: [
      'When a review cycle opens, you will receive a notification. Navigate to Reviews and find your active self-assessment.',
      'For each competency or goal listed, provide a rating using the scale defined by your organization (e.g. 1-5).',
      'Write specific examples and evidence to support your ratings. Reference measurable outcomes whenever possible.',
      'Use the "Attach Evidence" feature to link relevant documents, metrics, or recognitions that support your claims.',
      'Review all sections carefully before submitting. Some organizations allow edits until a deadline; check with your HR admin.',
      'Once submitted, your self-assessment will be visible to your manager as part of the review process.',
    ],
  },
  {
    id: 'feedback',
    icon: ChatBubbleLeftRightIcon,
    title: 'Giving & Receiving Feedback',
    description: 'Best practices for participating in 360-degree feedback.',
    content: [
      'Navigate to the Feedback section to see any pending feedback requests assigned to you.',
      'When giving feedback, be specific and focus on observable behaviors rather than personality traits.',
      'Use the SBI model: describe the Situation, the Behavior you observed, and its Impact.',
      'Balance constructive feedback with recognition of strengths. Aim for actionable suggestions.',
      'Anonymous feedback is available if enabled by your HR admin. Your identity will not be revealed to the recipient.',
      'When receiving feedback, read it with an open mind. Use the "Acknowledge" button to show you have reviewed it.',
      'Discuss key feedback themes with your manager during your next 1-on-1 meeting.',
    ],
  },
  {
    id: 'one-on-ones',
    icon: CalendarDaysIcon,
    title: 'Running 1-on-1 Meetings',
    description: 'Guide for managers on conducting effective 1-on-1 meetings.',
    content: [
      'Schedule recurring 1-on-1s with each direct report from the 1-on-1s section. Weekly or biweekly cadence is recommended.',
      'Both manager and employee can add agenda items before the meeting using the shared agenda feature.',
      'Start each meeting by reviewing action items from the previous session to track follow-through.',
      'Cover these key areas: progress on goals, blockers and support needed, feedback, career development, and well-being.',
      'Use the note-taking feature during the meeting to capture decisions and action items in real time.',
      'After the meeting, both parties should review and confirm the notes. Action items will appear in your task list.',
      'Keep meetings focused on the employee. Aim for an 80/20 split where the employee does most of the talking.',
    ],
  },
  {
    id: 'smart-goals',
    icon: FlagIcon,
    title: 'Setting SMART Goals',
    description: 'How to create measurable and achievable goals.',
    content: [
      'Navigate to Goals and click "Create Goal" to begin. Select the goal type: Individual, Team, Department, or OKR.',
      'Specific: Clearly define what you want to accomplish. Avoid vague language like "improve performance."',
      'Measurable: Include quantifiable metrics. For example, "Increase customer satisfaction score from 3.8 to 4.2."',
      'Achievable: Set goals that stretch your capabilities but remain realistic given your resources and timeframe.',
      'Relevant: Ensure the goal aligns with your team objectives and the broader organizational strategy.',
      'Time-bound: Set a clear deadline. Use milestones for longer-term goals to track incremental progress.',
      'Link your goals to parent objectives using the goal alignment feature to show how your work contributes to the bigger picture.',
    ],
  },
  {
    id: 'performance-review',
    icon: ChartBarIcon,
    title: 'Understanding Your Performance Review',
    description: 'What to expect during the review cycle process.',
    content: [
      'Review cycles are configured by HR and typically follow these phases: Self-Assessment, Manager Review, Calibration, and Final Delivery.',
      'During self-assessment, you rate yourself against predefined competencies and goals. Be honest and evidence-based.',
      'Your manager will complete their assessment independently, then compare with your self-assessment.',
      'Calibration sessions ensure fairness across teams. Managers discuss ratings with peers and HR to reduce bias.',
      'After calibration, your manager will schedule a review meeting to discuss your final ratings and feedback.',
      'Your overall rating is typically a weighted combination of goal achievement, competency ratings, and 360 feedback.',
      'After the review meeting, you can view your final review in the Reviews section and add acknowledgement comments.',
    ],
  },
  {
    id: 'development-plans',
    icon: AcademicCapIcon,
    title: 'Creating Development Plans',
    description: 'Steps to build career growth and skill development plans.',
    content: [
      'Navigate to Development and click "Create Plan" to start a new individual development plan (IDP).',
      'Identify 2-3 key skills or competencies you want to develop based on your review feedback and career aspirations.',
      'For each development area, define specific learning activities: courses, mentoring, stretch assignments, or certifications.',
      'Set target completion dates for each activity. Break large goals into quarterly milestones.',
      'Link your development plan to your career path or succession planning goals if available.',
      'Schedule regular check-ins with your manager to review progress and adjust the plan as needed.',
      'Use the "Log Progress" feature to record completed activities, certifications earned, and skills acquired.',
    ],
  },
  {
    id: 'hr-calibration',
    icon: UserGroupIcon,
    title: 'For HR: Calibration Guide',
    description: 'How to configure and run calibration sessions across teams.',
    content: [
      'Navigate to Calibration from the admin menu. Create a new calibration session tied to the active review cycle.',
      'Select the teams and departments to include. You can run calibration at the department or organization level.',
      'Configure the session: set the date, invite calibration participants (typically managers and HR business partners).',
      'Before the session, review the distribution of ratings across teams using the analytics dashboard.',
      'During calibration, use the 9-Box Grid view to visualize employees by performance and potential ratings.',
      'Facilitate discussion around outliers: employees rated significantly higher or lower than the expected distribution.',
      'Document calibration decisions and any rating adjustments. The system will track all changes with an audit trail.',
      'After calibration, lock the ratings and notify managers to proceed with review delivery meetings.',
    ],
  },
  {
    id: 'hr-pip',
    icon: ExclamationTriangleIcon,
    title: 'For HR: Managing PIPs',
    description: 'Performance improvement plan workflow and best practices.',
    content: [
      'Navigate to PIPs from the admin or manager menu. Click "Create PIP" and select the employee.',
      'Define the performance gap clearly: list specific competencies or goals where the employee is underperforming.',
      'Set measurable improvement targets with specific deadlines, typically 30, 60, or 90 days.',
      'Outline the support to be provided: training, mentoring, adjusted workload, or additional resources.',
      'Schedule regular check-in meetings (weekly recommended) to review progress against PIP targets.',
      'Document all interactions and progress updates in the system. This creates a clear audit trail.',
      'At the end of the PIP period, review the evidence and make a determination: successful completion, extension, or further action.',
      'Coordinate with your legal team regarding any PIP that may lead to termination to ensure compliance.',
    ],
  },
];

const faqCategories: FAQCategory[] = [
  {
    name: 'General',
    items: [
      {
        question: 'What is PMS?',
        answer:
          'PMS (Performance Management System) is a comprehensive platform for managing employee performance reviews, goal tracking, 360-degree feedback, development plans, and career growth. It helps organizations align individual contributions with business objectives and supports continuous performance improvement.',
      },
      {
        question: 'How do I reset my password?',
        answer:
          'Click the "Forgot Password" link on the login page and enter your registered email address. You will receive a password reset link via email. If you do not receive the email within a few minutes, check your spam folder or contact your HR administrator for assistance.',
      },
      {
        question: 'Who can see my feedback?',
        answer:
          'Feedback visibility depends on the type. Self-assessment feedback is visible to you and your manager. Peer feedback may be anonymous depending on your organization\'s configuration. Manager feedback is visible to you after the review is finalized. HR administrators can view all feedback for reporting and calibration purposes.',
      },
      {
        question: 'How are performance ratings calculated?',
        answer:
          'Performance ratings are typically a weighted combination of goal achievement (e.g. 40%), competency ratings (e.g. 40%), and 360 feedback scores (e.g. 20%). The exact weights are configured by your HR admin and may vary by role or level. Ratings may be adjusted during calibration to ensure consistency across teams.',
      },
    ],
  },
  {
    name: 'For Employees',
    items: [
      {
        question: 'When is my next review?',
        answer:
          'Your next review date is displayed on your Dashboard under "Upcoming Reviews." You will also receive email and in-app notifications when a review cycle opens. Review cycles are typically quarterly or annual, depending on your organization\'s configuration.',
      },
      {
        question: 'How do I request feedback?',
        answer:
          'Navigate to the Feedback section and click "Request Feedback." You can select specific colleagues, choose the feedback type (project-based, competency-based, or general), and set a deadline. The selected colleagues will receive a notification to provide their feedback.',
      },
      {
        question: 'Can I edit my self-assessment after submitting?',
        answer:
          'This depends on your organization\'s settings. Some configurations allow edits until the review cycle deadline, while others lock submissions immediately. Check with your HR administrator for your specific policy. If edits are allowed, navigate to Reviews and click "Edit" on your submitted assessment.',
      },
      {
        question: 'What happens during calibration?',
        answer:
          'Calibration is a process where managers and HR review performance ratings across teams to ensure fairness and consistency. Your manager may adjust your rating based on calibration discussions. You will not participate directly, but you will see your final calibrated rating when the review is delivered.',
      },
    ],
  },
  {
    name: 'For Managers',
    items: [
      {
        question: 'How do I assign goals to my team?',
        answer:
          'Navigate to Goals, click "Create Goal," and select the assignee from your direct reports. You can create individual goals or cascade team/department goals down to individuals. Use the "Align to Parent Goal" feature to link team member goals to your department objectives.',
      },
      {
        question: 'Can I see my team\'s feedback?',
        answer:
          'Yes, you can view feedback for your direct reports in the Team section. You will see both the feedback you have given and feedback received by your team members (subject to anonymity settings). Use the Feedback analytics to identify trends and discussion points for your 1-on-1 meetings.',
      },
      {
        question: 'How do I start a PIP?',
        answer:
          'Navigate to PIPs and click "Create PIP." Select the employee, define the performance gaps, set improvement targets, and establish a timeline. Before initiating a PIP, it is recommended to consult with your HR business partner to ensure proper documentation and process compliance.',
      },
      {
        question: 'What is the 9-Box Grid?',
        answer:
          'The 9-Box Grid is a talent assessment tool that plots employees on two axes: Performance (low, medium, high) and Potential (low, medium, high). It helps managers and HR identify high-potential talent, solid performers, and employees who may need additional support. Access it from the Calibration or Analytics section.',
      },
    ],
  },
  {
    name: 'For HR Admins',
    items: [
      {
        question: 'How do I configure rating scales?',
        answer:
          'Navigate to Settings > Organization > Rating Scales. You can define custom rating scales with labels, numerical values, and descriptions. Scales can be applied to competency reviews, goal assessments, and overall performance ratings. Changes to rating scales will apply to future review cycles only.',
      },
      {
        question: 'How do I run reports?',
        answer:
          'Navigate to the Reports section from the admin menu. You can generate reports on review completion rates, rating distributions, goal progress, feedback activity, and more. Reports can be filtered by department, team, time period, and role level. Export to CSV or PDF for offline analysis.',
      },
      {
        question: 'How do I manage succession plans?',
        answer:
          'Navigate to Succession from the admin menu. Create succession plans for critical roles by identifying potential successors, assessing their readiness, and defining development actions. Use the 9-Box Grid data to inform your succession planning decisions. Plans can be shared with relevant stakeholders.',
      },
      {
        question: 'How do I set up review cycles?',
        answer:
          'Navigate to Settings > Review Cycles. Click "Create Cycle" and configure the cycle name, date range, participants, review forms, and workflow stages. You can include self-assessment, manager review, peer feedback, and calibration stages. Set deadlines for each stage and configure automatic reminders.',
      },
    ],
  },
];

const quickActions = [
  { label: 'Go to Goals', path: '/goals', icon: FlagIcon },
  { label: 'Start Self-Assessment', path: '/self-appraisal', icon: ClipboardDocumentCheckIcon },
  { label: 'Give Feedback', path: '/feedback', icon: ChatBubbleLeftRightIcon },
  { label: 'Schedule 1-on-1', path: '/one-on-ones', icon: CalendarDaysIcon },
];

// ── Components ───────────────────────────────────────────────────────────────

function GuideCard({ guide, isExpanded, onToggle }: { guide: Guide; isExpanded: boolean; onToggle: () => void }) {
  const Icon = guide.icon;

  return (
    <div
      className={clsx(
        'bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 transition-all duration-200',
        isExpanded && 'ring-2 ring-primary-500/30'
      )}
    >
      <div className="p-6">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-primary-50 dark:bg-primary-900/30 flex items-center justify-center">
            <Icon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-secondary-900 dark:text-white">{guide.title}</h3>
            <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">{guide.description}</p>
          </div>
        </div>
        <button
          onClick={onToggle}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 transition-colors"
        >
          {isExpanded ? 'Close Guide' : 'Read Guide'}
          <ChevronDownIcon
            className={clsx('h-4 w-4 transition-transform duration-200', isExpanded && 'rotate-180')}
          />
        </button>
      </div>

      {/* Expanded guide content */}
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        <div className="px-6 pb-6 border-t border-secondary-100 dark:border-secondary-700 pt-4">
          <ol className="space-y-3">
            {guide.content.map((step, idx) => (
              <li key={idx} className="flex gap-3 text-sm text-secondary-700 dark:text-secondary-300">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary-100 dark:bg-primary-900/40 text-primary-700 dark:text-primary-300 text-xs font-semibold flex items-center justify-center">
                  {idx + 1}
                </span>
                <span className="pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}

function FAQAccordionItem({ item, isOpen, onToggle }: { item: FAQItem; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className="border-b border-secondary-100 dark:border-secondary-700 last:border-b-0">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between py-4 px-1 text-left group"
      >
        <span className="text-sm font-medium text-secondary-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors">
          {item.question}
        </span>
        <ChevronDownIcon
          className={clsx(
            'h-4 w-4 text-secondary-400 flex-shrink-0 ml-4 transition-transform duration-200',
            isOpen && 'rotate-180'
          )}
        />
      </button>
      <div
        className={clsx(
          'overflow-hidden transition-all duration-300 ease-in-out',
          isOpen ? 'max-h-96 opacity-100 pb-4' : 'max-h-0 opacity-0'
        )}
      >
        <p className="text-sm text-secondary-600 dark:text-secondary-400 leading-relaxed px-1">
          {item.answer}
        </p>
      </div>
    </div>
  );
}

// ── Main Page ────────────────────────────────────────────────────────────────

export function HelpPage() {
  usePageTitle('Help');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGuide, setExpandedGuide] = useState<string | null>(null);
  const [openFAQs, setOpenFAQs] = useState<Set<string>>(new Set());

  // Filter guides based on search
  const filteredGuides = useMemo(() => {
    if (!searchQuery.trim()) return guides;
    const q = searchQuery.toLowerCase();
    return guides.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.description.toLowerCase().includes(q) ||
        g.content.some((c) => c.toLowerCase().includes(q))
    );
  }, [searchQuery]);

  // Filter FAQ categories based on search
  const filteredFAQCategories = useMemo(() => {
    if (!searchQuery.trim()) return faqCategories;
    const q = searchQuery.toLowerCase();
    return faqCategories
      .map((cat) => ({
        ...cat,
        items: cat.items.filter(
          (item) =>
            item.question.toLowerCase().includes(q) ||
            item.answer.toLowerCase().includes(q)
        ),
      }))
      .filter((cat) => cat.items.length > 0);
  }, [searchQuery]);

  const toggleGuide = (id: string) => {
    setExpandedGuide((prev) => (prev === id ? null : id));
  };

  const toggleFAQ = (key: string) => {
    setOpenFAQs((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const hasResults = filteredGuides.length > 0 || filteredFAQCategories.length > 0;

  return (
    <div className="min-h-screen">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-secondary-900 dark:text-white">Help & Knowledge Base</h1>
          <p className="mt-1 text-sm text-secondary-500 dark:text-secondary-400">
            Find answers, explore guides, and learn how to get the most out of PMS.
          </p>
        </div>

        {/* ── Search Bar ──────────────────────────────────────────────── */}
        <div className="relative mb-10">
          <MagnifyingGlassIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-secondary-400" />
          <input
            type="text"
            placeholder="Search guides and frequently asked questions..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-white dark:bg-secondary-800 border border-secondary-200 dark:border-secondary-700 rounded-lg pl-11 pr-4 py-3 w-full text-sm text-secondary-900 dark:text-white placeholder-secondary-400 dark:placeholder-secondary-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 transition-shadow"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-secondary-400 hover:text-secondary-600 dark:hover:text-secondary-300 text-sm"
            >
              Clear
            </button>
          )}
        </div>

        {/* ── No results message ──────────────────────────────────────── */}
        {searchQuery && !hasResults && (
          <div className="text-center py-12">
            <BookOpenIcon className="h-12 w-12 text-secondary-300 dark:text-secondary-600 mx-auto mb-3" />
            <p className="text-secondary-500 dark:text-secondary-400 text-sm">
              No results found for "<span className="font-medium">{searchQuery}</span>". Try a different search term.
            </p>
          </div>
        )}

        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Main Content ────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* ── Quick Guides ────────────────────────────────────────── */}
            {filteredGuides.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <BookOpenIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">Quick Guides</h2>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filteredGuides.map((guide) => (
                    <GuideCard
                      key={guide.id}
                      guide={guide}
                      isExpanded={expandedGuide === guide.id}
                      onToggle={() => toggleGuide(guide.id)}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* ── FAQ Section ─────────────────────────────────────────── */}
            {filteredFAQCategories.length > 0 && (
              <section className="mb-12">
                <div className="flex items-center gap-2 mb-6">
                  <LightBulbIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <h2 className="text-xl font-semibold text-secondary-900 dark:text-white">
                    Frequently Asked Questions
                  </h2>
                </div>
                <div className="space-y-6">
                  {filteredFAQCategories.map((category) => (
                    <div
                      key={category.name}
                      className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6"
                    >
                      <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">
                        {category.name}
                      </h3>
                      <div>
                        {category.items.map((item, idx) => {
                          const key = `${category.name}-${idx}`;
                          return (
                            <FAQAccordionItem
                              key={key}
                              item={item}
                              isOpen={openFAQs.has(key)}
                              onToggle={() => toggleFAQ(key)}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── Quick Actions Sidebar ─────────────────────────────────── */}
          <aside className="lg:w-80 flex-shrink-0">
            <div className="lg:sticky lg:top-8">
              <div className="bg-white dark:bg-secondary-800 rounded-xl shadow-sm border border-secondary-200 dark:border-secondary-700 p-6">
                <h3 className="text-base font-semibold text-secondary-900 dark:text-white mb-4">Quick Actions</h3>
                <div className="space-y-1.5">
                  {quickActions.map((action) => {
                    const Icon = action.icon;
                    return (
                      <Link
                        key={action.path}
                        to={action.path}
                        className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-secondary-700 dark:text-secondary-300 hover:bg-primary-50 dark:hover:bg-primary-900/20 hover:text-primary-700 dark:hover:text-primary-400 transition-colors group"
                      >
                        <Icon className="h-5 w-5 text-secondary-400 group-hover:text-primary-600 dark:group-hover:text-primary-400 transition-colors" />
                        <span className="flex-1">{action.label}</span>
                        <ArrowRightIcon className="h-4 w-4 text-secondary-300 dark:text-secondary-600 group-hover:text-primary-500 transition-colors" />
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* ── Contact Support Card ──────────────────────────────── */}
              <div className="mt-4 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-primary-900/30 dark:to-primary-800/20 rounded-xl border border-primary-200 dark:border-primary-800 p-6">
                <div className="flex items-center gap-3 mb-3">
                  <ShieldCheckIcon className="h-5 w-5 text-primary-600 dark:text-primary-400" />
                  <h3 className="text-sm font-semibold text-primary-900 dark:text-primary-200">Need More Help?</h3>
                </div>
                <p className="text-xs text-primary-700 dark:text-primary-300 leading-relaxed mb-4">
                  If you cannot find an answer to your question, reach out to your HR administrator or contact your organization's support team.
                </p>
                <Link
                  to="/settings"
                  className="inline-flex items-center gap-1.5 text-xs font-medium text-primary-700 dark:text-primary-300 hover:text-primary-800 dark:hover:text-primary-200 transition-colors"
                >
                  Go to Settings
                  <ArrowRightIcon className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
