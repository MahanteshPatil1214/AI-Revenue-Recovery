package com.razorpay.recovery.controller;

import com.razorpay.recovery.model.WebhookEventLog;
import com.razorpay.recovery.service.WebhookDlqService;
import com.razorpay.recovery.service.WebhookIngestionService;
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

    private static final int MAX_PAYLOAD_BYTES = 1_000_000;

    private final WebhookIngestionService ingestionService;
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

        if (payload == null || payload.isBlank()) {
            return ResponseEntity.badRequest().body("Empty webhook payload");
        }
        if (payload.getBytes().length > MAX_PAYLOAD_BYTES) {
            return ResponseEntity.badRequest().body("Webhook payload too large");
        }

        if (signature == null || !signatureVerifier.verifyWebhookSignature(payload, signature, webhookSecret)) {
            log.error("Webhook HMAC signature validation failed!");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        String eventType = "UNKNOWN";
        String paymentId = null;
        WebhookEventLog logEntry = null;

        try {
            JSONObject json = new JSONObject(payload);
            eventType = json.optString("event", "UNKNOWN");
            JSONObject paymentEntity = json.optJSONObject("payload") != null
                    ? json.optJSONObject("payload").optJSONObject("payment") != null
                    ? json.optJSONObject("payload").optJSONObject("payment").optJSONObject("entity")
                    : null
                    : null;
            paymentId = paymentEntity != null ? paymentEntity.optString("id") : null;

            // Persist the raw webhook BEFORE processing so it is never lost.
            logEntry = ingestionService.recordInbound(eventType, paymentId, payload);
            log.info("Webhook logged as record #{} (event={}, payment={})", logEntry.getId(), eventType, paymentId);

            ingestionService.process(eventType, payload);

            return ResponseEntity.ok("Event processed successfully");
        } catch (Exception e) {
            log.error("Exception in webhook pipeline. Capturing payload to DLQ: {}", e.getMessage(), e);
            webhookDlqService.captureFailedWebhook(eventType, payload, e);
            return ResponseEntity.status(HttpStatus.ACCEPTED).body("Payload queued in Dead-Letter Queue for retry");
        }
    }
}
