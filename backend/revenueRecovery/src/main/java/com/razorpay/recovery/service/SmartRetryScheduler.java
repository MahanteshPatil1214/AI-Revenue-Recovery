package com.razorpay.recovery.service;

import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.model.FailureCategory;
import com.razorpay.recovery.repository.DunningEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Random;

@Slf4j
@Service
@RequiredArgsConstructor
public class SmartRetryScheduler {

    private final DunningEventRepository eventRepository;
    private final SseStreamService sseStreamService;
    private final NotificationService notificationService;
    private final Random random = new Random();

    /**
     * Polls every 10 seconds for any scheduled retry jobs ready to execute.
     */
    @Scheduled(fixedDelay = 10000)
    @Transactional
    public void executePendingRetries() {
        Instant now = Instant.now();
        List<DunningEvent> dueEvents = eventRepository
                .findByStatusAndNextRetryAtLessThanEqualOrderByNextRetryAtAsc("SCHEDULED", now);

        if (dueEvents.isEmpty()) {
            return;
        }

        log.info("Smart-Retry Engine: Executing {} pending recovery job(s)...", dueEvents.size());

        for (DunningEvent event : dueEvents) {
            processIndividualRetry(event);
        }
    }

    private void processIndividualRetry(DunningEvent event) {
        int currentAttempt = event.getRetryCount() + 1;
        event.setRetryCount(currentAttempt);

        log.info("Processing retry attempt {}/{} for payment {}", currentAttempt, event.getMaxRetries(), event.getPaymentId());

        // Simulate retry gateway resolution (70% chance of bank recovery on retry)
        boolean recovered = random.nextInt(100) < 70;

        if (recovered) {
            event.setStatus("RECOVERED_RETRY_SUCCESS");
            event.setReasoningTrace(String.format("Payment auto-recovered on retry #%d via secondary gateway route.", currentAttempt));
            event.setStrategyApplied("SMART_RETRY_AUTO_RECOVERED");
            event.setNextRetryAt(null);
            log.info("Payment {} successfully recovered on retry #{}", event.getPaymentId(), currentAttempt);
        } else {
            if (currentAttempt >= event.getMaxRetries()) {
                // Max retries exceeded -> Auto-escalate to permanent hard fail
                event.setCategory(FailureCategory.PERMANENT_HARD_FAIL);
                event.setStatus("RECOVERED_ACTION_TAKEN");
                event.setStrategyApplied("EXHAUSTED_ESCALATED_LINK_DISPATCH");

                String recoveryLink = "https://rzp.io/i/rec_" + Math.abs(event.getPaymentId().hashCode());
                event.setRecoveryUrl(recoveryLink);
                event.setReasoningTrace(String.format("Exhausted all %d transient retry attempts. Auto-escalated to Razorpay 1-click checkout & email.", event.getMaxRetries()));
                event.setNextRetryAt(null);

                // Dispatch Email Escalation
                notificationService.sendEmailRecovery(
                        "Valued Customer",
                        event.getCustomerEmail(),
                        BigDecimal.valueOf(event.getAmount()),
                        "INR",
                        recoveryLink,
                        "Multiple bank connection timeouts"
                );
                log.warn("Payment {} retry budget exhausted. Escalated to Email Payment Link.", event.getPaymentId());
            } else {
                // Schedule next exponential backoff attempt
                long backoffSeconds = calculateBackoffSeconds(currentAttempt);
                event.setNextRetryAt(Instant.now().plus(Duration.ofSeconds(backoffSeconds)));
                event.setReasoningTrace(String.format("Attempt #%d failed. Scheduled next attempt (#%d) in %ds with jitter.", currentAttempt, currentAttempt + 1, backoffSeconds));
                log.info("Payment {} scheduled for next retry in {}s", event.getPaymentId(), backoffSeconds);
            }
        }

        eventRepository.save(event);
        sseStreamService.broadcast(event);
    }

    /**
     * Calculates adaptive exponential backoff interval in seconds:
     * Attempt 1: 15s | Attempt 2: 45s | Attempt 3: 90s (fast-tracked for testing demo)
     */
    public long calculateBackoffSeconds(int attempt) {
        long baseDelay = 15L * (long) Math.pow(2, attempt - 1);
        long jitter = random.nextInt(6); // Add 0-5s jitter to avoid thundering herd
        return baseDelay + jitter;
    }
}