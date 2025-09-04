const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'localhost',
  port: parseInt(process.env.SMTP_PORT || '1025', 10),
  secure: false
});

async function sendVerificationEmail(to, code) {
  const from = process.env.SMTP_FROM || 'no-reply@piscina.test';
  await transporter.sendMail({
    from,
    to,
    subject: 'Código de verificação - Piscina de Liquidez',
    text: `Seu código de verificação é: ${code}`
  });
}

module.exports = { sendVerificationEmail };
