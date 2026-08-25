package com.razorpay.recovery.service;


import com.razorpay.recovery.model.WebhookDlqEvent;
import com.razorpay.recovery.repository.WebhookDlqRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.Instant;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookDlqService {

    private final WebhookDlqRepository dlqRepository;
    private final DunningRecoveryService dunningRecoveryService;

    @Transactional
    public void captureFailedWebhook(String eventType, String payload, Exception exception) {
        log.warn("Persisting unhandled webhook payload to DLQ. Event: {}, Cause: {}", eventType, exception.getMessage());

        WebhookDlqEvent dlqEvent = WebhookDlqEvent.builder()
                .eventType(eventType != null ? eventType : "UNKNOWN")
                .rawPayload(payload)
                .exceptionMessage(exception.getMessage() != null ? exception.getMessage() : "Unknown execution exception")
                .retryCount(0)
                .maxRetries(3)
                .status("RETRY_PENDING")
                .nextRetryAt(Instant.now().plus(Duration.ofSeconds(30))) // First fallback retry in 30s
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();

        dlqRepository.save(dlqEvent);
    }

    /**
     * DLQ Background Worker: Polling every 20 seconds for recoverable webhooks
     */
    @Scheduled(fixedDelay = 20000)
    @Transactional
    public void processDlqRetries() {
        Instant now = Instant.now();
        List<WebhookDlqEvent> pendingItems = dlqRepository.findPendingRetriesReady(now);

        for (WebhookDlqEvent item : pendingItems) {
            reprocessIndividualDlqItem(item);
        }

        if (pendingItems.isEmpty()) {
            return;
        }

        log.info("Webhook DLQ Engine: Found {} queued failure(s) to re-evaluate.", pendingItems.size());

        for (WebhookDlqEvent item : pendingItems) {
            reprocessIndividualDlqItem(item);
        }
    }

    private void reprocessIndividualDlqItem(WebhookDlqEvent item) {
        int currentAttempt = item.getRetryCount() + 1;
        item.setRetryCount(currentAttempt);
        item.setUpdatedAt(Instant.now());

        log.info("DLQ Worker: Attempting re-execution {}/{} for DLQ Record #{}", currentAttempt, item.getMaxRetries(), item.getId());

        try {
            // Re-dispatching to main dunning parser
            dunningRecoveryService.processWebhookPayloadAsync(item.getRawPayload());
            item.setStatus("RESOLVED");
            item.setNextRetryAt(null);
            log.info("DLQ Record #{} recovered and processed successfully.", item.getId());
        } catch (Exception e) {
            log.error("DLQ Record #{} re-processing failed on attempt {}: {}", item.getId(), currentAttempt, e.getMessage());
            item.setExceptionMessage(e.getMessage());

            if (currentAttempt >= item.getMaxRetries()) {
                item.setStatus("DEAD_LETTER");
                item.setNextRetryAt(null);
                log.error("DLQ Record #{} exhausted max retries. Moved permanently to DEAD_LETTER queue for engineering inspection.", item.getId());
            } else {
                long backoffSeconds = (long) Math.pow(2, currentAttempt) * 30L; // 60s -> 120s
                item.setNextRetryAt(Instant.now().plus(Duration.ofSeconds(backoffSeconds)));
            }
        }

        dlqRepository.save(item);
    }
}
