package com.razorpay.recovery.service;

import com.razorpay.recovery.repository.DunningEventRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Financial / churn observability.
 *
 * Computes authoritative recovery metrics directly from the dunning registry so
 * operators can measure the monetary outcomes the engine produces: the exact INR
 * recovered via each strategy (autonomous smart-retry vs. customer discount /
 * payment-link vs. settled webhook), the overall recovery rate, and a churn
 * cohort series showing how at-risk value converts over time.
 *
 * Unlike the frontend's live panel (which only sees the most recent socket-held
 * events in the UI), this service reads the full persisted registry.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RevenueAnalyticsService {

    private final DunningEventRepository eventRepository;

    /** Statuses considered conclusively recovered (funds recouped / path to payment provided). */
    private static final List<String> RECOVERED = List.of(
            "RECOVERED_RETRY_SUCCESS",
            "RECOVERED_ACTION_TAKEN",
            "RECOVERED_CUSTOMER_PAID");

    /** Statuses still awaiting resolution (active churn exposure). */
    private static final List<String> AT_RISK = List.of(
            "SCHEDULED",
            "RETRYING",
            "EXHAUSTED_ESCALATED");

    public record StrategyBreakdown(String strategy, long count, double recoveredValue) {}

    public record CohortPoint(String cohortDay, long total, double totalValue, long recovered, double recoveredValue) {}

    public record AnalyticsSummary(
            long totalEvents,
            double totalValueAtRisk,
            long totalRecovered,
            double totalRecoveredValue,
            double recoveryRatePercent,
            double valueRecoveryRatePercent,
            List<StrategyBreakdown> strategyBreakdown,
            List<CohortPoint> churnCohorts) {}

    public AnalyticsSummary compute() {
        long totalEvents = eventRepository.count();
        double totalValue = eventRepository.sumAllAmount();

        long recoveredCount = eventRepository.countByStatusIn(RECOVERED);
        double recoveredValue = eventRepository.sumAmountByStatuses(RECOVERED);
        double atRiskValue = eventRepository.sumAmountByStatuses(AT_RISK);

        double countRate = totalEvents > 0 ? (recoveredCount * 100.0) / totalEvents : 0.0;
        double valueRate = totalValue > 0 ? (recoveredValue * 100.0) / totalValue : 0.0;

        List<Object[]> strategyRows = eventRepository.aggregateByStrategyForStatuses(RECOVERED);
        List<StrategyBreakdown> strategyBreakdown = new ArrayList<>();
        for (Object[] row : strategyRows) {
            String strategy = (String) row[0];
            long cnt = ((Number) row[1]).longValue();
            double amt = ((Number) row[2]).doubleValue();
            strategyBreakdown.add(new StrategyBreakdown(strategy == null ? "UNKNOWN" : strategy, cnt, amt));
        }

        Map<LocalDate, CohortAccumulator> cohortMap = new LinkedHashMap<>();
        for (Object[] row : eventRepository.cohortSeriesAll()) {
            LocalDate day = ((java.sql.Date) row[0]).toLocalDate();
            cohortMap.computeIfAbsent(day, k -> new CohortAccumulator()).total += ((Number) row[1]).longValue();
            cohortMap.computeIfAbsent(day, k -> new CohortAccumulator()).totalValue += ((Number) row[2]).doubleValue();
        }
        for (Object[] row : eventRepository.cohortSeriesRecovered(RECOVERED)) {
            LocalDate day = ((java.sql.Date) row[0]).toLocalDate();
            CohortAccumulator acc = cohortMap.computeIfAbsent(day, k -> new CohortAccumulator());
            acc.recovered += ((Number) row[1]).longValue();
            acc.recoveredValue += ((Number) row[2]).doubleValue();
        }

        List<CohortPoint> cohorts = new ArrayList<>();
        cohortMap.forEach((day, acc) -> cohorts.add(new CohortPoint(
                day.toString(), acc.total, acc.totalValue, acc.recovered, acc.recoveredValue)));

        return new AnalyticsSummary(
                totalEvents,
                atRiskValue,
                recoveredCount,
                recoveredValue,
                round1(countRate),
                round1(valueRate),
                strategyBreakdown,
                cohorts);
    }

    private static double round1(double v) {
        return Math.round(v * 10.0) / 10.0;
    }

    private static final class CohortAccumulator {
        long total;
        double totalValue;
        long recovered;
        double recoveredValue;
    }
}
