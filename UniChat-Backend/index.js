require("dotenv").config();
const transporter = require("./controllers/mail");

async function sendEmail() {
    try {
        const info = await transporter.sendMail({
            from: `"UniChat" <${process.env.EMAIL}>`,
            to: "smdgamekingindo@gmail.com", // Send to yourself for testing
            subject: "🎉 My First Email",
            html: `
                <h1>Hello!</h1>
                <p>This email was sent from <b>Node.js</b> using <b>Gmail SMTP</b>.</p>
            `,
        });

        console.log("✅ Email sent!");
        console.log("Message ID:", info.messageId);
    } catch (err) {
        console.error("❌ Error sending email:");
        console.error(err);
    }
}

sendEmail();