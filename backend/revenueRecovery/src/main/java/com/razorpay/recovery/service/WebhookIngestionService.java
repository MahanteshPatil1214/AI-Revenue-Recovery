package com.razorpay.recovery.service;

import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.model.WebhookEventLog;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.repository.WebhookEventLogRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.json.JSONObject;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Authoritative webhook ingestion pipeline.
 *
 * Every inbound Razorpay webhook is persisted to the {webhook_event_log} table
 * BEFORE any processing occurs. This guarantees durability: even if processing
 * (or the JVM) crashes mid-flight, the raw payload is not lost and can be
 * replayed/reconciled later.
 *
 * - payment.failed     -> delegated to the existing dunning/recovery pipeline.
 * - payment.captured / payment_link.paid -> idempotent settlement application.
 *
 * Settlement via webhook is idempotent, so duplicate/out-of-order deliveries
 * are safe to apply without adverse effects.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookIngestionService {

    private final WebhookEventLogRepository eventLogRepository;
    private final DunningEventRepository dunningEventRepository;
    private final DunningRecoveryService dunningRecoveryService;
    private final SseStreamService sseStreamService;

    /**
     * Persists the raw webhook as a durable audit record before processing.
     * Runs in its own transaction so the log write is committed even if
     * processing later throws.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public WebhookEventLog recordInbound(String eventType, String paymentId, String rawJson) {
        WebhookEventLog logEntry = WebhookEventLog.builder()
                .eventType(eventType)
                .paymentId(paymentId)
                .rawPayload(rawJson)
                .status("RECEIVED")
                .createdAt(Instant.now())
                .build();
        return eventLogRepository.save(logEntry);
    }

    /**
     * Main handler called after signature verification and inbound persistence.
     */
    @Transactional
    public void process(String eventType, String rawJson) {
        try {
            JSONObject json = new JSONObject(rawJson);
            String actualEventType = eventType != null ? eventType : json.optString("event", "UNKNOWN");

            switch (actualEventType) {
                case "payment.failed" -> dunningRecoveryService.processWebhookPayloadAsync(rawJson);
                case "payment.captured", "payment_link.paid" -> handlePaymentSettled(rawJson);
                default -> log.info("Unhandled webhook event type: {}", actualEventType);
            }
        } catch (RuntimeException e) {
            log.error("Webhook processing failed: {}", e.getMessage(), e);
            throw e;
        } catch (Exception e) {
            log.error("Webhook processing failed: {}", e.getMessage(), e);
            throw new RuntimeException("Webhook processing failure", e);
        }
    }

    /**
     * Handles a settlement webhook (payment.captured / payment_link.paid).
     * Idempotent: applying the same settlement twice has no adverse effect.
     */
    private void handlePaymentSettled(String rawJson) throws Exception {
        JSONObject json = new JSONObject(rawJson);
        JSONObject payloadObj = json.optJSONObject("payload");
        if (payloadObj == null) {
            throw new IllegalArgumentException("Webhook payload missing 'payload' object");
        }
        JSONObject paymentObj = payloadObj.optJSONObject("payment");
        JSONObject paymentEntity = paymentObj != null ? paymentObj.optJSONObject("entity") : null;
        if (paymentEntity == null) {
            throw new IllegalArgumentException("Settlement webhook missing payment entity");
        }

        String paymentId = paymentEntity.optString("id");
        String method = paymentEntity.optString("method");
        String amountStr = paymentEntity.optString("amount");

        if (paymentId == null || paymentId.isBlank()) {
            throw new IllegalArgumentException("Settlement webhook missing payment id");
        }

        DunningEvent event = dunningEventRepository.findByPaymentId(paymentId)
                .orElseThrow(() -> new IllegalArgumentException(
                        "Settlement for payment " + paymentId + " not in dunning registry. "
                                + "Likely out-of-order delivery; reconciliation will resolve it."));

        // Idempotency guard: if already settled, do nothing.
        if (isTerminalRecovered(event.getStatus())) {
            log.info("Payment {} already in terminal recovered state; skipping duplicate settlement.", paymentId);
            return;
        }

        event.setStatus("RECOVERED_CUSTOMER_PAID");
        event.setStrategyApplied("WEBHOOK_PAYMENT_CAPTURED_SETTLED");
        event.setReasoningTrace(String.format(
                "Settled via Razorpay webhook (amount %s paise, method %s).", amountStr, method != null ? method : "Razorpay"));
        event.setNextRetryAt(null);

        DunningEvent saved = dunningEventRepository.save(event);
        sseStreamService.broadcast(saved);
        log.info("Settlement webhook applied for payment: {}", paymentId);
    }

    private boolean isTerminalRecovered(String status) {
        return "RECOVERED_CUSTOMER_PAID".equals(status)
                || "RECOVERED_RETRY_SUCCESS".equals(status)
                || "RECOVERED_ACTION_TAKEN".equals(status);
    }
}
