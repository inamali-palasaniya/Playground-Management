import twilio from 'twilio';
import nodemailer from 'nodemailer';

// Use environment variables or hardcoded test credentials (NOT RECOMMENDED for prod)
const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_PHONE = process.env.TWILIO_PHONE_NUMBER;

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS; // App Password if using Gmail

export class CommunicationService {
    static async sendOTP(channel: 'EMAIL' | 'SMS', recipient: string, otp: string): Promise<boolean> {
        console.log(`\n================================`);
        console.log(`[CommunicationService]`);
        console.log(`To: ${recipient}`);
        console.log(`Channel: ${channel}`);
        console.log(`OTP: ${otp}`);

        if (channel === 'SMS' && TWILIO_SID && TWILIO_TOKEN && TWILIO_PHONE) {
            try {
                console.log('>> Sending via Twilio...');
                const client = twilio(TWILIO_SID, TWILIO_TOKEN);
                await client.messages.create({
                    body: `Your OTP is ${otp}`,
                    from: TWILIO_PHONE,
                    to: recipient
                });
                console.log('>> SMS Sent Successfully!');
                return true;
            } catch (error: any) {
                console.error('>> Twilio Error:', error.message);
                return false;
            }
        } else if (channel === 'SMS') {
            console.log('>> [FREE DEV MODE] Real SMS requires a paid gateway (e.g. Twilio).');
            console.log(`>> USE THIS CODE: ${otp}`);
        }

        if (channel === 'EMAIL' && EMAIL_USER && EMAIL_PASS) {
            try {
                console.log('>> Sending via Nodemailer (Gmail/SMTP)...');
                const transporter = nodemailer.createTransport({
                    host: 'smtp.gmail.com',
                    port: 587,
                    secure: false, // true for 465, false for other ports
                    auth: { user: EMAIL_USER, pass: EMAIL_PASS }
                });

                await transporter.sendMail({
                    from: `"Playground Management" <${EMAIL_USER}>`,
                    to: recipient,
                    subject: 'Reset Password OTP',
                    text: `Your OTP is: ${otp}`,
                    html: `<h3>Your OTP is: <b>${otp}</b></h3><p>Valid for 10 minutes.</p>`
                });
                console.log('>> Email Sent Successfully!');
                return true;
            } catch (error: any) {
                console.error('>> Nodemailer Error:', error.message);
                return false;
            }
        } else if (channel === 'EMAIL') {
            console.log('>> [FREE DEV MODE] Real Email requires SMTP credentials.');
            console.log(`>> USE THIS CODE: ${otp}`);
        }

        console.log(`================================\n`);
        return true;
    }
}
