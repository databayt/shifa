'use server';

import { Resend } from 'resend';

// Lazy initialization to avoid build-time errors
let resend: Resend | null = null;
function getResend() {
  if (!resend) {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
}

type NotificationPayload = {
  to: string | string[];
  subject: string;
  content: string;
};

// Add new types for SMS and WhatsApp messages
type SmsPayload = {
  to: string;
  message: string;
};

type WhatsAppPayload = {
  to: string;
  message: string;
};

/**
 * Send application submitted notification to membership secretary and admins
 */
export async function notifyNewApplication(
  notificationEmails: string[],
  applicantName: string,
  applicantEmail: string | null,
  applicantPhone: string | null,
   
  applicantWhatsapp: string | null
) {
  if (!notificationEmails.length) return;
  
  try {
    // Email notification (existing functionality)
    const emailContent = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <h2>تم تقديم طلب عضوية جديد</h2>
        <p>هناك طلب عضوية جديد بحاجة إلى مراجعتك من:</p>
        <ul>
          <li>الاسم: ${applicantName}</li>
          <li>البريد الإلكتروني: ${applicantEmail || 'غير متوفر'}</li>
          <li>رقم الهاتف: ${applicantPhone || 'غير متوفر'}</li>
          <li>رقم الواتساب: ${applicantWhatsapp || 'غير متوفر'}</li>
        </ul>
        <p>يرجى مراجعة الطلب في لوحة التحكم.</p>
      </div>
    `;

    await sendNotification({
      to: notificationEmails,
      subject: `طلب عضوية جديد: ${applicantName}`,
      content: emailContent
    });

    // Send SMS to membership secretaries if configured
    if (process.env.SMS_NOTIFICATIONS_ENABLED === "true" && process.env.MEMBERSHIP_SECRETARY_PHONE) {
      const smsMessage = `طلب عضوية جديد: ${applicantName}. يرجى مراجعة الطلب في لوحة التحكم.`;
      
      await sendSmsNotification({
        to: process.env.MEMBERSHIP_SECRETARY_PHONE,
        message: smsMessage
      });
    }
    
    // Send WhatsApp to membership secretaries if configured
    if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true" && process.env.MEMBERSHIP_SECRETARY_WHATSAPP) {
      const whatsappMessage = `طلب عضوية جديد: ${applicantName}. يرجى مراجعة الطلب في لوحة التحكم.`;
      
      await sendWhatsAppNotification({
        to: process.env.MEMBERSHIP_SECRETARY_WHATSAPP,
        message: whatsappMessage
      });
    }
  } catch (error) {
    console.error('Error sending new application notification:', error);
  }
}

/**
 * Send application approved notification to applicant
 */
export async function notifyApplicationApproved(
  applicantEmail: string,
  applicantName: string,
  applicantPhone: string | null,
  applicantWhatsapp: string | null,
  reviewNotes?: string | null
) {
  if (!applicantEmail) return;
  
  try {
    // Email notification (existing functionality)
    const emailContent = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <h2>تمت الموافقة على طلب العضوية الخاص بك</h2>
        <p>مرحباً ${applicantName}،</p>
        <p>يسعدنا إخبارك بأنه تمت الموافقة على طلب العضوية الخاص بك!</p>
        ${reviewNotes ? `<p>ملاحظات المراجع: ${reviewNotes}</p>` : ''}
        <p>يمكنك الآن تسجيل الدخول واستخدام جميع ميزات المنصة.</p>
        <p>شكراً لانضمامك إلينا!</p>
      </div>
    `;

    await sendNotification({
      to: applicantEmail,
      subject: `تهانينا! تمت الموافقة على طلب العضوية الخاص بك`,
      content: emailContent
    });

    // Send SMS to applicant if phone available and SMS notifications enabled
    if (process.env.SMS_NOTIFICATIONS_ENABLED === "true" && applicantPhone) {
      const smsMessage = `مرحباً ${applicantName}، تمت الموافقة على طلب العضوية الخاص بك! يمكنك الآن تسجيل الدخول واستخدام جميع ميزات المنصة.`;
      
      await sendSmsNotification({
        to: applicantPhone,
        message: smsMessage
      });
    }
    
    // Send WhatsApp to applicant if WhatsApp number available and WhatsApp notifications enabled
    if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true" && applicantWhatsapp) {
      const whatsappMessage = `مرحباً ${applicantName}، تمت الموافقة على طلب العضوية الخاص بك! يمكنك الآن تسجيل الدخول واستخدام جميع ميزات المنصة.`;
      
      await sendWhatsAppNotification({
        to: applicantWhatsapp,
        message: whatsappMessage
      });
    }
  } catch (error) {
    console.error('Error sending application approved notification:', error);
  }
}

/**
 * Send application rejected notification to applicant
 */
export async function notifyApplicationRejected(
  applicantEmail: string,
  applicantName: string,
  applicantPhone: string | null,
  applicantWhatsapp: string | null,
  reviewNotes?: string | null
) {
  if (!applicantEmail) return;
  
  try {
    // Email notification (existing functionality)
    const emailContent = `
      <div dir="rtl" style="text-align: right; font-family: Arial, sans-serif;">
        <h2>تم رفض طلب العضوية الخاص بك</h2>
        <p>مرحباً ${applicantName}،</p>
        <p>نأسف لإخبارك بأنه تم رفض طلب العضوية الخاص بك.</p>
        ${reviewNotes ? `<p>سبب الرفض: ${reviewNotes}</p>` : ''}
        <p>إذا كان لديك أي أسئلة أو ترغب في معرفة المزيد من المعلومات، يرجى التواصل مع فريق الدعم.</p>
      </div>
    `;

    await sendNotification({
      to: applicantEmail,
      subject: `تم رفض طلب العضوية الخاص بك`,
      content: emailContent
    });

    // Send SMS to applicant if phone available and SMS notifications enabled
    if (process.env.SMS_NOTIFICATIONS_ENABLED === "true" && applicantPhone) {
      const smsMessage = `مرحباً ${applicantName}، نأسف لإخبارك بأنه تم رفض طلب العضوية الخاص بك. ${reviewNotes ? `سبب الرفض: ${reviewNotes}` : ''} يرجى التواصل مع الدعم لمزيد من المعلومات.`;
      
      await sendSmsNotification({
        to: applicantPhone,
        message: smsMessage
      });
    }
    
    // Send WhatsApp to applicant if WhatsApp number available and WhatsApp notifications enabled
    if (process.env.WHATSAPP_NOTIFICATIONS_ENABLED === "true" && applicantWhatsapp) {
      const whatsappMessage = `مرحباً ${applicantName}، نأسف لإخبارك بأنه تم رفض طلب العضوية الخاص بك. ${reviewNotes ? `سبب الرفض: ${reviewNotes}` : ''} يرجى التواصل مع الدعم لمزيد من المعلومات.`;
      
      await sendWhatsAppNotification({
        to: applicantWhatsapp,
        message: whatsappMessage
      });
    }
  } catch (error) {
    console.error('Error sending application rejected notification:', error);
  }
}

/**
 * Core notification sending function using Resend
 */
async function sendNotification({ to, subject, content }: NotificationPayload) {
  // Handle single recipient or multiple recipients
  const recipients = Array.isArray(to) ? to : [to];
  
  if (process.env.NODE_ENV === 'development') {
    // In development, just log the email details
    console.log('Email would be sent:');
    console.log('To:', recipients);
    console.log('Subject:', subject);
    console.log('Content:', content);
    return;
  }
  
  try {
    const { data, error } = await getResend().emails.send({
      from: `الحركة الوطنية للبناء والتنمية <${process.env.EMAIL_FROM || 'noreply@nmbdsd.org'}>`,
      to: recipients,
      subject: subject,
      html: content,
    });
    
    if (error) {
      console.error('Error sending notification:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('Failed to send notification:', error);
    throw error;
  }
}

/**
 * Send SMS notification
 * This is a placeholder implementation - you'll need to replace with your SMS provider's API
 */
async function sendSmsNotification({ to, message }: SmsPayload) {
  // Skip sending in development
  if (process.env.NODE_ENV === "development") {
    console.log("📱 SMS NOTIFICATION (DEV MODE - NOT ACTUALLY SENT)");
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    return { success: true };
  }
  
  try {
    // Replace with your SMS provider implementation
    // Example with Twilio:
    // const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await twilioClient.messages.create({
    //   body: message,
    //   from: process.env.TWILIO_PHONE_NUMBER,
    //   to: to
    // });
    
    console.log(`SMS sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending SMS:", error);
    return { success: false, error };
  }
}

/**
 * Send WhatsApp notification
 * This is a placeholder implementation - you'll need to replace with your WhatsApp provider's API
 */
async function sendWhatsAppNotification({ to, message }: WhatsAppPayload) {
  // Skip sending in development
  if (process.env.NODE_ENV === "development") {
    console.log("💬 WHATSAPP NOTIFICATION (DEV MODE - NOT ACTUALLY SENT)");
    console.log(`To: ${to}`);
    console.log(`Message: ${message}`);
    return { success: true };
  }
  
  try {
    // Replace with your WhatsApp provider implementation
    // Example with Twilio:
    // const twilioClient = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    // await twilioClient.messages.create({
    //   body: message,
    //   from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    //   to: `whatsapp:${to}`
    // });
    
    console.log(`WhatsApp message sent to ${to}`);
    return { success: true };
  } catch (error) {
    console.error("Error sending WhatsApp message:", error);
    return { success: false, error };
  }
} 