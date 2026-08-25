package com.razorpay.recovery.service;

import com.razorpay.recovery.AppConstant.BankStatus;
import com.razorpay.recovery.repository.DunningEventRepository;
import lombok.Builder;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class BankHealthRadarService {


    @Getter
    @Builder
    public static class BankHealthMetrics {
        private String bankCode;
        private BankStatus status;
        private double failureRatePercent;
        private long sampleCount;
        private Instant lastUpdated;
    }

    private final DunningEventRepository dunningEventRepository;
    private final Map<String, BankStatus> simulatedOverrides = new ConcurrentHashMap<>();

    private static final String[] TRACKED_BANKS = {"HDFC", "SBI", "ICICI", "AXIS", "KOTAK", "UPI"};

    public BankHealthMetrics getBankHealth(String bankCode) {
        String normalized = normalizeBankCode(bankCode);

        // Check if demo outage override is active
        if (simulatedOverrides.containsKey(normalized)) {
            BankStatus overrideStatus = simulatedOverrides.get(normalized);
            double rate = customFailRates.getOrDefault(normalized, 75.0);
            return BankHealthMetrics.builder()
                    .bankCode(normalized)
                    .status(overrideStatus)
                    .failureRatePercent(rate)
                    .sampleCount(25)
                    .lastUpdated(Instant.now())
                    .build();
        }

        Instant fifteenMinutesAgo = Instant.now().minus(Duration.ofMinutes(15));
        long total = dunningEventRepository.countBankEventsSince(normalized, fifteenMinutesAgo);
        long failures = dunningEventRepository.countBankFailuresSince(normalized, fifteenMinutesAgo);

        double failRate = 0.0;
        BankStatus status = BankStatus.OPERATIONAL;

        if (total > 0) {
            failRate = ((double) failures / total) * 100.0;
            if (failRate >= 50.0 && total >= 3) {
                status = BankStatus.OUTAGE;
            } else if (failRate >= 20.0 && total >= 3) {
                status = BankStatus.DEGRADED;
            }
        }

        return BankHealthMetrics.builder()
                .bankCode(normalized)
                .status(status)
                .failureRatePercent(Math.round(failRate * 10.0) / 10.0)
                .sampleCount(total)
                .lastUpdated(Instant.now())
                .build();
    }

    public Map<String, BankHealthMetrics> getAllBankStatuses() {
        Map<String, BankHealthMetrics> report = new HashMap<>();
        for (String bank : TRACKED_BANKS) {
            report.put(bank, getBankHealth(bank));
        }
        return report;
    }

    // Stores dynamic failure percentages per bank
    private final Map<String, Double> customFailRates = new ConcurrentHashMap<>();

    public void injectSimulatedDowntime(String bankCode, double failureRate) {
        String normalized = normalizeBankCode(bankCode);
        customFailRates.put(normalized, failureRate);

        BankStatus status = BankStatus.OPERATIONAL;
        if (failureRate >= 50.0) {
            status = BankStatus.OUTAGE;
        } else if (failureRate >= 20.0) {
            status = BankStatus.DEGRADED;
        }
        simulatedOverrides.put(normalized, status);
        log.warn("🚨 Simulating dynamic failure rate ({}%) for bank rail: {}", failureRate, normalized);
    }

    public void restoreBankHealth(String bankCode) {
        String normalized = normalizeBankCode(bankCode);
        simulatedOverrides.remove(normalized);
        customFailRates.remove(normalized);
        log.info("Bank rail {} telemetry restored to live database state.", normalized);
    }

    public String normalizeBankCode(String bankCode) {
        if (bankCode == null) return "UPI";
        String upper = bankCode.toUpperCase();
        for (String bank : TRACKED_BANKS) {
            if (upper.contains(bank)) return bank;
        }
        return "UPI";
    }
}