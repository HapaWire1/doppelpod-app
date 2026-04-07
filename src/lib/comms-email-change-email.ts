export function buildCommsEmailChangeEmail(
  newEmail: string,
  confirmUrl: string,
  cancelUrl: string
): { subject: string; html: string } {
  const subject = "Confirm your new communications email — DoppelPod";

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0a0a;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0a0a;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="560" cellpadding="0" cellspacing="0" style="background-color:#111111;border-radius:12px;border:1px solid #1f1f1f;overflow:hidden;max-width:560px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#7c3aed,#db2777);padding:32px 40px;text-align:center;">
              <h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:700;letter-spacing:-0.5px;">DoppelPod</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">Communications Email Change Request</p>
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding:36px 40px;">
              <p style="margin:0 0 20px;color:#e5e5e5;font-size:15px;line-height:1.6;">
                We received a request to change where DoppelPod sends your notifications and communications.
              </p>

              <!-- What's changing box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#1a1a2e;border:1px solid #7c3aed33;border-radius:8px;margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#a78bfa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">What is changing</p>
                    <p style="margin:0 0 16px;color:#e5e5e5;font-size:14px;">Your <strong>communications email</strong> — where we send video notifications, billing updates, and other messages.</p>
                    <p style="margin:0 0 4px;color:#a78bfa;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">New communications email</p>
                    <p style="margin:0;color:#ffffff;font-size:15px;font-weight:600;">${newEmail}</p>
                  </td>
                </tr>
              </table>

              <!-- What's NOT changing box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1a0f;border:1px solid #16a34a33;border-radius:8px;margin-bottom:28px;">
                <tr>
                  <td style="padding:20px 24px;">
                    <p style="margin:0 0 4px;color:#4ade80;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;">What is NOT changing</p>
                    <p style="margin:0;color:#d4d4d4;font-size:14px;line-height:1.6;">
                      Your <strong>login email</strong> (username) remains unchanged. You will continue to sign in to DoppelPod with the same email address you always have.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#a3a3a3;font-size:14px;">If you made this request, click below to confirm:</p>

              <!-- Confirm button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
                <tr>
                  <td style="background:linear-gradient(135deg,#7c3aed,#db2777);border-radius:8px;">
                    <a href="${confirmUrl}" style="display:inline-block;padding:14px 32px;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;">
                      ✓ Confirm Email Change
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 8px;color:#a3a3a3;font-size:14px;">If you did <strong style="color:#f87171;">not</strong> make this request, click below to cancel it immediately:</p>

              <!-- Cancel button -->
              <table cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background:#1f1f1f;border:1px solid #3f3f3f;border-radius:8px;">
                    <a href="${cancelUrl}" style="display:inline-block;padding:12px 28px;color:#f87171;font-size:14px;font-weight:500;text-decoration:none;">
                      ✕ Cancel This Request
                    </a>
                  </td>
                </tr>
              </table>

              <p style="margin:0;color:#525252;font-size:12px;line-height:1.6;">
                This link expires in 24 hours. If you did not request this change and do not recognise it, please contact us at support@doppelpod.io.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:20px 40px;border-top:1px solid #1f1f1f;text-align:center;">
              <p style="margin:0;color:#404040;font-size:12px;">© 2026 DoppelPod · doppelpod.io</p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html };
}
