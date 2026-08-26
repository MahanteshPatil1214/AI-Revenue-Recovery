package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.DunningRecoveryService;
import com.razorpay.recovery.service.WebhookDlqService;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/v1/test")
@RequiredArgsConstructor
@Profile("dev")
public class TestSimulationController {

    private final WebhookDlqService webhookDlqService;

    private final DunningRecoveryService dunningService;

    @PostMapping("/simulate")
    public ResponseEntity<String> simulateFailure(
            @RequestParam(defaultValue = "HARD") String type,
            @RequestParam(required = false) Double amount,
            @RequestParam(defaultValue = "customer@example.com") String email) {

        String paymentId = "pay_sim_" + UUID.randomUUID().toString().substring(0, 8);

        double finalAmount = (amount != null)
                ? amount
                : ThreadLocalRandom.current().nextInt(5, 50) * 100.0 - 1.0;

        triggerMockEvent(paymentId, type, finalAmount, email);
        return ResponseEntity.ok("Simulated " + type + " failure event for " + paymentId + " with amount ₹" + finalAmount + " targeting " + email);
    }

    @PostMapping("/simulate-batch")
    public ResponseEntity<Map<String, Object>> runBatchBenchmark(@RequestParam(defaultValue = "50") int totalEvents) {
        long startTime = System.currentTimeMillis();
        int hardFails = 0;
        int softFails = 0;
        double totalVolume = 0;

        for (int i = 0; i < totalEvents; i++) {
            String paymentId = "pay_batch_" + UUID.randomUUID().toString().substring(0, 8);
            boolean isHard = ThreadLocalRandom.current().nextBoolean();
            double amount = ThreadLocalRandom.current().nextInt(5, 50) * 100.0;
            totalVolume += amount;

            if (isHard) {
                hardFails++;
                triggerMockEvent(paymentId, "HARD", amount, "customer" + i + "@example.com");
            } else {
                softFails++;
                triggerMockEvent(paymentId, "SOFT", amount, "customer" + i + "@example.com");
            }
        }

        long executionTimeMs = System.currentTimeMillis() - startTime;

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("batchSize", totalEvents);
        summary.put("hardFailuresEscalated", hardFails);
        summary.put("softFailuresQueued", softFails);
        summary.put("totalValueProcessed", totalVolume);
        summary.put("processingDurationMs", executionTimeMs);
        summary.put("throughputEventsPerSec", (totalEvents * 1000.0) / Math.max(1, executionTimeMs));

        return ResponseEntity.ok(summary);
    }

    private void triggerMockEvent(String paymentId, String type, double amount, String email) {
        String errorCode = "HARD".equalsIgnoreCase(type) ? "BAD_REQUEST_INSUFFICIENT_FUNDS" : "GATEWAY_TIMEOUT_ERROR";
        String reason = "HARD".equalsIgnoreCase(type)
                ? "Account balance below recurring debit threshold"
                : "Bank servers unresponsive during 3DS OTP validation";

        long amountInPaise = (long) (amount * 100);

        String mockPayload = String.format("""
            {
              "entity": "event",
              "event": "payment.failed",
              "payload": {
                "payment": {
                  "entity": {
                    "id": "%s",
                    "amount": %d,
                    "currency": "INR",
                    "status": "failed",
                    "error_code": "%s",
                    "error_reason": "%s",
                    "email": "%s",
                    "contact": "+919876543210"
                  }
                }
              }
            }
            """, paymentId, amountInPaise, errorCode, reason, email);

        dunningService.processWebhookPayloadAsync(mockPayload);
    }

    @PostMapping("/simulate-capture")
    public ResponseEntity<String> simulatePaymentCapture(
            @RequestParam String paymentId,
            @RequestParam(defaultValue = "UPI") String method
    ) {
        dunningService.processPaymentCaptured(paymentId, "1000", method);
        return ResponseEntity.ok("Simulated payment capture processed for: " + paymentId);
    }

    @PostMapping("/simulate-dlq")
    public ResponseEntity<String> simulateDlq() {
        String badPayload = "{\"event\": \"payment.failed\", \"corrupted_data\": true}";
        webhookDlqService.captureFailedWebhook(
                "payment.failed",
                badPayload,
                new RuntimeException("Simulated JSON structure parsing error")
        );
        return ResponseEntity.ok("Successfully captured test exception into DLQ registry");
    }
}