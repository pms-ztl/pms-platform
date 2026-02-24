/**
 * Employee Performance Card - CPIS Edition
 *
 * Premium infographic card powered by the Comprehensive Performance
 * Intelligence Score (CPIS) — an 8-dimension, ML-fair scoring system.
 * Exports to high-resolution PDF and JPG.
 */

import { useState, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import {
  DocumentArrowDownIcon,
  PhotoIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

import { performanceMathApi, getAvatarUrl } from '@/lib/api';
import { useAuthStore } from '@/store/auth';

interface EmployeeCardProps {
  userId?: string;
  onClose?: () => void;
}

// ── SVG Helpers ──────────────────────────────────────────────────────────────

/** Circular progress ring with percentage */
function Ring({
  value, label, color, size = 64,
}: {
  value: number; label: string; color: string; size?: number;
}) {
  const r = (size - 8) / 2;
  const circ = 2 * Math.PI * r;
  const progress = Math.max(0, Math.min(100, value));
  const offset = circ - (progress / 100) * circ;

  return (
    <div style={{ textAlign: 'center' }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e8ecf1" strokeWidth="5" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none"
          stroke={color} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x={size / 2} y={size / 2 - 1} textAnchor="middle" dominantBaseline="central"
          style={{ fontSize: size > 60 ? '15px' : '12px', fontWeight: 700, fill: '#1e293b' }}>
          {Math.round(value)}%
        </text>
      </svg>
      {label && (
        <p style={{
          fontSize: '9px', fontWeight: 600, color: '#64748b',
          marginTop: '2px', letterSpacing: '0.06em',
        }}>{label}</p>
      )}
    </div>
  );
}

/** Horizontal bar with label, weight badge, and color-coded value */
function Bar({ label, weight, value, color }: {
  label: string; weight: string; value: number; color: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
      <span style={{ fontSize: '10px', fontWeight: 600, color: '#475569', width: '110px', flexShrink: 0 }}>
        {label}
      </span>
      <span style={{
        fontSize: '8px', fontWeight: 700, color: '#94a3b8',
        background: '#f1f5f9', borderRadius: '3px', padding: '1px 5px',
        flexShrink: 0,
      }}>
        {weight}
      </span>
      <div style={{ flex: 1, height: '7px', background: '#e8ecf1', borderRadius: '4px', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: '4px', background: color, width: `${Math.min(100, value)}%` }} />
      </div>
      <span style={{ fontSize: '10px', fontWeight: 700, color, width: '28px', textAlign: 'right', flexShrink: 0 }}>
        {Math.round(value)}
      </span>
    </div>
  );
}

/** Grade badge */
function Grade({ grade, size = 'sm' }: { grade: string; size?: 'sm' | 'lg' }) {
  const colors: Record<string, { bg: string; fg: string }> = {
    'A+': { bg: '#dcfce7', fg: '#15803d' },
    'A': { bg: '#d1fae5', fg: '#047857' },
    'B+': { bg: '#dbeafe', fg: '#1d4ed8' },
    'B': { bg: '#e0e7ff', fg: '#4338ca' },
    'C+': { bg: '#fef3c7', fg: '#b45309' },
    'C': { bg: '#fef9c3', fg: '#a16207' },
    'D': { bg: '#fee2e2', fg: '#b91c1c' },
    'F': { bg: '#fecaca', fg: '#991b1b' },
  };
  const c = colors[grade] || colors['C'];
  const s = size === 'lg' ? { fontSize: '14px', padding: '3px 10px' } : { fontSize: '9px', padding: '2px 6px' };

  return (
    <span style={{
      ...s, fontWeight: 800, borderRadius: '4px',
      background: c.bg, color: c.fg, letterSpacing: '0.03em',
    }}>
      {grade}
    </span>
  );
}

/** Star rating display */
function Stars({ count, max = 5 }: { count: number; max?: number }) {
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {Array.from({ length: max }, (_, i) => (
        <svg key={i} width="14" height="14" viewBox="0 0 24 24"
          fill={i < count ? '#f59e0b' : '#e2e8f0'} stroke="none">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
        </svg>
      ))}
    </div>
  );
}

// ── Dimension colors ─────────────────────────────────────────────────────────

const DIM_COLORS: Record<string, string> = {
  GAI: '#3b82f6', // Blue
  RQS: '#8b5cf6', // Purple
  FSI: '#10b981', // Green
  CIS: '#f59e0b', // Amber
  CRI: '#06b6d4', // Cyan
  GTS: '#ec4899', // Pink
  EQS: '#f97316', // Orange
  III: '#6366f1', // Indigo
};

// ── Main Component ───────────────────────────────────────────────────────────

export function EmployeeCard({ userId, onClose }: EmployeeCardProps) {
  const { user: currentUser } = useAuthStore();
  const targetUserId = userId || currentUser?.id;
  const cardRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'jpg'>('pdf');

  const user = currentUser; // For header display

  // Fetch CPIS data from the API
  const { data: cpisData, isLoading } = useQuery({
    queryKey: ['cpis', targetUserId],
    queryFn: () => performanceMathApi.getCPIS(targetUserId!),
    enabled: !!targetUserId,
    staleTime: 60_000,
    retry: 1,
  });

  const cpis = cpisData?.data || cpisData;

  const handleExport = async (format: 'pdf' | 'jpg') => {
    if (!cardRef.current) return;
    setIsExporting(true);
    setExportFormat(format);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3, backgroundColor: '#ffffff', useCORS: true, logging: false,
      });
      if (format === 'jpg') {
        const link = document.createElement('a');
        link.download = `${user?.firstName}-${user?.lastName}-Performance-Card.jpg`;
        link.href = canvas.toDataURL('image/jpeg', 0.95);
        link.click();
      } else {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jsPDF({
          orientation: 'landscape', unit: 'px',
          format: [canvas.width / 3, canvas.height / 3],
        });
        pdf.addImage(imgData, 'PNG', 0, 0, canvas.width / 3, canvas.height / 3);
        pdf.save(`${user?.firstName}-${user?.lastName}-Performance-Card.pdf`);
      }
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  if (!user) return null;
  const avatarSrc = getAvatarUrl(user.avatarUrl, 'lg') || user.avatarUrl;

  // Use CPIS data or fall back to defaults while loading
  const score = cpis?.score ?? 0;
  const grade = cpis?.grade ?? 'C';
  const starRating = cpis?.starRating ?? 3;
  const rankLabel = cpis?.rankLabel ?? 'Loading...';
  const dimensions: any[] = cpis?.dimensions ?? [];
  const fairness = cpis?.fairness;
  const confidence = cpis?.confidence;
  const trajectory = cpis?.trajectory;
  const strengths: string[] = cpis?.strengths ?? [];
  const growthAreas: string[] = cpis?.growthAreas ?? [];
  const metadata = cpis?.metadata;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Export buttons */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <h2 className="text-xl font-bold text-secondary-900 dark:text-white flex items-center gap-2">
          <IdentificationIcon className="h-6 w-6 text-primary-500" />
          Employee Performance Card
        </h2>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleExport('jpg')} disabled={isExporting}
            className="btn-secondary text-sm flex items-center gap-2">
            <PhotoIcon className="h-4 w-4" />
            {isExporting && exportFormat === 'jpg' ? 'Exporting...' : 'Download JPG'}
          </button>
          <button onClick={() => handleExport('pdf')} disabled={isExporting}
            className="btn-primary text-sm flex items-center gap-2">
            <DocumentArrowDownIcon className="h-4 w-4" />
            {isExporting && exportFormat === 'pdf' ? 'Exporting...' : 'Download PDF'}
          </button>
        </div>
      </div>

      {isLoading && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '200px' }}>
          <div style={{
            width: '32px', height: '32px', border: '3px solid #e5e7eb',
            borderTopColor: '#6366f1', borderRadius: '50%',
            animation: 'spin 1s linear infinite',
          }} />
        </div>
      )}

      {/* ─── THE CARD ─── */}
      <div
        ref={cardRef}
        style={{
          width: '960px',
          background: '#ffffff',
          borderRadius: '16px',
          overflow: 'hidden',
          fontFamily: "'Inter', 'Segoe UI', system-ui, sans-serif",
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: '1px solid #e8ecf1',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          position: 'relative', height: '130px',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 40%, #334155 100%)',
          overflow: 'hidden',
        }}>
          {/* Subtle geometric decoration */}
          <svg style={{ position: 'absolute', right: 0, top: 0, opacity: 0.06 }} width="300" height="130" viewBox="0 0 300 130">
            <circle cx="250" cy="10" r="80" fill="white" />
            <circle cx="180" cy="110" r="50" fill="white" />
            <circle cx="300" cy="100" r="60" fill="white" />
          </svg>

          <div style={{
            position: 'relative', height: '100%',
            display: 'flex', alignItems: 'center', padding: '0 32px', gap: '20px',
          }}>
            {/* Avatar */}
            <div style={{
              width: '80px', height: '80px', borderRadius: '50%',
              border: '3px solid rgba(255,255,255,0.8)',
              boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
              overflow: 'hidden', flexShrink: 0, background: '#334155',
            }}>
              {avatarSrc ? (
                <img src={avatarSrc} alt={user.firstName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  crossOrigin="anonymous" />
              ) : (
                <div style={{
                  width: '100%', height: '100%',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                }}>
                  <span style={{ fontSize: '28px', fontWeight: 700, color: '#fff' }}>
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
              )}
            </div>

            {/* Name block */}
            <div style={{ flex: 1 }}>
              <h2 style={{
                fontSize: '22px', fontWeight: 800, color: '#ffffff',
                margin: 0, letterSpacing: '-0.02em',
              }}>
                {user.firstName} {user.lastName}
              </h2>
              <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', margin: '3px 0 0', fontWeight: 500 }}>
                {user.jobTitle || 'Employee'}{cpis?.tenureYears ? ` \u00b7 ${cpis.tenureYears} yrs tenure` : ''}
              </p>
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', margin: '4px 0 0' }}>
                Report: {format(new Date(), 'MMMM d, yyyy')}
              </p>
            </div>

            {/* CPIS Score block */}
            <div style={{ textAlign: 'center', flexShrink: 0 }}>
              <div style={{ position: 'relative', width: '80px', height: '80px' }}>
                <svg width="80" height="80" viewBox="0 0 80 80">
                  <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="5" />
                  <circle cx="40" cy="40" r="33" fill="none"
                    stroke="#10b981" strokeWidth="5" strokeLinecap="round"
                    strokeDasharray={`${(score / 100) * 207.3} 207.3`}
                    transform="rotate(-90 40 40)" />
                  <text x="40" y="36" textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize: '22px', fontWeight: 800, fill: '#ffffff' }}>
                    {Math.round(score)}
                  </text>
                  <text x="40" y="52" textAnchor="middle" dominantBaseline="central"
                    style={{ fontSize: '7px', fontWeight: 600, fill: 'rgba(255,255,255,0.5)', letterSpacing: '0.1em' }}>
                    CPIS
                  </text>
                </svg>
              </div>
            </div>

            {/* Grade + Stars + Rank */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{ marginBottom: '6px' }}>
                <Grade grade={grade} size="lg" />
              </div>
              <Stars count={starRating} />
              <p style={{ fontSize: '10px', color: 'rgba(255,255,255,0.6)', fontWeight: 600, marginTop: '4px' }}>
                {rankLabel}
              </p>
            </div>
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '20px 32px 24px' }}>
          {/* Row 1: Quick stats strip */}
          <div style={{ display: 'flex', gap: '12px', marginBottom: '18px' }}>
            {/* Confidence */}
            <div style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: '#f8fafc', border: '1px solid #e8ecf1',
            }}>
              <p style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '2px' }}>
                Confidence
              </p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                {confidence ? `${Math.round(confidence.level * 100)}%` : '--'}
              </p>
              <p style={{ fontSize: '8px', color: '#94a3b8' }}>
                {confidence ? `${confidence.lowerBound}\u2013${confidence.upperBound} range` : ''}
              </p>
            </div>
            {/* Trajectory */}
            <div style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: '#f8fafc', border: '1px solid #e8ecf1',
            }}>
              <p style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '2px' }}>
                Trajectory
              </p>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span style={{
                  fontSize: '16px', fontWeight: 800,
                  color: trajectory?.direction === 'improving' ? '#10b981' : trajectory?.direction === 'declining' ? '#ef4444' : '#64748b',
                }}>
                  {trajectory?.direction === 'improving' ? '\u2191' : trajectory?.direction === 'declining' ? '\u2193' : '\u2192'}
                </span>
                <span style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', textTransform: 'capitalize' }}>
                  {trajectory?.direction || 'Stable'}
                </span>
              </div>
              <p style={{ fontSize: '8px', color: '#94a3b8' }}>
                {trajectory?.slope ? `slope: ${trajectory.slope > 0 ? '+' : ''}${trajectory.slope}` : ''}
              </p>
            </div>
            {/* Fairness */}
            <div style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: fairness?.biasDetected ? '#fef3c7' : '#f0fdf4',
              border: `1px solid ${fairness?.biasDetected ? '#fcd34d' : '#bbf7d0'}`,
            }}>
              <p style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '2px' }}>
                ML Fairness
              </p>
              <p style={{ fontSize: '12px', fontWeight: 700, color: fairness?.biasDetected ? '#b45309' : '#15803d' }}>
                {fairness?.biasDetected ? 'Bias Detected' : 'Fair Score'}
              </p>
              <p style={{ fontSize: '8px', color: '#94a3b8' }}>
                {fairness ? `DI ratio: ${fairness.disparateImpactRatio}` : ''}
                {fairness?.adjustmentApplied ? ` | adj: ${fairness.adjustmentApplied > 0 ? '+' : ''}${fairness.adjustmentApplied}` : ''}
              </p>
            </div>
            {/* Data points */}
            <div style={{
              flex: 1, padding: '8px 12px', borderRadius: '8px',
              background: '#f8fafc', border: '1px solid #e8ecf1',
            }}>
              <p style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', letterSpacing: '0.08em', marginBottom: '2px' }}>
                Data Points
              </p>
              <p style={{ fontSize: '16px', fontWeight: 800, color: '#1e293b' }}>
                {metadata ? (metadata.goalsAnalyzed + metadata.reviewsAnalyzed + metadata.feedbackAnalyzed + metadata.evidenceAnalyzed) : confidence?.dataPoints ?? '--'}
              </p>
              <p style={{ fontSize: '8px', color: '#94a3b8' }}>
                {metadata ? `${metadata.goalsAnalyzed}G ${metadata.reviewsAnalyzed}R ${metadata.feedbackAnalyzed}F ${metadata.evidenceAnalyzed}E` : ''}
              </p>
            </div>
          </div>

          {/* Row 2: 8 Dimension Rings */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)',
            gap: '4px', marginBottom: '18px',
            padding: '12px 8px',
            background: '#fafbfc', borderRadius: '10px', border: '1px solid #f1f5f9',
          }}>
            {dimensions.length > 0 ? dimensions.map((d: any) => (
              <div key={d.code} style={{ textAlign: 'center' }}>
                <Ring value={d.rawScore} label="" color={DIM_COLORS[d.code] || '#6366f1'} size={56} />
                <div style={{ display: 'flex', justifyContent: 'center', gap: '3px', alignItems: 'center', marginTop: '2px' }}>
                  <Grade grade={d.grade} />
                </div>
                <p style={{ fontSize: '8px', fontWeight: 600, color: '#475569', marginTop: '2px' }}>
                  {d.code}
                </p>
                <p style={{ fontSize: '7px', color: '#94a3b8', lineHeight: 1.2 }}>
                  {d.name}
                </p>
              </div>
            )) : (
              ['GAI', 'RQS', 'FSI', 'CIS', 'CRI', 'GTS', 'EQS', 'III'].map(code => (
                <div key={code} style={{ textAlign: 'center' }}>
                  <Ring value={0} label="" color={DIM_COLORS[code] || '#ccc'} size={56} />
                  <p style={{ fontSize: '8px', fontWeight: 600, color: '#94a3b8', marginTop: '4px' }}>{code}</p>
                </div>
              ))
            )}
          </div>

          {/* Row 3: Weighted breakdown + Strengths/Growth */}
          <div style={{ display: 'flex', gap: '16px', marginBottom: '16px' }}>
            {/* Left: Weighted bars */}
            <div style={{
              flex: 3, padding: '12px 16px',
              background: '#fafbfc', borderRadius: '10px', border: '1px solid #f1f5f9',
            }}>
              <p style={{
                fontSize: '9px', fontWeight: 700, color: '#94a3b8',
                letterSpacing: '0.1em', marginBottom: '8px',
              }}>
                Dimension Weights & Scores
              </p>
              {dimensions.length > 0 ? dimensions.map((d: any) => (
                <Bar
                  key={d.code}
                  label={d.name}
                  weight={`${Math.round(d.weight * 100)}%`}
                  value={d.rawScore}
                  color={DIM_COLORS[d.code] || '#6366f1'}
                />
              )) : (
                [
                  { name: 'Goal Attainment', code: 'GAI', weight: 0.25 },
                  { name: 'Review Quality', code: 'RQS', weight: 0.20 },
                  { name: 'Feedback Sentiment', code: 'FSI', weight: 0.12 },
                  { name: 'Collaboration', code: 'CIS', weight: 0.10 },
                  { name: 'Consistency', code: 'CRI', weight: 0.10 },
                  { name: 'Growth Trajectory', code: 'GTS', weight: 0.08 },
                  { name: 'Evidence Quality', code: 'EQS', weight: 0.08 },
                  { name: 'Initiative', code: 'III', weight: 0.07 },
                ].map(d => (
                  <Bar key={d.code} label={d.name} weight={`${Math.round(d.weight * 100)}%`} value={0} color={DIM_COLORS[d.code]} />
                ))
              )}
            </div>

            {/* Right: Strengths & Growth Areas */}
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {/* Strengths */}
              <div style={{
                flex: 1, padding: '10px 14px',
                background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0',
              }}>
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#15803d', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Top Strengths
                </p>
                {strengths.length > 0 ? strengths.map((s: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="#10b981" stroke="none">
                      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                    </svg>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#1e293b' }}>{s}</span>
                  </div>
                )) : (
                  <p style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</p>
                )}
              </div>

              {/* Growth areas */}
              <div style={{
                flex: 1, padding: '10px 14px',
                background: '#fefce8', borderRadius: '10px', border: '1px solid #fde68a',
              }}>
                <p style={{ fontSize: '9px', fontWeight: 700, color: '#a16207', letterSpacing: '0.08em', marginBottom: '6px' }}>
                  Growth Areas
                </p>
                {growthAreas.length > 0 ? growthAreas.map((g: string, i: number) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span style={{ fontSize: '10px', fontWeight: 600, color: '#1e293b' }}>{g}</span>
                  </div>
                )) : (
                  <p style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>Loading...</p>
                )}
              </div>

              {/* Fairness flags */}
              {fairness?.reviewerBiasFlags?.length > 0 && (
                <div style={{
                  padding: '8px 12px', background: '#fef3c7', borderRadius: '8px',
                  border: '1px solid #fcd34d',
                }}>
                  <p style={{ fontSize: '8px', fontWeight: 700, color: '#b45309', marginBottom: '4px' }}>
                    Fairness Notes
                  </p>
                  {fairness.reviewerBiasFlags.map((flag: string, i: number) => (
                    <p key={i} style={{ fontSize: '9px', color: '#92400e', marginBottom: '2px' }}>
                      &bull; {flag}
                    </p>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 4: Sub-metric details for top 3 dimensions */}
          {dimensions.length > 0 && (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
              gap: '10px', marginBottom: '16px',
            }}>
              {dimensions.slice(0, 3).map((d: any) => (
                <div key={d.code} style={{
                  padding: '10px 12px', borderRadius: '8px',
                  background: '#fafbfc', border: '1px solid #f1f5f9',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                    <p style={{ fontSize: '9px', fontWeight: 700, color: DIM_COLORS[d.code] }}>
                      {d.name}
                    </p>
                    <Grade grade={d.grade} />
                  </div>
                  {Object.entries(d.subMetrics || {}).slice(0, 5).map(([key, val]) => (
                    <div key={key} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <span style={{ fontSize: '9px', color: '#64748b' }}>
                        {key.replace(/([A-Z])/g, ' $1').replace(/^./, (s: string) => s.toUpperCase())}
                      </span>
                      <span style={{ fontSize: '9px', fontWeight: 700, color: '#1e293b' }}>
                        {typeof val === 'number' ? Math.round(val as number) : String(val)}
                      </span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}

          {/* Footer */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            paddingTop: '12px', borderTop: '1px solid #f1f5f9',
          }}>
            <p style={{
              fontSize: '7px', color: '#94a3b8', fontWeight: 500,
              fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
              maxWidth: '70%', lineHeight: 1.4,
            }}>
              CPIS = {'\u03A3'}(D{'\u1D62'}{'\u00D7'}W{'\u1D62'}) {'\u00D7'} TF {'\u00D7'} CF | D: GAI(.25) RQS(.20) FSI(.12) CIS(.10) CRI(.10) GTS(.08) EQS(.08) III(.07) | ML Fairness: Bayesian + Disparate Impact (4/5ths rule)
            </p>
            <p style={{ fontSize: '8px', color: '#cbd5e1', fontWeight: 600, letterSpacing: '0.05em' }}>
              PMS PLATFORM
            </p>
          </div>
        </div>
      </div>

      {/* Formula explanation (outside card, in dark mode context) */}
      <div className="bg-secondary-50 dark:bg-secondary-800 rounded-lg p-4">
        <h4 className="font-semibold text-secondary-900 dark:text-white mb-2">
          Comprehensive Performance Intelligence Score (CPIS)
        </h4>
        <p className="text-sm text-secondary-600 dark:text-secondary-400 mb-2">
          CPIS uses an 8-dimension weighted scoring model with ML fairness corrections:
        </p>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-blue-500">GAI (25%)</strong> Goal Attainment Index
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-purple-500">RQS (20%)</strong> Review Quality Score
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-green-500">FSI (12%)</strong> Feedback Sentiment Index
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-amber-500">CIS (10%)</strong> Collaboration Impact Score
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-cyan-500">CRI (10%)</strong> Consistency & Reliability
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-pink-500">GTS (8%)</strong> Growth Trajectory Score
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-orange-500">EQS (8%)</strong> Evidence Quality Score
          </p>
          <p className="text-sm text-secondary-600 dark:text-secondary-400">
            <strong className="text-indigo-500">III (7%)</strong> Initiative & Innovation Index
          </p>
        </div>
        <p className="text-xs text-secondary-500 dark:text-secondary-500 mt-3">
          ML Fairness: Bayesian smoothing for low-data employees, Disparate Impact (4/5ths rule) analysis, reviewer bias detection via Z-score calibration.
          Confidence intervals computed from data volume. Tenure factor (max +10%) rewards experience.
        </p>
      </div>

      {onClose && (
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} className="btn-secondary">Close</button>
        </div>
      )}
    </div>
  );
}

export default EmployeeCard;
