package com.razorpay.recovery.controller;

import com.razorpay.recovery.service.RevenueAnalyticsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;

/**
 * Operator-facing financial recovery analytics. Read-only aggregate view over the
 * persisted dunning registry (Recovered MRR, strategy split, churn cohorts) to
 * evidence the engine's ROI. Management path, gated by AdminAuthInterceptor.
 */
@RestController
@RequestMapping("/api/v1/admin/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private static final DateTimeFormatter FILE_STAMP = DateTimeFormatter.ofPattern("yyyy-MM-dd");

    private final RevenueAnalyticsService analyticsService;

    @GetMapping
    public ResponseEntity<RevenueAnalyticsService.AnalyticsSummary> getAnalytics() {
        return ResponseEntity.ok(analyticsService.compute());
    }

    /**
     * Server-side CSV export of the summary + per-strategy split + churn cohorts,
     * for operators / BI ingestion. Degradation of scale is handled here on the
     * server so the file reflects the authoritative registry.
     */
    @GetMapping(value = "/export", produces = MediaType.TEXT_PLAIN_VALUE)
    public ResponseEntity<String> exportCsv(@RequestParam(defaultValue = "csv") String format) {
        if (!"csv".equalsIgnoreCase(format)) {
            throw new IllegalArgumentException("Unsupported export format: " + format);
        }
        RevenueAnalyticsService.AnalyticsSummary s = analyticsService.compute();

        StringBuilder sb = new StringBuilder();
        sb.append("metric,value\n");
        sb.append("total_events,").append(s.totalEvents()).append('\n');
        sb.append("value_at_risk_inr,").append(s.totalValueAtRisk()).append('\n');
        sb.append("recovered_events,").append(s.totalRecovered()).append('\n');
        sb.append("recovered_value_inr,").append(s.totalRecoveredValue()).append('\n');
        sb.append("recovery_rate_pct,").append(s.recoveryRatePercent()).append('\n');
        sb.append("value_recovery_rate_pct,").append(s.valueRecoveryRatePercent()).append('\n');
        sb.append('\n');

        sb.append("strategy,recovered_events,recovered_value_inr\n");
        for (RevenueAnalyticsService.StrategyBreakdown b : s.strategyBreakdown()) {
            sb.append(escape(b.strategy())).append(',').append(b.count()).append(',').append(b.recoveredValue()).append('\n');
        }
        sb.append('\n');

        sb.append("cohort_day,total_events,total_value_inr,recovered_events,recovered_value_inr\n");
        for (RevenueAnalyticsService.CohortPoint c : s.churnCohorts()) {
            sb.append(c.cohortDay()).append(',').append(c.total()).append(',').append(c.totalValue())
                    .append(',').append(c.recovered()).append(',').append(c.recoveredValue()).append('\n');
        }

        String filename = "recovery_report_" + LocalDate.now().format(FILE_STAMP) + ".csv";
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .body(sb.toString());
    }

    private static String escape(String value) {
        if (value == null) {
            return "";
        }
        if (value.indexOf(',') >= 0 || value.indexOf('"') >= 0 || value.indexOf('\n') >= 0) {
            return '"' + value.replace("\"", "\"\"") + '"';
        }
        return value;
    }
}
