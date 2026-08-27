package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.WebhookReconciliationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Administrative endpoint to trigger reconciliation of settlements that were
 * completed on the Razorpay gateway but may not have reached this service via
 * webhook (e.g. customer closed the browser tab before the frontend redirect).
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class AdminReconciliationController {

    private final WebhookReconciliationService reconciliationService;

    @GetMapping("/reconcile")
    public ResponseEntity<WebhookReconciliationService.ReconciliationResult> reconcile() {
        log.info("Manual reconciliation requested.");
        return ResponseEntity.ok(reconciliationService.reconcileAwaitingSettlements());
    }
}
