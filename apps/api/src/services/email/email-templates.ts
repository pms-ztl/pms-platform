/**
 * Email HTML Templates for PMS Platform
 * All templates use consistent branding with PMS primary colors
 */

export const baseLayout = (title: string, content: string): string => `
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

export function licenseCapacityWarningTemplate(
  companyName: string,
  activeCount: number,
  licenseLimit: number,
  percentUsed: number
): string {
  const urgencyColor = percentUsed >= 95 ? '#ef4444' : '#f59e0b';
  const urgencyLabel = percentUsed >= 95 ? 'CRITICAL' : 'WARNING';

  return baseLayout('License Capacity Alert', `
    <h2 style="color: #1e293b; margin-top: 0;">License Capacity ${urgencyLabel}</h2>
    <p>Hello,</p>
    <p>Your organization <strong>${companyName}</strong> is approaching its employee license limit.</p>

    <div class="alert-box">
      <p style="margin: 0; font-weight: 600; color: #92400e;">
        ${percentUsed}% of your licensed seats are in use
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Active Employees</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${activeCount}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">License Limit</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${licenseLimit}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Remaining Seats</td>
        <td style="padding: 10px 0; color: ${urgencyColor}; font-weight: 700; font-size: 15px; text-align: right;">${licenseLimit - activeCount}</td>
      </tr>
    </table>

    <div style="background-color: #e2e8f0; border-radius: 999px; height: 10px; margin: 16px 0;">
      <div style="background: linear-gradient(90deg, ${urgencyColor}, ${urgencyColor}); height: 10px; border-radius: 999px; width: ${Math.min(percentUsed, 100)}%;"></div>
    </div>

    <p style="color: #64748b; font-size: 13px;">To add more employees, consider purchasing additional licenses or archiving inactive employees.</p>
  `);
}

export function licenseLimitReachedTemplate(
  companyName: string,
  activeCount: number,
  licenseLimit: number
): string {
  return baseLayout('License Limit Reached', `
    <h2 style="color: #ef4444; margin-top: 0;">License Limit Reached</h2>
    <p>Hello,</p>
    <p>Your organization <strong>${companyName}</strong> has reached its employee license limit.</p>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
      <p style="margin: 0; font-weight: 600; color: #991b1b;">
        ${activeCount}/${licenseLimit} seats are in use. No more employees can be added.
      </p>
    </div>

    <p><strong>To add new employees, you must either:</strong></p>
    <ol style="color: #334155; line-height: 2;">
      <li>Archive departing or inactive employees to free up seats</li>
      <li>Purchase additional licenses from the platform administrator</li>
    </ol>

    <p style="color: #64748b; font-size: 13px;">Contact your platform administrator for assistance with upgrading your license plan.</p>
  `);
}

export function subscriptionExpiryWarningTemplate(
  companyName: string,
  daysRemaining: number,
  expiryDate: string
): string {
  const urgencyColor = daysRemaining <= 3 ? '#ef4444' : daysRemaining <= 7 ? '#f59e0b' : '#3b82f6';

  return baseLayout('Subscription Expiry Warning', `
    <h2 style="color: #1e293b; margin-top: 0;">Subscription Expiring Soon</h2>
    <p>Hello,</p>
    <p>The PMS subscription for <strong>${companyName}</strong> is expiring soon.</p>

    <div class="alert-box">
      <p style="margin: 0; font-weight: 600; color: #92400e;">
        Your subscription expires in ${daysRemaining} day${daysRemaining !== 1 ? 's' : ''}
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Organization</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${companyName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Expiry Date</td>
        <td style="padding: 10px 0; color: ${urgencyColor}; font-weight: 600; font-size: 13px; text-align: right;">${expiryDate}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Days Remaining</td>
        <td style="padding: 10px 0; color: ${urgencyColor}; font-weight: 700; font-size: 15px; text-align: right;">${daysRemaining}</td>
      </tr>
    </table>

    <p>After expiry, existing employees can continue using the platform, but new employee creation will be disabled.</p>
    <p style="color: #64748b; font-size: 13px;">Please renew your subscription to maintain uninterrupted service.</p>
  `);
}

export function subscriptionExpiredTemplate(
  companyName: string,
  expiredDate: string
): string {
  return baseLayout('Subscription Expired', `
    <h2 style="color: #ef4444; margin-top: 0;">Subscription Expired</h2>
    <p>Hello,</p>
    <p>The PMS subscription for <strong>${companyName}</strong> has expired.</p>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
      <p style="margin: 0; font-weight: 600; color: #991b1b;">
        Your subscription expired on ${expiredDate}
      </p>
    </div>

    <p><strong>What this means:</strong></p>
    <ul style="color: #334155; line-height: 2;">
      <li>Existing employees can still access the platform and their data</li>
      <li>No new employees can be added</li>
      <li>Some admin features may be restricted</li>
    </ul>

    <p>Please contact the platform administrator to renew your subscription and restore full functionality.</p>
  `);
}

export function employeeCredentialsTemplate(
  employeeName: string,
  companyName: string,
  email: string,
  tempPassword: string,
  loginUrl: string
): string {
  return baseLayout('Your PMS Account Credentials', `
    <h2 style="color: #1e293b; margin-top: 0;">Welcome to PMS Platform!</h2>
    <p>Hello ${employeeName},</p>
    <p>Your account has been created for <strong>${companyName}</strong> on the PMS Platform. Use the credentials below to sign in.</p>

    <div class="info-box">
      <p style="margin: 0; font-weight: 600; color: #1e40af;">Your Login Details</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Email</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${email}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Temporary Password</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${tempPassword}</td>
      </tr>
    </table>

    <div class="alert-box">
      <p style="margin: 0; font-size: 13px; color: #92400e;">
        <strong>Important:</strong> Please change your password immediately after your first login.
      </p>
    </div>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${loginUrl}" class="btn">Sign In Now</a>
    </p>
  `);
}

export function welcomeAdminTemplate(
  adminName: string,
  companyName: string,
  loginUrl: string,
  licenseCount: number,
  maxLevel: number
): string {
  return baseLayout('Welcome to PMS Platform', `
    <h2 style="color: #1e293b; margin-top: 0;">Welcome, ${adminName}!</h2>
    <p>Your organization <strong>${companyName}</strong> has been registered on the PMS Platform.</p>

    <div class="success-box">
      <p style="margin: 0; font-weight: 600; color: #166534;">Your account is ready!</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Organization</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${companyName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Licensed Seats</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${licenseCount}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Max Org Level</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">L${maxLevel}</td>
      </tr>
    </table>

    <p><strong>Next steps:</strong></p>
    <ol style="color: #334155; line-height: 2;">
      <li>Assign a designated manager to upload employee data</li>
      <li>Configure your departments and organizational structure</li>
      <li>Have your manager upload the employee Excel sheet</li>
    </ol>

    <p style="text-align: center; margin-top: 24px;">
      <a href="${loginUrl}" class="btn">Get Started</a>
    </p>
  `);
}

export function managerAssignmentTemplate(
  managerName: string,
  companyName: string,
  adminName: string
): string {
  return baseLayout('Manager Assignment', `
    <h2 style="color: #1e293b; margin-top: 0;">You have been assigned as Designated Manager</h2>
    <p>Hello ${managerName},</p>
    <p>You have been designated by <strong>${adminName}</strong> as the authorized person to manage employee data for <strong>${companyName}</strong>.</p>

    <div class="info-box">
      <p style="margin: 0; font-weight: 600; color: #1e40af;">Your Responsibilities</p>
    </div>

    <ul style="color: #334155; line-height: 2;">
      <li>Upload employee data via Excel sheet</li>
      <li>Create, update, and archive employee accounts</li>
      <li>Monitor license usage and capacity</li>
      <li>Ensure employee information is accurate and up to date</li>
    </ul>

    <p style="color: #64748b; font-size: 13px;">If you believe this assignment was made in error, please contact your organization admin.</p>
  `);
}

export function uploadSuccessTemplate(
  managerName: string,
  companyName: string,
  totalRows: number,
  successCount: number,
  fileName: string
): string {
  return baseLayout('Excel Upload Successful', `
    <h2 style="color: #1e293b; margin-top: 0;">Upload Completed Successfully</h2>
    <p>Hello ${managerName},</p>

    <div class="success-box">
      <p style="margin: 0; font-weight: 600; color: #166534;">
        ${successCount} employee accounts have been created!
      </p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">File</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${fileName}</td>
      </tr>
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Total Rows</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${totalRows}</td>
      </tr>
      <tr>
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Accounts Created</td>
        <td style="padding: 10px 0; color: #22c55e; font-weight: 600; font-size: 13px; text-align: right;">${successCount}</td>
      </tr>
    </table>

    <p style="color: #64748b; font-size: 13px;">Login credentials have been sent to each employee via email. You can view the upload history in your dashboard.</p>
  `);
}

export function uploadFailureTemplate(
  managerName: string,
  fileName: string,
  errorCount: number,
  errorSummary: string
): string {
  return baseLayout('Excel Upload Failed', `
    <h2 style="color: #ef4444; margin-top: 0;">Upload Validation Failed</h2>
    <p>Hello ${managerName},</p>
    <p>The uploaded file <strong>${fileName}</strong> failed validation. No accounts were created.</p>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
      <p style="margin: 0; font-weight: 600; color: #991b1b;">
        ${errorCount} validation error${errorCount !== 1 ? 's' : ''} found
      </p>
    </div>

    <div style="background-color: #f8fafc; border-radius: 8px; padding: 16px; margin: 16px 0; border: 1px solid #e2e8f0; font-family: monospace; font-size: 12px; white-space: pre-line; color: #334155;">
${errorSummary}
    </div>

    <p>Please fix the errors listed above and re-upload the corrected file.</p>
  `);
}

export function securityAlertTemplate(
  recipientName: string,
  alertType: string,
  description: string,
  details: string,
  timestamp: string
): string {
  return baseLayout('Security Alert', `
    <h2 style="color: #ef4444; margin-top: 0;">Security Alert</h2>
    <p>Hello ${recipientName},</p>

    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 16px; border-radius: 0 8px 8px 0; margin: 16px 0;">
      <p style="margin: 0; font-weight: 600; color: #991b1b;">${alertType}</p>
      <p style="margin: 4px 0 0 0; color: #991b1b; font-size: 14px;">${description}</p>
    </div>

    <table style="width: 100%; border-collapse: collapse; margin: 16px 0;">
      <tr style="border-bottom: 1px solid #f1f5f9;">
        <td style="padding: 10px 0; color: #64748b; font-size: 13px;">Time</td>
        <td style="padding: 10px 0; color: #1e293b; font-weight: 600; font-size: 13px; text-align: right;">${timestamp}</td>
      </tr>
      <tr>
        <td colspan="2" style="padding: 10px 0; color: #334155; font-size: 13px;">${details}</td>
      </tr>
    </table>

    <p style="color: #64748b; font-size: 13px;">If this activity was authorized, you can safely ignore this alert. Otherwise, please take immediate action to secure your account.</p>
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
