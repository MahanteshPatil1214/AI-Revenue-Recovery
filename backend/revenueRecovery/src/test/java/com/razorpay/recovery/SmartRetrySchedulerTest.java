package com.razorpay.recovery;

import com.razorpay.recovery.AppConstant.BankStatus;
import com.razorpay.recovery.model.DunningEvent;
import com.razorpay.recovery.model.FailureCategory;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.service.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class SmartRetrySchedulerTest {

    @Mock
    private DunningEventRepository eventRepository;
    @Mock
    private SseStreamService sseStreamService;
    @Mock
    private NotificationService notificationService;
    @Mock
    private SmartTimingEngine timingEngine;
    @Mock
    private BankHealthRadarService radarService;
    @Mock
    private DunningRecoveryService recoveryService;

    private SmartRetryScheduler scheduler;

    @BeforeEach
    void setUp() {
        scheduler = new SmartRetryScheduler(
                eventRepository, sseStreamService, notificationService,
                timingEngine, radarService, recoveryService);
        ReflectionTestUtils.setField(scheduler, "successRateOperational", 0.0);
        ReflectionTestUtils.setField(scheduler, "successRateDegraded", 0.0);
        // resolveBankCode calls timingEngine.normalizeBank; mirror the real mapper
        // (identity for already-normalized codes like "SBI").
        when(timingEngine.normalizeBank(anyString())).thenAnswer(inv -> inv.getArgument(0));
    }

    private DunningEvent queuedEvent(int retryCount, int maxRetries) {
        return DunningEvent.builder()
                .paymentId("pay_123")
                .amount(1000.0)
                .customerEmail("c@example.com")
                .customerContact("+919000000000")
                .errorCode("GATEWAY_TIMEOUT_ERROR_SBI")
                .bankCode("SBI")
                .category(FailureCategory.TRANSIENT_SOFT_FAIL)
                .status("SCHEDULED")
                .retryCount(retryCount)
                .maxRetries(maxRetries)
                .nextRetryAt(Instant.now().minusSeconds(5))
                .createdAt(Instant.now())
                .build();
    }

    private BankHealthRadarService.BankHealthMetrics health(BankStatus status) {
        return BankHealthRadarService.BankHealthMetrics.builder()
                .bankCode("SBI").status(status).failureRatePercent(10.0).sampleCount(5).build();
    }

    @Test
    void settledPaymentCancelsRetryWithoutBurningAttempt() {
        DunningEvent event = queuedEvent(0, 3);
        when(eventRepository.findDueScheduledByStatus(anyString(), any())).thenReturn(List.of(event));
        when(recoveryService.isPaymentSettledOnGateway(eq("pay_123"), anyString())).thenReturn(true);

        scheduler.executePendingRetries();

        assertThat(event.getStatus()).isEqualTo("RECOVERED_CUSTOMER_PAID");
        assertThat(event.getRetryCount()).isZero();
        verify(recoveryService, never()).attemptRechargeAttempt(any());
        verify(eventRepository).save(event);
    }

    @Test
    void outageHoldReschedulesWithoutConsumingAttempt() {
        DunningEvent event = queuedEvent(0, 3);
        when(eventRepository.findDueScheduledByStatus(anyString(), any())).thenReturn(List.of(event));
        when(recoveryService.isPaymentSettledOnGateway(eq("pay_123"), anyString())).thenReturn(false);
        when(radarService.getBankHealth(eq("SBI"))).thenReturn(health(BankStatus.OUTAGE));
        when(timingEngine.computeOptimalRetryWindow(any(), anyString(), anyInt()))
                .thenReturn(new SmartTimingEngine.SchedulingDecision(Instant.now().plusSeconds(900),
                        "RADAR_OUTAGE_CIRCUIT_BREAKER", "held"));

        scheduler.executePendingRetries();

        assertThat(event.getStatus()).isEqualTo("SCHEDULED");
        assertThat(event.getRetryCount()).isZero(); // no attempt consumed
        assertThat(event.getNextRetryAt()).isAfter(Instant.now());
        verify(recoveryService, never()).attemptRechargeAttempt(any());
        verify(eventRepository).save(event);
    }

    @Test
    void successfulGatewayChargeRecoversAndIncrementsAttempt() {
        DunningEvent event = queuedEvent(0, 3);
        when(eventRepository.findDueScheduledByStatus(anyString(), any())).thenReturn(List.of(event));
        when(recoveryService.isPaymentSettledOnGateway(eq("pay_123"), anyString())).thenReturn(false);
        when(radarService.getBankHealth(eq("SBI"))).thenReturn(health(BankStatus.OPERATIONAL));
        when(recoveryService.attemptRechargeAttempt(event))
                .thenReturn(new DunningRecoveryService.RetryAttemptResult(true, "gateway accepted"));

        scheduler.executePendingRetries();

        assertThat(event.getStatus()).isEqualTo("RECOVERED_RETRY_SUCCESS");
        assertThat(event.getRetryCount()).isEqualTo(1);
        assertThat(event.getNextRetryAt()).isNull();
        verify(eventRepository).save(event);
    }

    @Test
    void exhaustingRetriesEscalatesToActionTakenAndNotifies() {
        DunningEvent event = queuedEvent(2, 3); // attempt will be 3 == max
        when(eventRepository.findDueScheduledByStatus(anyString(), any())).thenReturn(List.of(event));
        when(recoveryService.isPaymentSettledOnGateway(eq("pay_123"), anyString())).thenReturn(false);
        when(radarService.getBankHealth(eq("SBI"))).thenReturn(health(BankStatus.OPERATIONAL));
        // gateway offline + simulated rate 0.0 -> always fail
        when(recoveryService.attemptRechargeAttempt(event))
                .thenReturn(new DunningRecoveryService.RetryAttemptResult(false, "live gateway unavailable"));

        scheduler.executePendingRetries();

        assertThat(event.getStatus()).isEqualTo("RECOVERED_ACTION_TAKEN");
        assertThat(event.getCategory()).isEqualTo(FailureCategory.PERMANENT_HARD_FAIL);
        assertThat(event.getRetryCount()).isEqualTo(3);
        assertThat(event.getRecoveryUrl()).isNotBlank();
        verify(notificationService).sendEmailRecovery(anyString(), eq("c@example.com"), any(BigDecimal.class),
                anyString(), anyString(), anyString());
        verify(eventRepository).save(event);
    }

    @Test
    void legacyRowWithNullCountersIsNormalised() {
        DunningEvent event = queuedEvent(0, 0);
        event.setRetryCount(null);
        event.setMaxRetries(null);
        when(eventRepository.findDueScheduledByStatus(anyString(), any())).thenReturn(List.of(event));
        when(recoveryService.isPaymentSettledOnGateway(eq("pay_123"), anyString())).thenReturn(false);
        when(radarService.getBankHealth(eq("SBI"))).thenReturn(health(BankStatus.OPERATIONAL));
        when(recoveryService.attemptRechargeAttempt(event))
                .thenReturn(new DunningRecoveryService.RetryAttemptResult(false, "live gateway unavailable"));

        scheduler.executePendingRetries();

        assertThat(event.getRetryCount()).isEqualTo(1);
        assertThat(event.getMaxRetries()).isEqualTo(3);
    }
}
