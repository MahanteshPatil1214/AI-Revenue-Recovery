package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.DunningRecoveryService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.concurrent.ThreadLocalRandom;

@RestController
@RequestMapping("/api/v1/test")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class TestSimulationController {

    private final DunningRecoveryService dunningService;

    @PostMapping("/simulate")
    public ResponseEntity<String> simulateFailure(
            @RequestParam(defaultValue = "HARD") String type,
            @RequestParam(required = false) Double amount) {

        String paymentId = "pay_sim_" + UUID.randomUUID().toString().substring(0, 8);

        // If no amount is provided in query params, pick a realistic random SaaS subscription price
        double finalAmount = (amount != null)
                ? amount
                : ThreadLocalRandom.current().nextInt(5, 50) * 100.0 - 1.0; // e.g. ₹499, ₹999, ₹1499, ₹2999...

        triggerMockEvent(paymentId, type, finalAmount);
        return ResponseEntity.ok("Simulated " + type + " failure event for " + paymentId + " with amount ₹" + finalAmount);
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
            double amount = ThreadLocalRandom.current().nextInt(5, 50) * 100.0; // ₹500 to ₹5000
            totalVolume += amount;

            if (isHard) {
                hardFails++;
                triggerMockEvent(paymentId, "HARD", amount);
            } else {
                softFails++;
                triggerMockEvent(paymentId, "SOFT", amount);
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

    private void triggerMockEvent(String paymentId, String type, double amount) {
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
                    "email": "customer@example.com",
                    "contact": "+919876543210"
                  }
                }
              }
            }
            """, paymentId, amountInPaise, errorCode, reason);

        dunningService.processWebhookPayloadAsync(mockPayload);
    }
}