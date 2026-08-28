package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.RevenueAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Operator-facing financial recovery analytics. Read-only aggregate view over the
 * persisted dunning registry (Recovered MRR, strategy split, churn cohorts) to
 * evidence the engine's ROI.
 */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final RevenueAnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<RevenueAnalyticsService.AnalyticsSummary> getAnalytics() {
        return ResponseEntity.ok(analyticsService.compute());
    }
}
