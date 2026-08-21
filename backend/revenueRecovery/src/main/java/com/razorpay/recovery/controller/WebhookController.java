package com.razorpay.recovery.controller;


import com.razorpay.Utils;
import com.razorpay.recovery.service.DunningRecoveryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@Slf4j
@RestController
@RequestMapping("/api/v1/webhooks")
@RequiredArgsConstructor
public class WebhookController {

    private final DunningRecoveryService dunningService;

    @Value("${razorpay.webhook.secret}")
    private String webhookSecret;

    @PostMapping("/razorpay")
    public ResponseEntity<String> handleRazorpayWebhook(
            @RequestBody String payload,
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature) {

        if (signature != null && !signature.isBlank()) {
            try {
                boolean isValid = Utils.verifyWebhookSignature(payload, signature, webhookSecret);
                if (!isValid) {
                    log.warn("Unauthorized webhook attempt: invalid HMAC-SHA256 signature.");
                    return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
                }
            } catch (Exception e) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Signature verification failed");
            }
        }

        // Decouple immediately - Return 200 OK fast
        dunningService.processWebhookPayloadAsync(payload);
        return ResponseEntity.ok("EVENT_RECEIVED");
    }
}
