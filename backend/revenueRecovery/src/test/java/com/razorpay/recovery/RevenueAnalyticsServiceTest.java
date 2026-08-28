package com.razorpay.recovery;

import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.service.RevenueAnalyticsService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.sql.Date;
import java.time.LocalDate;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RevenueAnalyticsServiceTest {

    @Mock
    private DunningEventRepository repository;

    private RevenueAnalyticsService service() {
        return new RevenueAnalyticsService(repository);
    }

    @Test
    void computesRatesAndStrategySplit() {
        when(repository.count()).thenReturn(10L);
        when(repository.sumAllAmount()).thenReturn(10000.0);
        when(repository.countByStatusIn(anyCollection())).thenReturn(6L);
        when(repository.sumAmountByStatuses(anyCollection())).thenReturn(6000.0);
        when(repository.aggregateByStrategyForStatuses(anyCollection())).thenReturn(List.of(
                new Object[]{"SMART_RETRY_AUTO_RECOVERED", 4L, 4000.0},
                new Object[]{"WEBHOOK_PAYMENT_CAPTURED_SETTLED", 2L, 2000.0}
        ));
        when(repository.cohortSeriesAll()).thenReturn(List.of());
        when(repository.cohortSeriesRecovered(anyCollection())).thenReturn(List.of());

        RevenueAnalyticsService.AnalyticsSummary s = service().compute();

        assertThat(s.totalEvents()).isEqualTo(10);
        assertThat(s.totalRecovered()).isEqualTo(6);
        assertThat(s.totalRecoveredValue()).isEqualTo(6000.0);
        assertThat(s.recoveryRatePercent()).isEqualTo(60.0);
        assertThat(s.valueRecoveryRatePercent()).isEqualTo(60.0);
        assertThat(s.strategyBreakdown()).hasSize(2);
        assertThat(s.strategyBreakdown().get(0).strategy()).isEqualTo("SMART_RETRY_AUTO_RECOVERED");
        assertThat(s.strategyBreakdown().get(0).recoveredValue()).isEqualTo(4000.0);
    }

    @Test
    void mergesAllAndRecoveredCohortsPerDay() {
        Date day1 = Date.valueOf(LocalDate.of(2026, 8, 22));
        Date day2 = Date.valueOf(LocalDate.of(2026, 8, 23));

        when(repository.count()).thenReturn(3L);
        when(repository.sumAllAmount()).thenReturn(3000.0);
        when(repository.countByStatusIn(anyCollection())).thenReturn(2L);
        when(repository.sumAmountByStatuses(anyCollection())).thenReturn(2000.0);
        when(repository.aggregateByStrategyForStatuses(anyCollection())).thenReturn(List.of());
        when(repository.cohortSeriesAll()).thenReturn(List.of(
                new Object[]{day1, 1L, 1000.0},
                new Object[]{day2, 2L, 2000.0}
        ));
        Object[] recoveredRow = new Object[]{day1, 1L, 1000.0};
        java.util.List<Object[]> recoveredRows = new java.util.ArrayList<>();
        recoveredRows.add(recoveredRow);
        when(repository.cohortSeriesRecovered(anyCollection())).thenReturn(recoveredRows);

        RevenueAnalyticsService.AnalyticsSummary s = service().compute();

        assertThat(s.churnCohorts()).hasSize(2);
        RevenueAnalyticsService.CohortPoint c1 = s.churnCohorts().get(0);
        assertThat(c1.cohortDay()).isEqualTo("2026-08-22");
        assertThat(c1.total()).isEqualTo(1);
        assertThat(c1.recovered()).isEqualTo(1);
        assertThat(c1.totalValue()).isEqualTo(1000.0);
        assertThat(c1.recoveredValue()).isEqualTo(1000.0);

        RevenueAnalyticsService.CohortPoint c2 = s.churnCohorts().get(1);
        assertThat(c2.cohortDay()).isEqualTo("2026-08-23");
        assertThat(c2.total()).isEqualTo(2);
        assertThat(c2.recovered()).isEqualTo(0); // no recovered row for day2
    }
}
