package com.razorpay.recovery.service;

import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.repository.DunningEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Reconciliation engine.
 *
 * Webhooks are the authoritative source of truth for settlements, but a webhook
 * can be delayed or (rarely) lost, and compatibility handles the case where a
 * customer pays and closes their browser tab before the frontend redirect fires.
 *
 * This service iterates over dunning events that are still in a non-terminal
 * "awaiting payment" state and, for each, queries the Razorpay gateway for the
 * real-time status of the linked payment. Any that have actually settled are
 * marked recovered in our registry, keeping the two systems in sync.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class WebhookReconciliationService {

    private final DunningEventRepository eventRepository;
    private final DunningRecoveryService dunningRecoveryService;
    private final SseStreamService sseStreamService;

    // States that still warrant an active reconciliation check against Razorpay.
    private static final List<String> AWAITING_SETTLEMENT_STATUSES = List.of(
            "SCHEDULED",
            "RETRYING",
            "RECOVERED_ACTION_TAKEN",
            "EXHAUSTED_ESCALATED"
    );

    /**
     * Scans unresolved dunning events and reconciles any that settled on Razorpay.
     *
     * @return summary of the reconciliation run
     */
    @Transactional
    public ReconciliationResult reconcileAwaitingSettlements() {
        List<String> checked = new ArrayList<>();
        List<String> settled = new ArrayList<>();
        List<String> stillPending = new ArrayList<>();

        List<DunningEvent> awaiting = eventRepository.findByStatusIn(AWAITING_SETTLEMENT_STATUSES);

        for (DunningEvent event : awaiting) {
            String paymentId = event.getPaymentId();
            checked.add(paymentId);

            String amountStr = event.getAmount() != null
                    ? String.valueOf(Math.round(event.getAmount() * 100))
                    : "0";
            boolean didSettle = dunningRecoveryService.isPaymentSettledOnGateway(paymentId, amountStr);

            if (didSettle) {
                event.setStatus("RECOVERED_CUSTOMER_PAID");
                event.setStrategyApplied("RECONCILIATION_WEBHOOK_SYNC");
                event.setReasoningTrace("Reconciled: Razorpay reports this payment settled (webhook may have been missed or delivery delayed).");
                event.setNextRetryAt(null);
                DunningEvent saved = eventRepository.save(event);
                sseStreamService.broadcast(saved);
                settled.add(paymentId);
                log.info("Reconciliation settled payment {} via gateway status.", paymentId);
            } else {
                stillPending.add(paymentId);
            }
        }

        log.info("Reconciliation complete: checked={}, settled={}, stillPending={}",
                checked.size(), settled.size(), stillPending.size());
        return new ReconciliationResult(Instant.now(), checked, settled, stillPending);
    }

    public record ReconciliationResult(
            Instant ranAt,
            List<String> checked,
            List<String> settled,
            List<String> stillPending
    ) {}
}
