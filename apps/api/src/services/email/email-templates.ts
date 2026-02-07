/**
 * Email HTML Templates for PMS Platform
 * All templates use consistent branding with PMS primary colors
 */

const baseLayout = (title: string, content: string): string => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f8fafc; }
    .container { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #2563eb, #06b6d4); padding: 32px 24px; text-align: center; }
    .header h1 { color: #ffffff; font-size: 24px; margin: 0; font-weight: 700; }
    .header p { color: rgba(255,255,255,0.85); font-size: 14px; margin-top: 8px; }
    .body { padding: 32px 24px; color: #334155; line-height: 1.6; }
    .footer { padding: 24px; background-color: #f1f5f9; text-align: center; border-top: 1px solid #e2e8f0; }
    .footer p { color: #94a3b8; font-size: 12px; margin: 0; }
    .btn { display: inline-block; background: linear-gradient(135deg, #2563eb, #06b6d4); color: #ffffff; padding: 12px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 14px; }
    .code { background-color: #f1f5f9; border: 2px dashed #cbd5e1; padding: 16px 24px; text-align: center; font-size: 32px; font-weight: 700; letter-spacing: 6px; color: #1e293b; border-radius: 8px; margin: 16px 0; }
    .alert-box { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .success-box { background-color: #dcfce7; border-left: 4px solid #22c55e; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .info-box { background-color: #dbeafe; border-left: 4px solid #3b82f6; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0; }
    .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f1f5f9; }
    .detail-label { color: #64748b; font-size: 13px; }
    .detail-value { color: #1e293b; font-weight: 600; font-size: 13px; }
  </style>
</head>
<body>
  <div style="padding: 24px;">
    <div class="container">
      <div class="header">
        <h1>PMS Platform</h1>
        <p>${title}</p>
      </div>
      <div class="body">
        ${content}
      </div>
      <div class="footer">
        <p>This is an automated message from PMS Platform. Please do not reply to this email.</p>
        <p style="margin-top: 8px;">&copy; ${new Date().getFullYear()} PMS Platform. All rights reserved.</p>
      </div>
    </div>
  </div>
</body>
</html>
`;

export function loginAlertTemplate(
  userName: string,
  email: string,
  loginTime: string,
  ipAddress?: string,
  userAgent?: string
): string {
  return baseLayout('Login Alert', `
    <h2 style="color: #1e293b; margin-top: 0;">New Login Detected</h2>
    <p>Hello ${userName},</p>
    <p>A new sign-in to your PMS Platform account was detected.</p>

    <div class="info-box">
      <p style="margin: 0; font-weight: 600; color: #1e40af;">Login Details</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">User</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${userName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Email</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${email}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Time</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${loginTime}</td>
      </tr>
      ${ipAddress ? `
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">IP Address</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${ipAddress}</td>
      </tr>` : ''}
      ${userAgent ? `
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Browser</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${userAgent.substring(0, 60)}...</td>
      </tr>` : ''}
    </table>

    <p style="color: #64748b; font-size: 13px;">If this login was not authorized, please take immediate action to secure the account.</p>
  `);
}

export function passwordResetTemplate(
  userName: string,
  resetToken: string
): string {
  return baseLayout('Password Reset', `
    <h2 style="color: #1e293b; margin-top: 0;">Password Reset Request</h2>
    <p>Hello ${userName},</p>
    <p>We received a request to reset your password. Use the code below to complete the process:</p>

    <div class="code" style="font-size: 18px; letter-spacing: 2px; word-break: break-all;">${resetToken}</div>

    <div class="alert-box">
      <p style="margin: 0; font-size: 13px; color: #92400e;">
        <strong>Important:</strong> This code expires in 1 hour. If you did not request a password reset, please ignore this email.
      </p>
    </div>

    <p style="color: #64748b; font-size: 13px;">For security reasons, never share this code with anyone.</p>
  `);
}

export function goalReminderTemplate(
  userName: string,
  goalTitle: string,
  daysRemaining: number,
  progress: number,
  dueDate: string
): string {
  const urgencyColor = daysRemaining <= 1 ? '#ef4444' : daysRemaining <= 3 ? '#f59e0b' : '#3b82f6';
  const urgencyText = daysRemaining <= 1 ? 'URGENT' : daysRemaining <= 3 ? 'Due Soon' : 'Upcoming';

  return baseLayout('Goal Deadline Reminder', `
    <h2 style="color: #1e293b; margin-top: 0;">Goal Deadline Approaching</h2>
    <p>Hello ${userName},</p>
    <p>Your goal is approaching its deadline. Here are the details:</p>

    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
        <h3 style="color: #1e293b; margin: 0; font-size: 16px;">${goalTitle}</h3>
        <span style="background-color: ${urgencyColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 11px; font-weight: 600;">${urgencyText}</span>
      </div>

      <div style="background-color: #e2e8f0; border-radius: 999px; height: 8px; margin: 12px 0;">
        <div style="background: linear-gradient(90deg, #2563eb, #06b6d4); height: 8px; border-radius: 999px; width: ${progress}%;"></div>
      </div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Progress</td>
          <td style="padding: 6px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${progress}%</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Due Date</td>
          <td style="padding: 6px 0; color: ${urgencyColor}; font-weight: 600; font-size: 13px; text-align: right;">${dueDate}</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Days Remaining</td>
          <td style="padding: 6px 0; color: ${urgencyColor}; font-weight: 700; font-size: 15px; text-align: right;">${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="#" class="btn">View Goal</a>
    </p>
  `);
}

export function taskCompletionTemplate(
  userName: string,
  goalTitle: string,
  completedAt: string
): string {
  return baseLayout('Goal Completed', `
    <h2 style="color: #1e293b; margin-top: 0;">Goal Completed! 🎉</h2>
    <p>Hello ${userName},</p>

    <div class="success-box">
      <p style="margin: 0; font-weight: 600; color: #166534;">Congratulations!</p>
      <p style="margin: 4px 0 0 0; color: #166534; font-size: 14px;">Your goal has been marked as completed.</p>
    </div>

    <div style="background-color: #f8fafc; border-radius: 8px; padding: 20px; margin: 16px 0; border: 1px solid #e2e8f0;">
      <h3 style="color: #1e293b; margin: 0 0 8px 0; font-size: 16px;">${goalTitle}</h3>

      <div style="background-color: #22c55e; border-radius: 999px; height: 8px; margin: 12px 0;"></div>

      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Status</td>
          <td style="padding: 6px 0; color: #22c55e; font-weight: 600; font-size: 13px; text-align: right;">✅ Completed</td>
        </tr>
        <tr>
          <td style="padding: 6px 0; color: #64748b; font-size: 13px;">Completed On</td>
          <td style="padding: 6px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${completedAt}</td>
        </tr>
      </table>
    </div>

    <p style="color: #64748b; font-size: 14px;">Keep up the great work! Check your dashboard for other active goals.</p>
  `);
}

export function reviewAssignmentTemplate(
  userName: string,
  revieweeName: string,
  cycleName: string,
  dueDate: string
): string {
  return baseLayout('New Review Assignment', `
    <h2 style="color: #1e293b; margin-top: 0;">New Review Assignment</h2>
    <p>Hello ${userName},</p>
    <p>You have been assigned a new performance review to complete.</p>

    <div class="info-box">
      <p style="margin: 0; font-weight: 600; color: #1e40af;">Review Details</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Review For</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${revieweeName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Cycle</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${cycleName}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Due Date</td>
        <td style="padding: 10px 0; color: #f59e0b; font-weight: 600; font-size: 13px; text-align: right;">${dueDate}</td>
      </tr>
    </table>

    <p style="text-align: center; margin-top: 24px;">
      <a href="#" class="btn">Start Review</a>
    </p>
  `);
}
