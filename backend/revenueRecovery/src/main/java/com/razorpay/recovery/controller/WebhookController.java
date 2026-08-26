package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.DunningRecoveryService;
import com.razorpay.recovery.service.WebhookDlqService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/webhook")
@RequiredArgsConstructor
public class WebhookController {

    private final DunningRecoveryService dunningRecoveryService;
    private final SignatureVerifier signatureVerifier;
    private final WebhookDlqService webhookDlqService;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature
    ) {
        log.info("Received Razorpay webhook dispatch.");

        if (webhookSecret == null || webhookSecret.isBlank()) {
            log.error("Webhook secret not configured. Rejecting webhook for security.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Webhook secret not configured");
        }

        if (signature == null || !signatureVerifier.verifyWebhookSignature(payload, signature, webhookSecret)) {
            log.error("Webhook HMAC signature validation failed!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        String eventType = "UNKNOWN";

        try {
            JSONObject json = new JSONObject(payload);
            eventType = json.optString("event", "UNKNOWN");

            if ("payment.failed".equalsIgnoreCase(eventType)) {
                dunningRecoveryService.processWebhookPayloadAsync(payload);
            } else if ("payment.captured".equalsIgnoreCase(eventType) || "payment_link.paid".equalsIgnoreCase(eventType)) {
                JSONObject payloadObj = json.optJSONObject("payload");
                if (payloadObj != null) {
                    JSONObject paymentObj = payloadObj.optJSONObject("payment");
                    JSONObject paymentEntity = (paymentObj != null) ? paymentObj.optJSONObject("entity") : null;

                    if (paymentEntity != null) {
                        String paymentId = paymentEntity.optString("id");
                        String amount = paymentEntity.optString("amount");
                        String method = paymentEntity.optString("method");
                        dunningRecoveryService.processPaymentCaptured(paymentId, amount, method);
                    }
                }
            } else {
                log.info("Unhandled webhook event type: {}", eventType);
            }

            return ResponseEntity.ok("Event processed successfully");
        } catch (Exception e) {
            log.error("Exception in webhook pipeline. Capturing payload to DLQ: {}", e.getMessage(), e);
            webhookDlqService.captureFailedWebhook(eventType, payload, e);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body("Payload queued in Dead-Letter Queue for retry");
        }
    }
}