package com.razorpay.recovery;

import com.razorpay.recovery.AppConstant.BankStatus;
import com.razorpay.recovery.repository.DunningEventRepository;
import com.razorpay.recovery.service.BankHealthRadarService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BankHealthRadarServiceTest {

    @Mock
    private DunningEventRepository repository;

    private BankHealthRadarService service() {
        return new BankHealthRadarService(repository);
    }

    @Test
    void noRecentEventsMeansOperational() {
        when(repository.countBankEventsSince(eq("HDFC"), any())).thenReturn(0L);
        when(repository.countBankFailuresSince(eq("HDFC"), any())).thenReturn(0L);

        BankHealthRadarService.BankHealthMetrics m = service().getBankHealth("HDFC");

        assertThat(m.getStatus()).isEqualTo(BankStatus.OPERATIONAL);
        assertThat(m.getFailureRatePercent()).isEqualTo(0.0);
    }

    @Test
    void highFailureRateTriggersOutage() {
        when(repository.countBankEventsSince(eq("SBI"), any())).thenReturn(8L);
        when(repository.countBankFailuresSince(eq("SBI"), any())).thenReturn(6L); // 75%

        BankHealthRadarService.BankHealthMetrics m = service().getBankHealth("SBI");

        assertThat(m.getStatus()).isEqualTo(BankStatus.OUTAGE);
        assertThat(m.getFailureRatePercent()).isEqualTo(75.0);
    }

    @Test
    void moderateFailureRateTriggersDegraded() {
        when(repository.countBankEventsSince(eq("ICICI"), any())).thenReturn(10L);
        when(repository.countBankFailuresSince(eq("ICICI"), any())).thenReturn(3L); // 30%

        BankHealthRadarService.BankHealthMetrics m = service().getBankHealth("ICICI");

        assertThat(m.getStatus()).isEqualTo(BankStatus.DEGRADED);
        assertThat(m.getFailureRatePercent()).isEqualTo(30.0);
    }

    @Test
    void injectedOverrideReflectsStatus() {
        BankHealthRadarService service = service();
        service.injectSimulatedDowntime("AXIS", 60.0);

        BankHealthRadarService.BankHealthMetrics m = service.getBankHealth("AXIS");

        assertThat(m.getStatus()).isEqualTo(BankStatus.OUTAGE);
        assertThat(m.getFailureRatePercent()).isEqualTo(60.0);
    }

    @Test
    void restoreClearsOverrideAndUsesDatabase() {
        BankHealthRadarService service = service();
        service.injectSimulatedDowntime("KOTAK", 70.0);
        when(repository.countBankEventsSince(eq("KOTAK"), any())).thenReturn(0L);
        when(repository.countBankFailuresSince(eq("KOTAK"), any())).thenReturn(0L);

        service.restoreBankHealth("KOTAK");
        BankHealthRadarService.BankHealthMetrics m = service.getBankHealth("KOTAK");

        assertThat(m.getStatus()).isEqualTo(BankStatus.OPERATIONAL);
    }

    @Test
    void normalizeMapsBankCodes() {
        assertThat(service().normalizeBankCode("HDFC BANK")).isEqualTo("HDFC");
        assertThat(service().normalizeBankCode("sbi")).isEqualTo("SBI");
        assertThat(service().normalizeBankCode("unknown")).isEqualTo("UPI");
        assertThat(service().normalizeBankCode(null)).isEqualTo("UPI");
    }
}
