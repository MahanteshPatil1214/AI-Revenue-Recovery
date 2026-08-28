package com.razorpay.recovery;

import com.razorpay.recovery.AppConstant.BankStatus;
import com.razorpay.recovery.service.BankHealthRadarService;
import com.razorpay.recovery.service.SmartTimingEngine;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Duration;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZonedDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SmartTimingEngineTest {

    @Mock
    private BankHealthRadarService radarService;

    private final ZoneId ist = ZoneId.of("Asia/Kolkata");

    private SmartTimingEngine engine() {
        return new SmartTimingEngine(radarService);
    }

    private BankHealthRadarService.BankHealthMetrics metrics(BankStatus status) {
        return BankHealthRadarService.BankHealthMetrics.builder()
                .bankCode("SBI")
                .status(status)
                .failureRatePercent(42.0)
                .sampleCount(10)
                .build();
    }

    @Test
    void outageRoutesToCircuitBreakerHold() {
        when(radarService.getBankHealth(anyString())).thenReturn(metrics(BankStatus.OUTAGE));
        SmartTimingEngine engine = engine();

        SmartTimingEngine.SchedulingDecision d = engine.computeOptimalRetryWindow("GATEWAY_TIMEOUT_ERROR", "SBI", 0);

        assertThat(d.strategyLabel()).isEqualTo("RADAR_OUTAGE_CIRCUIT_BREAKER");
        // ~15 minute hold
        assertThat(Duration.between(Instant.now(), d.scheduledTime()).toMinutes()).isBetween(14L, 16L);
    }

    @Test
    void insufficientFundsRoutesToLiquidityWindow() {
        when(radarService.getBankHealth(anyString())).thenReturn(metrics(BankStatus.OPERATIONAL));
        SmartTimingEngine engine = engine();

        SmartTimingEngine.SchedulingDecision d =
                engine.computeOptimalRetryWindow("BAD_REQUEST_INSUFFICIENT_FUNDS", "UPI", 1);

        assertThat(d.strategyLabel()).isEqualTo("AI_LIQUIDITY_WINDOW_OPTIMIZATION");
        ZonedDateTime scheduled = d.scheduledTime().atZone(ist);
        // Peaks salary window 08:30 IST
        assertThat(scheduled.getHour()).isEqualTo(8);
        assertThat(scheduled.getMinute()).isEqualTo(30);
        assertThat(d.scheduledTime()).isAfter(Instant.now());
    }

    @Test
    void degradedRailsUseAdaptiveJitter() {
        when(radarService.getBankHealth(anyString())).thenReturn(metrics(BankStatus.DEGRADED));
        SmartTimingEngine engine = engine();

        SmartTimingEngine.SchedulingDecision d = engine.computeOptimalRetryWindow("SERVER_ERROR", "HDFC", 0);

        assertThat(d.strategyLabel()).isEqualTo("AI_DEGRADED_RAIL_ADAPTIVE_JITTER");
        assertThat(d.scheduledTime()).isAfter(Instant.now());
        assertThat(Duration.between(Instant.now(), d.scheduledTime()).toSeconds()).isBetween(0L, 180L);
    }

    @Test
    void operationalRailUsesExponentialBackoff() {
        when(radarService.getBankHealth(anyString())).thenReturn(metrics(BankStatus.OPERATIONAL));
        SmartTimingEngine engine = engine();

        SmartTimingEngine.SchedulingDecision d = engine.computeOptimalRetryWindow("GATEWAY_TIMEOUT", "ICICI", 0);

        assertThat(d.strategyLabel()).isEqualTo("DYNAMIC_EXPONENTIAL_BACKOFF");
        assertThat(d.scheduledTime()).isAfter(Instant.now());
    }

    @Test
    void normalizeBankMapsKnownAndUnknown() {
        SmartTimingEngine engine = engine();

        assertThat(engine.normalizeBank("HDFC Bank")).isEqualTo("HDFC");
        assertThat(engine.normalizeBank("SBI")).isEqualTo("SBI");
        assertThat(engine.normalizeBank("AXIS")).isEqualTo("AXIS");
        assertThat(engine.normalizeBank("some obscure issuer")).isEqualTo("UPI");
        assertThat(engine.normalizeBank(null)).isEqualTo("UPI");
        assertThat(engine.normalizeBank("   ")).isEqualTo("UPI");
    }
}
