package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.DunningRecoveryService;
import com.razorpay.recovery.service.WebhookDlqService;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.model.DunningEvent;
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

    private final DunningEventRepository eventRepository;

    @PostMapping("/reset-demo")
    public ResponseEntity<Map<String, Object>> resetDemo(
            @RequestParam(defaultValue = "false") boolean seed) {
        eventRepository.deleteAll();
        int seeded = 0;
        if (seed) {
            seeded = seedDemoRecords();
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("cleared", true);
        result.put("seeded", seeded);
        result.put("total", eventRepository.count());
        return ResponseEntity.ok(result);
    }

    private int seedDemoRecords() {
        String[] examples = {
                "pay_seed_1|HARD|4999|customer.akash@example.com|BAD_REQUEST_INSUFFICIENT_FUNDS|Account balance below recurring debit threshold|https://rzp.io/rzp/seed1001",
                "pay_seed_2|HARD|799|customer.priya@example.com|BAD_REQUEST_CARD_EXPIRED|Card expired|https://rzp.io/rzp/seed2002",
                "pay_seed_3|HARD|1499|customer.rahul@example.com|BAD_REQUEST_INSUFFICIENT_FUNDS|Insufficient funds|https://rzp.io/rzp/seed3003",
                "pay_seed_4|SOFT|2399|customer.sneha@example.com|GATEWAY_TIMEOUT_ERROR|Bank servers unresponsive on HDFC rail|https://rzp.io/rzp/seed4004",
                "pay_seed_5|HARD|3999|customer.vikram@example.com|BAD_REQUEST_CARD_DECLINED|Card declined by issuer|https://rzp.io/rzp/seed5005",
                "pay_seed_6|SOFT|999|customer.anita@example.com|SERVER_ERROR|Gateway internal error on UPI rail|https://rzp.io/rzp/seed6006",
        };
        int count = 0;
        for (String line : examples) {
            String[] parts = line.split("\\|");
            String paymentId = parts[0];
            boolean hard = "HARD".equalsIgnoreCase(parts[1]);
            double amount = Double.parseDouble(parts[2]);
            String email = parts[3];
            String errorCode = parts[4];
            String reason = parts[5];
            String link = parts[6];

            DunningEvent event = DunningEvent.builder()
                    .paymentId(paymentId)
                    .amount(amount)
                    .customerEmail(email)
                    .customerContact("+919876543210")
                    .errorCode(errorCode)
                    .errorReason(reason)
                    .category(hard
                            ? com.razorpay.recovery.model.FailureCategory.PERMANENT_HARD_FAIL
                            : com.razorpay.recovery.model.FailureCategory.TRANSIENT_SOFT_FAIL)
                    .bankCode("UPI")
                    .strategyApplied(hard
                            ? "AUTONOMOUS_PAYMENT_LINK_ESCALATION"
                            : "SMART_BACKOFF_RETRY")
                    .reasoningTrace(hard
                            ? "Permanent failure (" + reason + "). Generated dynamic Razorpay link & dispatched automated email."
                            : "Transient failure queued for radar-aware smart retry.")
                    .recoveryUrl(link)
                    .status("RECOVERED_ACTION_TAKEN")
                    .retryCount(0)
                    .maxRetries(3)
                    .createdAt(java.time.Instant.now().minusSeconds(count * 30L))
                    .build();
            eventRepository.save(event);
            count++;
        }
        return count;
    }

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