package com.razorpay.recovery.service.impl;

import com.razorpay.recovery.service.EvolutionApiService;
import com.razorpay.recovery.service.NotificationService;
import jakarta.mail.internet.MimeMessage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;

@Service
public class NotificationServiceImpl implements NotificationService {

    private static final Logger log = LoggerFactory.getLogger(NotificationServiceImpl.class);

    @Value("${spring.mail.enabled:false}")
    private boolean mailEnabled;

    @Value("${notification.sender.email:billing@recoveryengine.io}")
    private String mailFrom;

    @Autowired(required = false)
    private JavaMailSender mailSender;

    @Value("${evolution.enabled:false}")
    private boolean evolutionEnabled;

    @Autowired(required = false)
    private EvolutionApiService evolutionApiService;

    @Override
    @Async
    public void sendEmailRecovery(String customerName, String customerEmail, BigDecimal amount, String currency, String paymentLink, String failureReason) {
        String displayName = (customerName != null && !customerName.isBlank()) ? customerName : "Valued Customer";
        String displayCurrency = (currency != null && !currency.isBlank()) ? currency : "INR";
        String displayReason = (failureReason != null && !failureReason.isBlank()) ? failureReason : "Bank authorization failure";
        BigDecimal displayAmount = amount != null ? amount : BigDecimal.ZERO;

        String subject = "Action Required: Complete your subscription renewal";
        String htmlContent = String.format(
                "<div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px; background-color: #ffffff;'>" +
                        "  <h2 style='color: #0f172a; margin-top: 0;'>Payment Unsuccessful</h2>" +
                        "  <p style='color: #475569; font-size: 15px;'>Hi %s,</p>" +
                        "  <p style='color: #475569; font-size: 15px;'>We were unable to process your scheduled subscription renewal of <strong>%s %.2f</strong> due to: <span style='color: #dc2626;'>%s</span>.</p>" +
                        "  <div style='margin: 28px 0; text-align: center;'>" +
                        "    <a href='%s' style='background-color: #2563eb; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;'>Complete Payment Securely</a>" +
                        "  </div>" +
                        "  <p style='color: #64748b; font-size: 13px;'>If the button does not work, copy and paste this link into your browser:<br/><a href='%s' style='color: #2563eb;'>%s</a></p>" +
                        "  <hr style='border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;' />" +
                        "  <p style='color: #94a3b8; font-size: 12px;'>Autonomous Revenue Recovery Engine • SSL Encrypted</p>" +
                        "</div>",
                displayName,
                displayCurrency,
                displayAmount,
                displayReason,
                paymentLink,
                paymentLink,
                paymentLink
        );

        if (mailEnabled && mailSender != null && customerEmail != null && !customerEmail.isBlank()) {
            try {
                MimeMessage mimeMessage = mailSender.createMimeMessage();
                MimeMessageHelper helper = new MimeMessageHelper(mimeMessage, true, "UTF-8");
                helper.setFrom(mailFrom);
                helper.setTo(customerEmail);
                helper.setSubject(subject);
                helper.setText(htmlContent, true);
                mailSender.send(mimeMessage);
                log.info("Autonomous recovery email dispatched successfully to: {}", customerEmail);
            } catch (Exception e) {
                log.error("Failed to dispatch recovery email: {}. Fallback trace logged.", e.getMessage());
            }
        } else {
            log.info("[SIMULATION EMAIL DISPATCH] To: {} | Subject: {} | Link: {}", customerEmail, subject, paymentLink);
        }
    }

    @Override
    @Async
    public void sendSmsOrWhatsAppRecovery(String customerName, String customerPhone, BigDecimal amount, String currency, String paymentLink, String failureReason) {
        String displayName = (customerName != null && !customerName.isBlank()) ? customerName : "Valued Customer";
        String displayCurrency = (currency != null && !currency.isBlank()) ? currency : "INR";
        BigDecimal displayAmount = amount != null ? amount : BigDecimal.ZERO;
        String displayReason = (failureReason != null && !failureReason.isBlank()) ? failureReason : "Bank decline";

        // Official branded dunning message. The sender identity shown on WhatsApp comes
        // from the linked WhatsApp Business account / instance, not this text; keeping a
        // clean header + footer makes the message read as a legitimate billing notice.
        String header = "\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\u2014\n"
                + "\u26a1 Razorpay Revenue Recovery";
        String message = String.format(
                "%s\n\n" +
                "Hi %s,\n\n" +
                "Your %s %.2f subscription renewal could not be processed.\n" +
                "Reason: %s.\n\n" +
                "No action is needed if this was resolved automatically. To pay securely " +
                "now, open your secure payment link:\n%s\n\n" +
                "This is an automated billing notice from your service provider. If you " +
                "believe this is an error, contact support or reply STOP to opt out.\n" +
                "\u2014 Razorpay Revenue Recovery \u2022 Billing & Payments",
                header,
                displayName,
                displayCurrency,
                displayAmount,
                displayReason,
                paymentLink
        );

        if (evolutionEnabled && evolutionApiService != null) {
            boolean sent = evolutionApiService.sendText(customerPhone, message);
            if (sent) {
                return;
            }
            log.warn("Evolution API dispatch unavailable/failed for {}. Falling back to simulation.", customerPhone);
        }

        log.info("[SIMULATION SMS/WHATSAPP DISPATCH] To: {} | Message: {}", customerPhone, message);
    }
}