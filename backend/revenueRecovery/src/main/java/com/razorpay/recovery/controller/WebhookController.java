package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.DunningRecoveryService;

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
@CrossOrigin(origins = "*")
public class WebhookController {

    private final DunningRecoveryService dunningRecoveryService;
    private final SignatureVerifier signatureVerifier;

    @Value("${razorpay.webhook.secret:}")
    private String webhookSecret;

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature
    ) {
        log.info("Received Razorpay webhook dispatch.");

        // Verify HMAC-SHA256 signature if secret is configured
        if (webhookSecret != null && !webhookSecret.isBlank() && !webhookSecret.equalsIgnoreCase("dummy_secret")) {
            if (signature == null || !signatureVerifier.verifyWebhookSignature(payload, signature, webhookSecret)) {
                log.error("Webhook HMAC signature validation failed!");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
            }
        }

        try {
            JSONObject json = new JSONObject(payload);
            String event = json.optString("event");

            if ("payment.failed".equalsIgnoreCase(event)) {
                dunningRecoveryService.processWebhookPayloadAsync(payload);
            } else if ("payment.captured".equalsIgnoreCase(event) || "payment_link.paid".equalsIgnoreCase(event)) {
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
                log.info("Unhandled webhook event type: {}", event);
            }

            return ResponseEntity.ok("Event processed successfully");
        } catch (Exception e) {
            log.error("Error processing webhook payload: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Processing failed");
        }
    }
}